import path from 'path';
import fs from 'fs';
import utils from './utils/utils.js';
import constants from './constants.js';

const configPath = path.join(process.cwd(), constants.CONFIG_FILE_NAME);
const configs = await import(configPath);

class Main {
    #_verbose = false;
    #_config = {}

    #_helpers = {
        print: (str, force) => {
            if (this.#_verbose || force === true) {
                console.info(str);
            }
        },
        /**Reads configurations from the file */
        read: () => {
            this.#_verbose = configs?.verbose === true;

            if (utils.is.undefined(configs) || !utils.is.realObject(configs)) { throw new Error(`The ${constants.PACKAGE_NAME}'s "${constants.CONFIG_FILE_NAME}" is either missing or invalid`) }
            this.#_helpers.print('Reading config file...');

            try {
                if ('esmDir' in configs) {
                    if (configs.esmDir === 'auto') {
                        this.#_config.esmDir = path.join(constants.ROOT, constants.ESM_REL_PATH);
                    } else {
                        const fullPath = path.resolve(configs.esmDir)
                        if (fs.existsSync(fullPath)) {
                            this.#_config.esmDir = fullPath;
                        } else {
                            throw new Error(`The provided "esmDir":"${fullPath}" does not exist`);
                        }
                    }
                }

                if ('cjsDir' in configs) {
                    if (configs.cjsDir === 'auto') {
                        this.#_config.cjsDir = path.join(constants.ROOT, constants.CJS_REL_PATH)
                    } else {
                        const fullPath = path.resolve(configs.cjsDir)
                        if (fs.existsSync(fullPath)) {
                            this.#_config.cjsDir = fullPath;
                        } else {
                            throw new Error(`The provided "cjsDir":"${fullPath}" does not exist`);
                        }
                    }
                }

                if ('copyFiles' in configs) {
                    if (utils.is.undefined(configs.copyFiles) || !utils.is.realObject(configs.copyFiles)) { throw new Error(`The provided "copyFiles" must be a real object`) }

                    this.#_config.copyFiles = { exclude: [], from: '' };
                    if ('exclude' in configs.copyFiles) {
                        if (Array.isArray(configs.copyFiles.exclude)) {
                            for (const inc of configs.copyFiles.exclude) {
                                if (utils.is.validString(inc)) {
                                    if (!inc.startsWith('.')) { throw new Error(`The "copyFiles.exclude" should include files extensions in this format: ".ts". ${inc} is not a valid extension format.`) }
                                    continue;
                                } else {
                                    throw new Error(`The "copyFiles.exclude" contains an invalid directory (${inc}). Expecting a string but instead got ${typeof inc}`)
                                }
                            }

                            this.#_config.copyFiles.exclude = ['.ts'].concat(configs.copyFiles.exclude);
                        } else {
                            throw new Error(`The "copyFiles.exclude" is expecting an array of strings, instead got ${typeof configs.copyFiles.exclude}`)
                        }
                    } else {
                        configs.copyFiles.exclude = ['.ts'];
                    }

                    if ('from' in configs.copyFiles) {
                        if (!utils.is.validString(configs.copyFiles.from)) { throw new Error(`The "copyFiles.from" expecting a string but instead got ${typeof configs.copyFiles.from}`) }
                        if (!fs.existsSync(path.resolve(configs.copyFiles.from))) { throw new Error(`The "copyFiles.from" directory (${configs.copyFiles.from}) does not exist`) }
                        this.#_config.copyFiles.from = configs.copyFiles.from;
                    } else {
                        this.#_config.copyFiles.from = path.join(constants.ROOT, 'src');
                    }

                }

                if ('addExtensions' in configs) {
                    if (typeof configs.addExtensions !== 'boolean') { throw new Error(`The "addExtensions" option is expecting a boolean value, instead got ${typeof configs.addExtensions}`) }
                    this.#_config.addExtensions = configs.addExtensions;
                } else {
                    this.#_config.addExtensions = false;
                }
            } catch (error) {
                if (error instanceof Error) {
                    error.message = `Unable to read postbuild.configs.json: ${error.message}`;
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
                        content = content.replace(/(import\s+.*\s+from\s+['"])(.*)(['"];)/g, (match, p1, p2, p3) => {
                            if (!p2.endsWith('.js') && !p2.startsWith('.') && !p2.startsWith('/')) {
                                return match;  // Skip non-relative imports
                            }
                            if (!p2.endsWith('.js')) {
                                return `${p1}${p2}.js${p3}`;
                            }
                            return match;
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
                const content = JSON.stringify({
                    "type": "module"
                }, null, 4);

                this.#_helpers.create.write(this.#_config.esmDir, content);
            },
            pkgCJS: () => {
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
        }
    }

    run() {
        const st = performance.now();

        this.#_helpers.read();
        this.#_helpers.copy.run();
        this.#_helpers.extensions.run();

        const et = performance.now();
        const duration = et - st;
        this.#_helpers.print(`PostBuild finishes in ${duration} milliseconds`);
    }
}

export default new Main();