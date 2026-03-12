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
import { WeightBroadcaster } from "./weight-broadcaster";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const scaleManager = new SerialPortManager();

// Weight broadcaster — pushes live weight to Supabase for remote access
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const ORG_ID =
  process.env.ORGANIZATION_ID || "a0000000-0000-0000-0000-000000000003"; // Palm Kartofler

const broadcaster = new WeightBroadcaster(SUPABASE_URL, SUPABASE_KEY, ORG_ID);

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
      preload: path.join(__dirname, "preload.js"), // compiled from preload.ts
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // Production: load from Vercel (online) with offline fallback
    mainWindow.loadURL("https://produktion-projekt.vercel.app/scale");
    mainWindow.webContents.on("did-fail-load", () => {
      // Fallback: try local standalone server or show error
      console.warn("[Main] Failed to load remote URL, retrying in 5s...");
      setTimeout(() => {
        mainWindow?.loadURL("https://produktion-projekt.vercel.app/scale");
      }, 5000);
    });
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
// Forward serial events to renderer + broadcaster
// ---------------------------------------------------------------------------

function forwardSerialEvents(): void {
  scaleManager.on("weight", (data: WeightData) => {
    mainWindow?.webContents.send("scale:weight", data);
    // Also broadcast to Supabase for remote access
    broadcaster.updateWeight(data.weight, data.stable);
  });

  scaleManager.on(
    "status",
    (data: { status: string; error?: string }) => {
      mainWindow?.webContents.send("scale:status", data);
      // Update broadcaster connection state
      if (data.status === "disconnected" || data.status === "error") {
        broadcaster.setDisconnected();
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Auto-connect to scale using saved settings
// ---------------------------------------------------------------------------

async function autoConnectScale(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data } = await supabase
      .from("scale_settings")
      .select("value")
      .eq("key", "scale_config")
      .single();

    if (data?.value) {
      const config = data.value as {
        comPort?: string;
        baudRate?: number;
      };
      if (config.comPort) {
        console.log(
          `[Main] Auto-connecting to ${config.comPort} at ${config.baudRate || 9600} baud`
        );
        try {
          await scaleManager.connect(
            config.comPort,
            config.baudRate || 9600
          );
        } catch (err) {
          console.warn("[Main] Auto-connect failed:", err);
        }
      }
    }
  } catch (err) {
    console.warn("[Main] Could not load scale config:", err);
  }
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerIpcHandlers();
  forwardSerialEvents();
  broadcaster.start();
  autoConnectScale();

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
  // Stop broadcasting and close serial port cleanly
  broadcaster.stop();
  if (scaleManager.isConnected) {
    await scaleManager.disconnect();
  }
});
