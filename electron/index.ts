import {fileURLToPath} from "node:url";
import path from "node:path";
import fs from "node:fs";
import {app, shell, BrowserWindow} from "electron";
import {registerLlmRpc} from "./rpc/llmRpc.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── index.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
    ? path.join(process.env.APP_ROOT, "public")
    : RENDERER_DIST;

let win: BrowserWindow | null;

// Function to save window state
function saveWindowState() {
    if (!win) return;
    
    const bounds = win.getBounds();
    const isMaximized = win.isMaximized();
    
    const windowState = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized
    };
    
    try {
        const userDataPath = app.getPath('userData');
        const windowStatePath = path.join(userDataPath, 'window-state.json');
        fs.writeFileSync(windowStatePath, JSON.stringify(windowState));
    } catch (error) {
        console.error('Failed to save window state:', error);
    }
}

// Function to load window state
function loadWindowState() {
    try {
        const userDataPath = app.getPath('userData');
        const windowStatePath = path.join(userDataPath, 'window-state.json');
        
        if (fs.existsSync(windowStatePath)) {
            const data = fs.readFileSync(windowStatePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Failed to load window state:', error);
    }
    
    // Return default state
    return {
        width: 1400,
        height: 900,
        x: undefined,
        y: undefined,
        isMaximized: false
    };
}

function createWindow() {
    const windowState = loadWindowState();
    
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, "app-icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.mjs"),
            nodeIntegration: false,
            contextIsolation: true
        },
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        minWidth: 1200,
        minHeight: 800,
        show: false, // Don't show until ready
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        trafficLightPosition: process.platform === 'darwin' ? { x: 20, y: 20 } : undefined
    });
    
    // Restore maximized state
    if (windowState.isMaximized) {
        win.maximize();
    }
    
    // Save window state on resize, move, and close
    win.on('resize', saveWindowState);
    win.on('move', saveWindowState);
    win.on('close', saveWindowState);
    registerLlmRpc(win);

    // open external links in the default browser
    win.webContents.setWindowOpenHandler(({url}) => {
        if (url.startsWith("file://"))
            return {action: "allow"};

        void shell.openExternal(url);
        return {action: "deny"};
    });

    // Test active push message to Renderer-process.
    win.webContents.on("did-finish-load", () => {
        win?.webContents.send("main-process-message", (new Date()).toLocaleString());
        // Show window when content is loaded to prevent flash
        win?.show();
    });

    if (VITE_DEV_SERVER_URL)
        void win.loadURL(VITE_DEV_SERVER_URL);
    else
        void win.loadFile(path.join(RENDERER_DIST, "index.html"));

    if (VITE_DEV_SERVER_URL) {
        win.webContents.openDevTools();
    }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
        win = null;
    }
});

app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.whenReady().then(createWindow);
