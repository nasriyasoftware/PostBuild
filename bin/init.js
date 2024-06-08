#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import constants from '../constants.js';

const configs = {
    esmDir: "auto",
    cjsDir: "auto",
    verbose: true,
    copyFiles: {
        from: path.join(constants.ROOT, 'src'),
        exclude: ['.js']
    },
    addExtensions: true
}

fs.writeFileSync(path.join(constants.ROOT, constants.CONFIG_FILE_NAME), JSON.stringify(configs, null, 4), { encoding: 'utf-8' });