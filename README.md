[![N|Solid](https://static.wixstatic.com/media/72ffe6_da8d2142d49c42b29c96ba80c8a91a6c~mv2.png)](https://nasriya.net)
# PostBuild.
[![Static Badge](https://img.shields.io/badge/license-Free_(Restricted)-blue)](https://github.com/nasriyasoftware/PostBuild?tab=License-1-ov-file) ![Repository Size](https://img.shields.io/github/repo-size/nasriyasoftware/PostBuild.svg) ![Last Commit](https://img.shields.io/github/last-commit/nasriyasoftware/PostBuild.svg) [![Status](https://img.shields.io/badge/Status-Stable-green.svg)](link-to-your-status-page)
##### Visit us at [www.nasriya.net](https://nasriya.net).

PostBuild is a utility pacakge for **TypeScript** run useful tasks after transpiling TypeScript into **ESM** and **CJS** JavaScript file.

Made with ❤️ in **Palestine** 🇵🇸
___
## Installation
Install the pacakge as a dev. dependency:
```shell
npm i --save-dev @nasriya/postbuild
```

## Config File
The `postbuild.configs.json` is the file where all your configurations reside, and is needed to perform the tasks or the build process will fail.

If you don't have a file, just run the following command and a file will be generated with recommended configurations:

```shell
npm run postbuild-init
```

##### Config File Content
The above comand will generate a file with all the features set to their recommended values. This table below explains them in details.

| Property            | Description                                                              | Posible values          | Default value |
| ------------------- | ------------------------------------------------------------------------ | ----------------------- | ------------- |
| `esmDir`            | The directory of the generated `ESM` folder.                             | `auto` or the directory | `auto`        |
| `cjsDir`            | The directory of the generated `CJS` folder.                             | `auto` or the directory | `auto`        |
| `verbose`           | An option to enable logging extra details .                              | `true` or `false`       | `true`        |
| `addExtensions`     | Appending `.js` to all import statements.                                | `true` or `false`       | `true`        |
| `copyFiles`         | An options object to copy assets to the `dist` folder after transpiling. | `object` or `undefined` | Notice below  |
| `copyFiles.from`    | The directory where you want to copy the assets to.                      | directory               | `src`         |
| `copyFiles.exclude` | An array of file extensions to exclude.                                  | `string[]`              | `['.ts']`     |

The default configurations works well if your project is structured like this:
```
├── dist/
│   ├── @types
│   ├── cjs
│   └── esm
├── src
│   ├── folder1
│   ├── folder2
│   ├── folder3
│   └── index.ts
├── package.json
└── README.md
```


## Usage
The best way to use this package is to integrate it with your build process by appending the `postbuild` worker to the end of the `build` command:

```json
// package.json
{
    "scripts": {
        "build": "npm run build:esm && npm run build:cjs && postbuild",
        "build:esm": "tsc --project tsconfig.esm.json",
        "build:cjs": "tsc --project tsconfig.cjs.json",        
    }
}
```
___
## License
Please read the license from [here](https://github.com/nasriyasoftware/PostBuild?tab=License-1-ov-file).