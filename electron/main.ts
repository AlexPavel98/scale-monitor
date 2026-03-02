import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
} from "electron";
import path from "path";
import { SerialPortManager, WeightData } from "./serial";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const scaleManager = new SerialPortManager();

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "Scale Monitor",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // In production, serve the built Next.js export from the out/ directory
    const indexPath = path.join(__dirname, "..", "out", "index.html");
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Minimise to tray instead of quitting (optional behavior)
  mainWindow.on("close", (event) => {
    if (tray && process.platform !== "darwin") {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

// ---------------------------------------------------------------------------
// Tray icon
// ---------------------------------------------------------------------------

function createTray(): void {
  // Use a simple 16x16 placeholder icon; replace with a real icon file later
  const iconPath = path.join(__dirname, "..", "public", "icon.png");
  let trayIcon: Electron.NativeImage;

  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip("Scale Monitor");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Window",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        tray = null;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ---------------------------------------------------------------------------
// IPC handlers for serial port communication
// ---------------------------------------------------------------------------

function registerIpcHandlers(): void {
  ipcMain.handle(
    "scale:connect",
    async (_event, port: string, baudRate: number) => {
      try {
        await scaleManager.connect(port, baudRate);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to connect to ${port}: ${message}`);
      }
    }
  );

  ipcMain.handle("scale:disconnect", async () => {
    await scaleManager.disconnect();
  });

  ipcMain.handle("scale:list-ports", async () => {
    return SerialPortManager.listPorts();
  });
}

// ---------------------------------------------------------------------------
// Forward serial events to renderer
// ---------------------------------------------------------------------------

function forwardSerialEvents(): void {
  scaleManager.on("weight", (data: WeightData) => {
    mainWindow?.webContents.send("scale:weight", data);
  });

  scaleManager.on(
    "status",
    (data: { status: string; error?: string }) => {
      mainWindow?.webContents.send("scale:status", data);
    }
  );
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerIpcHandlers();
  forwardSerialEvents();

  app.on("activate", () => {
    // macOS: re-create window when dock icon is clicked and no windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  // Ensure serial port is cleanly closed on exit
  if (scaleManager.isConnected) {
    await scaleManager.disconnect();
  }
});
