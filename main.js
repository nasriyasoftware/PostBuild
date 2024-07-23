import path from 'path';
import fs from 'fs';
import utils from './utils/utils.js';
import constants from './constants.js';

class Main {
    #_verbose = false;
    #_configFile = {}
    #_config = {}

    #_helpers = {
        print: (str, force) => {
            if (this.#_verbose || force === true) {
                console.info(str);
            }
        },
        /**Reads configurations from the file */
        read: () => {
            this.#_verbose = this.#_configFile?.verbose === true;

            if (utils.is.undefined(this.#_configFile) || !utils.is.realObject(this.#_configFile)) { throw new Error(`The ${constants.PACKAGE_NAME}'s "${constants.CONFIG_FILE_NAME}" is either missing or invalid`) }
            this.#_helpers.print('Reading config file...');

            try {
                if ('esmDir' in this.#_configFile) {
                    if (this.#_configFile.esmDir === 'auto') {
                        this.#_config.esmDir = path.join(constants.ROOT, constants.ESM_REL_PATH);
                    } else {
                        const fullPath = path.resolve(this.#_configFile.esmDir)
                        if (fs.existsSync(fullPath)) {
                            this.#_config.esmDir = fullPath;
                        } else {
                            throw new Error(`The provided "esmDir":"${fullPath}" does not exist`);
                        }
                    }
                }

                if ('cjsDir' in this.#_configFile) {
                    if (this.#_configFile.cjsDir === 'auto') {
                        this.#_config.cjsDir = path.join(constants.ROOT, constants.CJS_REL_PATH)
                    } else {
                        const fullPath = path.resolve(this.#_configFile.cjsDir)
                        if (fs.existsSync(fullPath)) {
                            this.#_config.cjsDir = fullPath;
                        } else {
                            throw new Error(`The provided "cjsDir":"${fullPath}" does not exist`);
                        }
                    }
                }

                if ('copyFiles' in this.#_configFile) {
                    if (utils.is.undefined(this.#_configFile.copyFiles) || !utils.is.realObject(this.#_configFile.copyFiles)) { throw new Error(`The provided "copyFiles" must be a real object`) }

                    this.#_config.copyFiles = { exclude: [], from: '' };
                    if ('exclude' in this.#_configFile.copyFiles) {
                        if (Array.isArray(this.#_configFile.copyFiles.exclude)) {
                            for (const inc of this.#_configFile.copyFiles.exclude) {
                                if (utils.is.validString(inc)) {
                                    if (!inc.startsWith('.')) { throw new Error(`The "copyFiles.exclude" should include files extensions in this format: ".ts". ${inc} is not a valid extension format.`) }
                                    continue;
                                } else {
                                    throw new Error(`The "copyFiles.exclude" contains an invalid directory (${inc}). Expecting a string but instead got ${typeof inc}`)
                                }
                            }

                            this.#_config.copyFiles.exclude = ['.ts'].concat(this.#_configFile.copyFiles.exclude);
                        } else {
                            throw new Error(`The "copyFiles.exclude" is expecting an array of strings, instead got ${typeof this.#_configFile.copyFiles.exclude}`)
                        }
                    } else {
                        this.#_configFile.copyFiles.exclude = ['.ts'];
                    }

                    if ('from' in this.#_configFile.copyFiles) {
                        if (!utils.is.validString(this.#_configFile.copyFiles.from)) { throw new Error(`The "copyFiles.from" expecting a string but instead got ${typeof this.#_configFile.copyFiles.from}`) }
                        if (!fs.existsSync(path.resolve(this.#_configFile.copyFiles.from))) { throw new Error(`The "copyFiles.from" directory (${this.#_configFile.copyFiles.from}) does not exist`) }
                        this.#_config.copyFiles.from = path.resolve(this.#_configFile.copyFiles.from);
                    } else {
                        this.#_config.copyFiles.from = path.resolve('./src');
                    }

                }

                if ('addExtensions' in this.#_configFile) {
                    if (typeof this.#_configFile.addExtensions !== 'boolean') { throw new Error(`The "addExtensions" option is expecting a boolean value, instead got ${typeof this.#_configFile.addExtensions}`) }
                    this.#_config.addExtensions = this.#_configFile.addExtensions;
                } else {
                    this.#_config.addExtensions = false;
                }

                if ('aliases' in this.#_configFile) {
                    const aliases = this.#_configFile.aliases;
                    if (!utils.is.realObject(aliases)) { throw new Error(`The "aliases" option is expecting a real object, isntead got ${typeof aliases}`) }

                    this.#_config.aliases = {}
                    for (const prop in aliases) {
                        if (typeof aliases[prop] === 'string') {
                            this.#_config.aliases[prop] = aliases[prop];
                        } else {
                            throw new TypeError(`One of the defined aliases (${aliases[prop]}) is not a string`)
                        }
                    }
                }
            } catch (error) {
                if (error instanceof Error) {
                    error.message = `Unable to read postbuild configFile: ${error.message}`;
                }

                throw error;
            }
        },
        copy: {
            exclude: ['.ts'],
            folderContent: (from, to, exclude) => {
                if (!fs.existsSync(to)) { fs.mkdirSync(to, { recursive: true }) }
                if (path.basename(from).toLowerCase().includes('logs')) { return }

                const files = fs.readdirSync(from, { withFileTypes: true });
                for (const file of files) {
                    if (file.isFile()) {
                        const filePath = path.join(file.path, file.name);
                        if (path.extname(filePath) === '.ts') { continue }
                        fs.copyFileSync(filePath, path.join(to, file.name));
                        this.#_helpers.print(`Copied: ${filePath}`);
                    } else {
                        this.#_helpers.copy.folderContent(path.join(from, file.name), path.join(to, file.name), exclude)
                    }
                }
            },
            directory: (src, dest, exclude) => {
                this.#_helpers.copy.folderContent(src, dest, exclude);
            },
            run: () => {
                if (this.#_config.copyFiles) {
                    const from = this.#_config.copyFiles.from;
                    const exclude = this.#_config.copyFiles.exclude;

                    if (from) {
                        if (this.#_config.esmDir) {
                            this.#_helpers.print('Copying files to ESM...');
                            this.#_helpers.copy.directory(from, path.join(constants.ROOT, constants.ESM_REL_PATH), exclude);
                            this.#_helpers.addJsonImportAssertions(this.#_config.esmDir);
                            this.#_helpers.convertDirToImport(this.#_config.esmDir);
                        }

                        if (this.#_config.cjsDir) {
                            this.#_helpers.print('Copying files to CJS...');
                            this.#_helpers.copy.directory(from, path.join(constants.ROOT, constants.CJS_REL_PATH), exclude);
                        }
                    }
                }
            }
        },
        extensions: {
            add: (dir) => {
                fs.readdirSync(dir).forEach(file => {
                    const fullPath = path.join(dir, file);
                    if (fs.lstatSync(fullPath).isDirectory()) {
                        this.#_helpers.extensions.add(fullPath);
                    } else if (file.endsWith('.js')) {
                        let content = fs.readFileSync(fullPath, 'utf8');

                        // Regex to match import statements
                        content = content.replace(/(import\s+.*\s+from\s+['"])(.*)(['"];)/g, (match, p1, p2, p3) => {
                            if (!p2.endsWith('.js') && !p2.startsWith('.') && !p2.startsWith('/')) {
                                return match;  // Skip non-relative imports
                            }
                            const lastPart = p2.split('/').pop();
                            if (lastPart.includes('.') && lastPart.split('.').length > 1) {
                                return match; // Skip if last part already has an extension
                            }
                            return `${p1}${p2}.js${p3}`;
                        });

                        // Regex to match export statements
                        content = content.replace(/(export\s+\{\s*.*\s*}\s+from\s+['"])(.*)(['"];)/g, (match, p1, p2, p3) => {
                            if (!p2.endsWith('.js') && !p2.startsWith('.') && !p2.startsWith('/')) {
                                return match;  // Skip non-relative exports
                            }
                            const lastPart = p2.split('/').pop();
                            if (lastPart.includes('.') && lastPart.split('.').length > 1) {
                                return match; // Skip if last part already has an extension
                            }
                            return `${p1}${p2}.js${p3}`;
                        });

                        fs.writeFileSync(fullPath, content, 'utf8');
                    }
                });
            },
            run: () => {
                if (this.#_config.addExtensions === true) {
                    if (this.#_config.esmDir) {
                        this.#_helpers.print('Adding extensions to ESM...');
                        this.#_helpers.extensions.add(this.#_config.esmDir);
                    }

                    if (this.#_config.cjsDir) {
                        this.#_helpers.print('Adding extensions to CJS...');
                        this.#_helpers.extensions.add(this.#_config.cjsDir);
                    }
                }
            }
        },
        create: {
            pkgESM: () => {
                this.#_helpers.print('Creating package.json for "ESM"...');
                const content = JSON.stringify({
                    "type": "module"
                }, null, 4);

                this.#_helpers.create.write(this.#_config.esmDir, content);
            },
            pkgCJS: () => {
                this.#_helpers.print('Creating package.json for "CJS"...');
                const content = JSON.stringify({
                    "type": "commonjs"
                }, null, 4);

                this.#_helpers.create.write(this.#_config.cjsDir, content);
            },
            write: (dir, content) => {
                fs.writeFileSync(path.join(dir, 'package.json'), content, { encoding: 'utf-8' });
            },
            packages: () => {
                if (this.#_config.esmDir) {
                    this.#_helpers.create.pkgESM();
                }

                if (this.#_config.cjsDir) {
                    this.#_helpers.create.pkgCJS();
                }
            }
        },
        config: {
            check: () => {
                const configPath = path.resolve(constants.CONFIG_FILE_NAME);
                if (!fs.existsSync(configPath)) { throw new Error(`The ${constants.PACKAGE_NAME}'s config file is missing.`) }
                const str_configs = fs.readFileSync(configPath, { encoding: 'utf-8' });
                try {
                    this.#_configFile = JSON.parse(str_configs);
                } catch (error) {
                    throw new Error(`The ${constants.PACKAGE_NAME}'s config file is not a valid JSON file.`)
                }
            }
        },
        addJsonImportAssertions: (dir) => {
            this.#_helpers.print('Add JSON import assertion');
            fs.readdirSync(dir).forEach(file => {
                const fullPath = path.join(dir, file);
                if (fs.lstatSync(fullPath).isDirectory()) {
                    this.#_helpers.addJsonImportAssertions(fullPath);
                } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
                    let content = fs.readFileSync(fullPath, 'utf8');
                    content = content.replace(/import\s+(.*?)\s+from\s+(['"])(.*?)\.json\2\s*;/g, (match, imports, quote, modulePath) => {
                        if (!imports.includes('assert')) {
                            return `import ${imports} from ${quote}${modulePath}.json${quote} assert { type: "json" };`;
                        }
                        return match;
                    });
                    fs.writeFileSync(fullPath, content, 'utf8');
                }
            });
        },
        /**This method converts `_dirname = __dirname` to `_dirname = import.meta.dirname` */
        convertDirToImport: (dir) => {
            fs.readdirSync(dir).forEach(file => {
                const fullPath = path.join(dir, file);
                if (fs.lstatSync(fullPath).isDirectory()) {
                    this.#_helpers.convertDirToImport(fullPath);
                } else if (file.endsWith('.js')) {
                    let content = fs.readFileSync(fullPath, 'utf8');

                    // Replace __dirname with import.meta.dirname
                    content = content.replace(/__dirname/g, 'import.meta.dirname');

                    fs.writeFileSync(fullPath, content, 'utf8');
                }
            });
        },
        aliases: {
            regex: {
                /**
                 * Create a regular expression for catching imports
                 * @param {string} pattern 
                 * @returns {RegExp}
                 */
                createCatch: (pattern) => {
                    const escapedPattern = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*');
                    return new RegExp(`^${escapedPattern}$`)
                },
                /**
                 * Create a regular expression for catching imports
                 * @param {string} pattern 
                 * @returns {RegExp}
                 */
                createExact: (pattern) => {
                    const escapedPattern = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
                    return new RegExp(`^${escapedPattern}`)
                }
            },
            getPatterns: () => {
                const aliases = this.#_config.aliases;
                return Object.keys(aliases).map(alias => {
                    const catchPattern = this.#_helpers.aliases.regex.createCatch(alias);
                    const exactPattern = this.#_helpers.aliases.regex.createExact(alias);

                    return {
                        alias,
                        catchPattern,
                        exactPattern,
                        resolvedPath: aliases[alias]
                    };
                });
            },
            matchImportPath: (importPath, aliasPatterns) => {
                for (const { catchPattern, exactPattern, resolvedPath } of aliasPatterns) {
                    // Check if the import path starts with the alias pattern
                    const match = importPath.match(catchPattern);
                    if (match) {
                        const newMatch = match[0].replace(exactPattern, resolvedPath)
                        const newImportPath = importPath.replace(match[0], newMatch);

                        // Construct the new path by combining the resolved path with the remaining path
                        return importPath.replace(match, newImportPath)
                    }
                }

                return importPath; // No match found
            },
            replaceImports: (filePath, aliasPatterns) => {
                let fileContent = fs.readFileSync(filePath, 'utf8');

                // Replace import paths based on alias patterns
                fileContent = fileContent.replace(/from ['"]([^'"]+)['"]/g, (match, importPath) => {
                    // Match the import path against alias patterns
                    const resolvedPath = this.#_helpers.aliases.matchImportPath(importPath, aliasPatterns);

                    // Only replace if the alias was matched, else return the original import path
                    if (resolvedPath !== importPath) {
                        // Preserve the specific path segments after the alias
                        const remainingPath = importPath.replace(/^.*\/[^\/]+/, ''); // Strip alias part
                        return `from '${resolvedPath}${remainingPath}${remainingPath.endsWith('.js') ? '' : '.js'}'`;
                    }

                    return match; // No change if alias was not matched
                });

                fs.writeFileSync(filePath, fileContent, 'utf8');
            },
            processFiles: (directory, aliasPatterns) => {
                fs.readdirSync(directory).forEach(file => {
                    const fullPath = path.join(directory, file);

                    if (fs.lstatSync(fullPath).isDirectory()) {
                        this.#_helpers.aliases.processFiles(fullPath, aliasPatterns);
                    } else if (file.endsWith('.js')) {
                        this.#_helpers.aliases.replaceImports(fullPath, aliasPatterns);
                    }
                });
            },
            check: () => {
                if (!utils.is.realObject(this.#_helpers.aliases)) { return }
                const aliasPatterns = this.#_helpers.aliases.getPatterns();
                if (this.#_config.esmDir) {
                    this.#_helpers.aliases.processFiles(this.#_config.esmDir, aliasPatterns);
                }

                if (this.#_config.cjsDir) {
                    this.#_helpers.aliases.processFiles(this.#_config.cjsDir, aliasPatterns);
                }
            }
        }
    }

    run() {
        const st = Date.now();

        this.#_helpers.config.check();
        this.#_helpers.read();
        this.#_helpers.create.packages();
        this.#_helpers.copy.run();
        this.#_helpers.extensions.run();
        this.#_helpers.aliases.check();

        const et = Date.now();
        const duration = et - st;
        this.#_helpers.print(`PostBuild finished in ${duration} milliseconds`);
    }
}

export default new Main();