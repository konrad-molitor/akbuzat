import {createBirpc} from "birpc";

export function createRendererSideBirpc<
    const RendererFunction = Record<string, never>,
    const ElectronFunctions extends object = Record<string, never>
>(
    toRendererEventName: string,
    fromRendererEventName: string,
    electronFunctions: ElectronFunctions
) {
    if (typeof window === 'undefined') {
        throw new Error("Window is not available. This function should only be called in the renderer process.");
    }

    if (!window.ipcRenderer) {
        throw new Error(
            `ipcRenderer is not available on window object. ` +
            `Available keys: ${Object.keys(window).slice(0, 10)
                .join(', ')}... ` +
            `Make sure the preload script is loaded correctly and contextBridge is working.`
        );
    }

    return createBirpc<RendererFunction, ElectronFunctions>(electronFunctions, {
        post: (data) => window.ipcRenderer.send(fromRendererEventName, data),
        on: (onData) => window.ipcRenderer.on(toRendererEventName, (event, data) => {
            onData(data);
        }),
        serialize: (value) => JSON.stringify(value),
        deserialize: (value) => JSON.parse(value)
    });
}

