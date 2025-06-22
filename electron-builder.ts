import type {Configuration} from "electron-builder";

const appId = "com.ismailvaliev.akbuzat";
const productName = "Akbuzat";
const executableName = "akbuzat";


/**
 * @see - https://www.electron.build/configuration/configuration
 */
export default {
    appId: appId,
    asar: true,
    productName: productName,
    executableName: executableName,
    directories: {
        output: "release"
    },
    icon: "./public/app-icon.png",


    files: [
        "dist",
        "dist-electron",
        "!node_modules/node-llama-cpp/bins/**/*",
        "node_modules/node-llama-cpp/bins/${os}-${arch}*/**/*",
        "!node_modules/node-llama-cpp/llama/localBuilds/**/*",
        "node_modules/node-llama-cpp/llama/localBuilds/${os}-${arch}*/**/*",
        "!node_modules/@node-llama-cpp/*/bins/**/*",
        "node_modules/@node-llama-cpp/${os}-${arch}*/bins/**/*"
    ],
    asarUnpack: [
        "node_modules/node-llama-cpp/bins",
        "node_modules/node-llama-cpp/llama/localBuilds",
        "node_modules/@node-llama-cpp/*"
    ],

    mac: {
        icon: "./public/icons/app-icon.icns",
        category: "public.app-category.productivity"
    },

    win: {
        icon: "./public/icons/app-icon.ico",
        target: [
            {
                target: "dir", 
                arch: ["x64"]
            }
        ],
        artifactName: "${name}.Windows.${version}.${arch}.zip"
    },

    linux: {
        icon: "./public/icons/icon-512.png",
        target: [{
            target: "tar.gz",
            arch: [
                "x64"
            ]
        }],
        category: "Utility",

        artifactName: "${name}.Linux.${version}.${arch}.${ext}"
    }
} as Configuration;
