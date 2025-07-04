import {ipcRenderer, contextBridge} from "electron";

console.log("Preload script loading...");

// --------- Expose some API to the Renderer process ---------
try {
    const exposedAPI = {
        on(...args: Parameters<typeof ipcRenderer.on>) {
            const [channel, listener] = args;
            return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
        },
        off(...args: Parameters<typeof ipcRenderer.off>) {
            const [channel, ...omit] = args;
            return ipcRenderer.off(channel, ...omit);
        },
        send(...args: Parameters<typeof ipcRenderer.send>) {
            const [channel, ...omit] = args;
            return ipcRenderer.send(channel, ...omit);
        },
        invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
            const [channel, ...omit] = args;
            return ipcRenderer.invoke(channel, ...omit);
        }

        // You can expose other APIs you need here
        // ...
    };

    contextBridge.exposeInMainWorld("ipcRenderer", exposedAPI);
    console.log("Preload script loaded successfully, exposed ipcRenderer API");
} catch (error) {
    console.error("Failed to expose ipcRenderer API:", error);
}
