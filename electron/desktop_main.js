const { app, BrowserWindow, dialog, ipcMain, Tray, Menu, nativeImage } = require("electron");
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-disk-cache');
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const { createDatabase } = require("./database");
const { registerIpcHandlers } = require("./ipc_handlers");
const Store = require("electron-store");

let backendProcess = null;
let mainWindow = null;
let splashWindow = null;
let tray = null;
let store = new Store();
let isQuitting = false;

const SERVER_URL = "http://127.0.0.1:5000/";

function pickPythonCommand() {
  if (process.env.PHARMACIAN_PYTHON) {
    return { cmd: process.env.PHARMACIAN_PYTHON, args: [] };
  }
  if (process.platform === "win32") {
    return { cmd: "py", args: ["-3"] };
  }
  return { cmd: "python3", args: [] };
}

function startBackend() {
  let cmd, args, cwd;

  if (app.isPackaged) {
    // Production: Use the bundled standalone EXE
    cmd = path.join(process.resourcesPath, "bin", "pharmacian_engine.exe");
    args = [];
    cwd = process.resourcesPath; 
  } else {
    // Development: Use system Python
    const python = pickPythonCommand();
    cmd = python.cmd;
    args = [...python.args, path.join(__dirname, "..", "backend", "server_entry.py")];
    cwd = path.join(__dirname, "..", "backend");
  }

  console.log(`[Main] Spawning backend: ${cmd} in ${cwd}`);
  
  backendProcess = spawn(cmd, args, {
    cwd: cwd,
    env: {
      ...process.env,
      PHARMACIAN_DESKTOP: "1"
    },
    stdio: "ignore"
  });

  backendProcess.on("exit", (code) => {
    if (code !== 0) {
      dialog.showErrorBox(
        "Backend Stopped",
        "The Python backend exited unexpectedly. Please restart the app."
      );
    }
  });
}

function waitForServerReady(timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(SERVER_URL, (res) => {
        res.resume();
        resolve();
      }).on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Server not ready"));
          return;
        }
        setTimeout(check, 300);
      });
    };
    check();
  });
}

function isServerUp() {
  return new Promise((resolve) => {
    http
      .get(SERVER_URL, (res) => {
        res.resume();
        resolve(true);
      })
      .on("error", () => resolve(false));
  });
}

async function ensureBackend() {
  const alreadyUp = await isServerUp();
  if (!alreadyUp) {
    startBackend();
  }
}

async function createWindow() {
  const windowState = store.get("windowState", {
      width: 1280,
      height: 820
  });

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    show: false, // hide initially, waiting for splash
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "electron_bridge.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Persist Window State
  const saveState = () => {
    if (!mainWindow.isMaximized()) {
        store.set("windowState", mainWindow.getBounds());
    }
  };
  mainWindow.on("resize", saveState);
  mainWindow.on("move", saveState);

  // Background Tray hide instead of close
  mainWindow.on("close", (event) => {
      if (!isQuitting) {
          event.preventDefault();
          mainWindow.hide();
      }
  });

  // Local Shortcuts using webcontents
  mainWindow.webContents.on("before-input-event", (event, input) => {
      if (input.type !== "keyDown") return;

      if (input.control && input.key.toLowerCase() === "n") {
          mainWindow.webContents.loadURL(SERVER_URL + "diagnose");
          event.preventDefault();
      }
      if (input.key === "F11") {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
          event.preventDefault();
      }
  });

  await mainWindow.loadURL(SERVER_URL);
}

function createSplash() {
    splashWindow = new BrowserWindow({
        width: 500,
        height: 300,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: { 
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    splashWindow.loadFile(path.join(__dirname, "splash.html"));
}

function createTray() {
    const iconPath = path.join(__dirname, "..", "frontend", "static", "logo.png");
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip("Pharmacian Monitoring System");

    const showMainWindow = () => {
        if (mainWindow) {
            mainWindow.show();
        }
    };
    
    const contextMenu = Menu.buildFromTemplate([
        { label: "Open Pharmacian", click: () => showMainWindow() },
        { type: "separator" },
        { label: "Quit", click: () => {
            isQuitting = true;
            app.quit();
        }}
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.on("click", () => showMainWindow());
}

app.whenReady().then(async () => {
  try {
    createSplash();

    // 1. Open / create the SQLite database
    createDatabase();

    // 2. Register all IPC handlers before windows open
    registerIpcHandlers();
    createTray();

    // 3. Start Flask backend if not running
    await ensureBackend();
    await waitForServerReady();

    // Minimum splash screen duration (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Open browser window
    await createWindow();

    splashWindow.close();
    mainWindow.show();
  } catch (err) {
    if (splashWindow) splashWindow.close();
    dialog.showErrorBox(
      "Startup Error",
      `Unable to start Pharmacian.\n\n${err.message}\n\nEnsure Python dependencies are installed.`
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});
