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

    win: {
        target: [
            {
                target: "zip", 
                arch: ["x64"]
            }
        ],
        artifactName: "${name}.Windows.${version}.${arch}.${ext}"
    },

    linux: {
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
