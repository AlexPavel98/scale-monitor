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
import { TrafficLightManager } from "./traffic-light";
import { KioskManager } from "./kiosk";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const scaleManager = new SerialPortManager();
const trafficLight = new TrafficLightManager();
const kiosk = new KioskManager();

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
  // --- Scale ---
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

  ipcMain.handle("scale:get-status", () => {
    return { status: scaleManager.isConnected ? "connected" : "disconnected" };
  });

  // --- Traffic Light ---
  ipcMain.handle(
    "trafficLight:connect",
    async (_event, comPort: string, baudRate: number) => {
      try {
        await trafficLight.connect(comPort, baudRate);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to connect traffic light: ${message}`);
      }
    }
  );

  ipcMain.handle("trafficLight:disconnect", async () => {
    await trafficLight.disconnect();
  });

  ipcMain.handle("trafficLight:setRed", async () => {
    trafficLight.setRed();
  });

  ipcMain.handle("trafficLight:setGreen", async () => {
    trafficLight.setGreen();
  });

  ipcMain.handle("trafficLight:allOff", async () => {
    trafficLight.allOff();
  });

  ipcMain.handle(
    "trafficLight:setGreenThenOff",
    async (_event, delay?: number) => {
      trafficLight.setGreenThenOff(delay);
    }
  );

  // --- Kiosk ---
  ipcMain.handle(
    "kiosk:connect",
    async (
      _event,
      displayComPort: string,
      displayBaudRate: number,
      keyboardComPort: string,
      keyboardBaudRate: number
    ) => {
      try {
        await kiosk.connect(displayComPort, displayBaudRate, keyboardComPort, keyboardBaudRate);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to connect kiosk: ${message}`);
      }
    }
  );

  ipcMain.handle("kiosk:disconnect", async () => {
    await kiosk.disconnect();
  });

  ipcMain.handle(
    "kiosk:sendDisplay",
    async (_event, line1: string, line2?: string) => {
      kiosk.sendDisplay(line1, line2);
    }
  );

  ipcMain.handle("kiosk:showReady", async () => {
    kiosk.showReady();
  });

  ipcMain.handle("kiosk:showWeight", async (_event, kg: number) => {
    kiosk.showWeight(kg);
  });

  ipcMain.handle("kiosk:showWait", async () => {
    kiosk.showWait();
  });
}

// ---------------------------------------------------------------------------
// Forward serial events to renderer + broadcaster
// ---------------------------------------------------------------------------

// Threshold in kg — below this the scale is considered empty
const SCALE_EMPTY_THRESHOLD = 100;

// Kiosk state
let lastWeight = 0;
let kioskDigits = "";

function updateKioskDisplay(): void {
  if (!kiosk.isDisplayConnected) return;
  const weightStr = `${lastWeight} kg`;
  const bottom = kioskDigits
    ? (weightStr + "  " + kioskDigits).padEnd(20).slice(0, 20)
    : weightStr.padEnd(20).slice(0, 20);
  kiosk.sendDisplay("INDTAST AVLER KODE", bottom);
}
let scaleOccupied = false;
let trafficLightInitialized = false;

function forwardSerialEvents(): void {
  scaleManager.on("weight", (data: WeightData) => {
    mainWindow?.webContents.send("scale:weight", data);
    // Also broadcast to Supabase for remote access
    broadcaster.updateWeight(data.weight, data.stable);
    // Update kiosk display: weight + typed digits on bottom row
    lastWeight = data.weight;
    updateKioskDisplay();

    // Auto traffic light: green when empty, red when occupied
    if (trafficLight.isConnected && data.stable) {
      const empty = data.weight < SCALE_EMPTY_THRESHOLD;

      // On first stable reading, set the initial state
      if (!trafficLightInitialized) {
        trafficLightInitialized = true;
        scaleOccupied = !empty;
        if (empty) {
          trafficLight.setGreen();
          mainWindow?.webContents.send("trafficLight:auto", { state: "green" });
        } else {
          trafficLight.setRed();
          mainWindow?.webContents.send("trafficLight:auto", { state: "red" });
        }
      } else if (empty && scaleOccupied) {
        scaleOccupied = false;
        trafficLight.setGreen();
        mainWindow?.webContents.send("trafficLight:auto", { state: "green" });
      } else if (!empty && !scaleOccupied) {
        scaleOccupied = true;
        trafficLight.setRed();
        mainWindow?.webContents.send("trafficLight:auto", { state: "red" });
      }
    }
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
// Forward hardware events to renderer
// ---------------------------------------------------------------------------

function forwardHardwareEvents(): void {
  trafficLight.on(
    "status",
    (data: { status: string; error?: string }) => {
      mainWindow?.webContents.send("trafficLight:status", data);
    }
  );

  kiosk.on("key", (data: { key: string }) => {
    const { key } = data;
    // Track digits for kiosk display
    if (key >= "0" && key <= "9") {
      kioskDigits += key;
      updateKioskDisplay();
    } else if (key === "C") {
      kioskDigits = "";
      updateKioskDisplay();
    } else if (key === "ENTER" && kioskDigits) {
      // Send card number + captured weight to renderer
      mainWindow?.webContents.send("kiosk:submit", {
        cardNumber: kioskDigits,
        weight: lastWeight,
      });
      kioskDigits = "";
      updateKioskDisplay();
    }
    // Also forward raw key to renderer
    mainWindow?.webContents.send("kiosk:key", data);
  });

  kiosk.on(
    "status",
    (data: { status: string; error?: string }) => {
      mainWindow?.webContents.send("kiosk:status", data);
    }
  );

  kiosk.on(
    "displayStatus",
    (data: { status: string; error?: string }) => {
      mainWindow?.webContents.send("kiosk:displayStatus", data);
    }
  );

  kiosk.on(
    "keyboardStatus",
    (data: { status: string; error?: string }) => {
      mainWindow?.webContents.send("kiosk:keyboardStatus", data);
    }
  );
}

// ---------------------------------------------------------------------------
// Auto-connect to scale and hardware using saved settings
// ---------------------------------------------------------------------------

async function autoConnectScale(): Promise<void> {
  // Default hardware configuration
  const DEFAULT_COM_PORT = "COM2";
  const DEFAULT_BAUD_RATE = 9600;
  const DEFAULT_TL_COM_PORT = "COM1";
  const DEFAULT_TL_BAUD_RATE = 9600;
  const DEFAULT_KIOSK_DISPLAY_COM = "COM8";
  const DEFAULT_KIOSK_DISPLAY_BAUD = 19200;
  const DEFAULT_KIOSK_KEYBOARD_COM = "COM12";
  const DEFAULT_KIOSK_KEYBOARD_BAUD = 19200;

  let comPort = DEFAULT_COM_PORT;
  let baudRate = DEFAULT_BAUD_RATE;
  let tlComPort = DEFAULT_TL_COM_PORT;
  let tlBaudRate = DEFAULT_TL_BAUD_RATE;
  let tlEnabled = true;
  let kioskDisplayCom = DEFAULT_KIOSK_DISPLAY_COM;
  let kioskDisplayBaud = DEFAULT_KIOSK_DISPLAY_BAUD;
  let kioskKeyboardCom = DEFAULT_KIOSK_KEYBOARD_COM;
  let kioskKeyboardBaud = DEFAULT_KIOSK_KEYBOARD_BAUD;
  let kioskEnabled = true;

  // Try to load saved config from Supabase, fall back to defaults
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      const { data } = await supabase
        .from("scale_settings")
        .select("value")
        .eq("key", "scale_config")
        .single();

      if (data?.value) {
        const config = data.value as { comPort?: string; baudRate?: number };
        comPort = config.comPort || DEFAULT_COM_PORT;
        baudRate = config.baudRate || DEFAULT_BAUD_RATE;
      }

      const { data: hwData } = await supabase
        .from("scale_settings")
        .select("value")
        .eq("key", "hardware_config")
        .single();

      if (hwData?.value) {
        const hw = hwData.value as {
          trafficLight?: { enabled?: boolean; comPort?: string; baudRate?: number };
          kiosk?: { enabled?: boolean; displayCom?: string; displayBaud?: number; keyboardCom?: string; keyboardBaud?: number };
        };
        if (hw.trafficLight) {
          tlEnabled = hw.trafficLight.enabled ?? true;
          tlComPort = hw.trafficLight.comPort || DEFAULT_TL_COM_PORT;
          tlBaudRate = hw.trafficLight.baudRate || DEFAULT_TL_BAUD_RATE;
        }
        if (hw.kiosk) {
          kioskEnabled = hw.kiosk.enabled ?? true;
          kioskDisplayCom = hw.kiosk.displayCom || DEFAULT_KIOSK_DISPLAY_COM;
          kioskDisplayBaud = hw.kiosk.displayBaud || DEFAULT_KIOSK_DISPLAY_BAUD;
          kioskKeyboardCom = hw.kiosk.keyboardCom || DEFAULT_KIOSK_KEYBOARD_COM;
          kioskKeyboardBaud = hw.kiosk.keyboardBaud || DEFAULT_KIOSK_KEYBOARD_BAUD;
        }
      }
    } catch (err) {
      console.warn("[Main] Could not load settings, using defaults:", err);
    }
  }

  // Connect scale
  console.log(`[Main] Auto-connecting scale to ${comPort} at ${baudRate} baud`);
  try {
    await scaleManager.connect(comPort, baudRate);
  } catch (err) {
    console.warn("[Main] Scale auto-connect failed:", err);
  }

  // Connect traffic light (serial COM port with DTR/RTS for DIO module power)
  if (tlEnabled) {
    console.log(`[Main] Auto-connecting traffic light to ${tlComPort} at ${tlBaudRate} baud`);
    try {
      await trafficLight.connect(tlComPort, tlBaudRate);
    } catch (err) {
      console.warn("[Main] Traffic light auto-connect failed:", err);
    }
  }

  // Connect kiosk
  if (kioskEnabled) {
    console.log(`[Main] Auto-connecting kiosk (display:${kioskDisplayCom}, keyboard:${kioskKeyboardCom})`);
    try {
      await kiosk.connect(kioskDisplayCom, kioskDisplayBaud, kioskKeyboardCom, kioskKeyboardBaud);
      kiosk.showReady();
    } catch (err) {
      console.warn("[Main] Kiosk auto-connect failed:", err);
    }
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
  forwardHardwareEvents();
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
  // Stop broadcasting and close all connections cleanly
  broadcaster.stop();
  if (scaleManager.isConnected) {
    await scaleManager.disconnect();
  }
  if (trafficLight.isConnected) {
    await trafficLight.disconnect();
  }
  if (kiosk.isDisplayConnected || kiosk.isKeyboardConnected) {
    await kiosk.disconnect();
  }
});
