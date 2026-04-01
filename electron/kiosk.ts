import { EventEmitter } from "events";
import { SerialPort } from "serialport";

export type KioskStatus = "connected" | "disconnected" | "error";
export type KioskKey =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "C" | "ENTER" | "F1" | "F2" | "F3" | "F4" | "F5"
  | "UP" | "DOWN" | "OK";

const DEFAULT_RECONNECT_INTERVAL = 5000;

// ST 3000 keyboard byte mapping (via VxComm COM12 at 19200 baud)
const KEY_MAP: Record<number, KioskKey> = {
  0x30: "0", 0x31: "1", 0x32: "2", 0x33: "3", 0x34: "4",
  0x35: "5", 0x36: "6", 0x37: "7", 0x38: "8", 0x39: "9",
  0x43: "C",
  0x45: "ENTER",
  0x4e: "OK",
  0x46: "F1", 0x47: "F2", 0x48: "F3", 0x49: "F4", 0x4b: "F5",
  0x4c: "UP", 0x4d: "DOWN",
};

export class KioskManager extends EventEmitter {
  private displayPort: SerialPort | null = null;
  private keyboardPort: SerialPort | null = null;
  private displayComPort: string = "";
  private keyboardComPort: string = "";
  private displayBaudRate: number = 19200;
  private keyboardBaudRate: number = 19200;
  private shouldReconnect: boolean = false;
  private displayReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keyboardReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectInterval: number = DEFAULT_RECONNECT_INTERVAL;
  private isDisplayConnecting: boolean = false;
  private isKeyboardConnecting: boolean = false;

  get isDisplayConnected(): boolean {
    return this.displayPort !== null && this.displayPort.isOpen;
  }

  get isKeyboardConnected(): boolean {
    return this.keyboardPort !== null && this.keyboardPort.isOpen;
  }

  async connect(
    displayComPort: string,
    displayBaudRate: number,
    keyboardComPort: string,
    keyboardBaudRate: number
  ): Promise<void> {
    this.displayComPort = displayComPort;
    this.displayBaudRate = displayBaudRate;
    this.keyboardComPort = keyboardComPort;
    this.keyboardBaudRate = keyboardBaudRate;
    this.shouldReconnect = true;

    const results = await Promise.allSettled([
      this.connectDisplay(displayComPort, displayBaudRate),
      this.connectKeyboard(keyboardComPort, keyboardBaudRate),
    ]);

    if (results[0].status === "rejected" && results[1].status === "rejected") {
      throw new Error("Failed to connect to both display and keyboard");
    }
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    this.stopDisplayReconnectTimer();
    this.stopKeyboardReconnectTimer();

    if (this.displayPort?.isOpen) {
      await new Promise<void>((resolve) => {
        this.displayPort!.close(() => resolve());
      });
    }
    if (this.keyboardPort?.isOpen) {
      await new Promise<void>((resolve) => {
        this.keyboardPort!.close(() => resolve());
      });
    }

    this.cleanupDisplay();
    this.cleanupKeyboard();
    this.emitStatus("disconnected");
    console.log("[Kiosk] Disconnected");
  }

  // ---------------------------------------------------------------------------
  // Display methods
  // ---------------------------------------------------------------------------

  private lastDisplayText: string = "";
  private cursorSynced: boolean = false;

  private syncResolve: (() => void) | null = null;

  sendDisplay(line1: string, line2: string = ""): void {
    if (!this.displayPort?.isOpen) return;
    // ST 3000: HD44780 2x20 LCD, 80-char cycle.
    // Pos 0-19: top row, 20-39: invisible, 40-59: bottom row, 60-79: invisible.
    const top = line1.padEnd(20).slice(0, 20);
    const bottom = line2.padEnd(20).slice(0, 20);
    const pad = " ".repeat(20);
    const text = top + pad + bottom + pad;
    if (text === this.lastDisplayText && this.cursorSynced) return;
    this.lastDisplayText = text;
    if (!this.cursorSynced) {
      // First write: send 80 spaces to clear display (one full cycle)
      this.displayPort.write(" ".repeat(80));
      this.cursorSynced = true;
    }
    this.displayPort.write(text);
  }

  showReady(): void {
    this.sendDisplay("INDTAST AVLER KODE", "");
  }

  showWeight(kg: number): void {
    const weightStr = `${kg} kg`;
    this.sendDisplay("VAEGT:", weightStr.padStart(14));
  }

  showWait(): void {
    this.sendDisplay("VENT VENLIGST...", "");
  }

  showResult(name: string, netKg: number): void {
    const truncName = name.slice(0, 20);
    const netStr = `NETTO: ${netKg} KG`;
    this.sendDisplay(truncName, netStr);
  }

  clearDisplay(): void {
    this.sendDisplay("", "");
  }

  // ---------------------------------------------------------------------------
  // Connection helpers
  // ---------------------------------------------------------------------------

  private connectDisplay(comPort: string, baudRate: number): Promise<void> {
    if (this.isDisplayConnecting) {
      return Promise.reject(new Error("Display connection in progress"));
    }

    this.isDisplayConnecting = true;
    this.stopDisplayReconnectTimer();

    return new Promise<void>((resolve, reject) => {
      this.displayPort = new SerialPort({
        path: comPort,
        baudRate,
        autoOpen: false,
      });

      this.displayPort.on("error", (err: Error) => {
        console.error("[Kiosk] Display error:", err.message);
        if (this.isDisplayConnecting) {
          this.isDisplayConnecting = false;
          this.emitDisplayStatus("error", err.message);
          this.cleanupDisplay();
          this.startDisplayReconnectTimer();
          reject(err);
        } else {
          this.emitDisplayStatus("error", err.message);
          this.handleDisplayDisconnect();
        }
      });

      this.displayPort.on("close", () => {
        if (!this.isDisplayConnecting) {
          this.emitDisplayStatus("disconnected");
          this.handleDisplayDisconnect();
        }
      });

      this.displayPort.open((err) => {
        this.isDisplayConnecting = false;
        if (err) {
          this.emitDisplayStatus("error", err.message);
          this.cleanupDisplay();
          this.startDisplayReconnectTimer();
          reject(err);
          return;
        }
        console.log(`[Kiosk] Display connected to ${comPort} at ${baudRate} baud`);
        this.emitDisplayStatus("connected");
        resolve();
      });
    });
  }

  private connectKeyboard(comPort: string, baudRate: number): Promise<void> {
    if (this.isKeyboardConnecting) {
      return Promise.reject(new Error("Keyboard connection in progress"));
    }

    this.isKeyboardConnecting = true;
    this.stopKeyboardReconnectTimer();

    return new Promise<void>((resolve, reject) => {
      this.keyboardPort = new SerialPort({
        path: comPort,
        baudRate,
        autoOpen: false,
      });

      this.keyboardPort.on("data", (data: Buffer) => {
        this.handleKeyboardData(data);
      });

      this.keyboardPort.on("error", (err: Error) => {
        console.error("[Kiosk] Keyboard error:", err.message);
        if (this.isKeyboardConnecting) {
          this.isKeyboardConnecting = false;
          this.emitKeyboardStatus("error", err.message);
          this.cleanupKeyboard();
          this.startKeyboardReconnectTimer();
          reject(err);
        } else {
          this.emitKeyboardStatus("error", err.message);
          this.handleKeyboardDisconnect();
        }
      });

      this.keyboardPort.on("close", () => {
        if (!this.isKeyboardConnecting) {
          this.emitKeyboardStatus("disconnected");
          this.handleKeyboardDisconnect();
        }
      });

      this.keyboardPort.open((err) => {
        this.isKeyboardConnecting = false;
        if (err) {
          this.emitKeyboardStatus("error", err.message);
          this.cleanupKeyboard();
          this.startKeyboardReconnectTimer();
          reject(err);
          return;
        }
        console.log(`[Kiosk] Keyboard connected to ${comPort} at ${baudRate} baud`);
        this.emitKeyboardStatus("connected");
        resolve();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Keyboard data parsing
  // ---------------------------------------------------------------------------

  private handleKeyboardData(data: Buffer): void {
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      const key = KEY_MAP[byte];
      if (key) {
        this.emit("key", { key });
      } else {
        console.log(`[Kiosk] Unknown key byte: 0x${byte.toString(16)}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Status events
  // ---------------------------------------------------------------------------

  private emitStatus(status: KioskStatus, error?: string): void {
    this.emit("status", { status, error });
  }

  private emitDisplayStatus(status: KioskStatus, error?: string): void {
    this.emit("displayStatus", { status, error });
  }

  private emitKeyboardStatus(status: KioskStatus, error?: string): void {
    this.emit("keyboardStatus", { status, error });
  }

  // ---------------------------------------------------------------------------
  // Reconnection
  // ---------------------------------------------------------------------------

  private handleDisplayDisconnect(): void {
    this.cleanupDisplay();
    if (this.shouldReconnect) {
      this.startDisplayReconnectTimer();
    }
  }

  private handleKeyboardDisconnect(): void {
    this.cleanupKeyboard();
    if (this.shouldReconnect) {
      this.startKeyboardReconnectTimer();
    }
  }

  private cleanupDisplay(): void {
    if (this.displayPort) {
      this.displayPort.removeAllListeners();
      if (this.displayPort.isOpen) {
        this.displayPort.close(() => {});
      }
      this.displayPort = null;
    }
    this.isDisplayConnecting = false;
  }

  private cleanupKeyboard(): void {
    if (this.keyboardPort) {
      this.keyboardPort.removeAllListeners();
      if (this.keyboardPort.isOpen) {
        this.keyboardPort.close(() => {});
      }
      this.keyboardPort = null;
    }
    this.isKeyboardConnecting = false;
  }

  private startDisplayReconnectTimer(): void {
    if (this.displayReconnectTimer) return;
    this.displayReconnectTimer = setTimeout(async () => {
      this.displayReconnectTimer = null;
      if (!this.shouldReconnect) return;
      console.log("[Kiosk] Attempting display reconnect...");
      try {
        await this.connectDisplay(this.displayComPort, this.displayBaudRate);
      } catch {
        console.log("[Kiosk] Display reconnect failed, will retry...");
      }
    }, this.reconnectInterval);
  }

  private startKeyboardReconnectTimer(): void {
    if (this.keyboardReconnectTimer) return;
    this.keyboardReconnectTimer = setTimeout(async () => {
      this.keyboardReconnectTimer = null;
      if (!this.shouldReconnect) return;
      console.log("[Kiosk] Attempting keyboard reconnect...");
      try {
        await this.connectKeyboard(this.keyboardComPort, this.keyboardBaudRate);
      } catch {
        console.log("[Kiosk] Keyboard reconnect failed, will retry...");
      }
    }, this.reconnectInterval);
  }

  private stopDisplayReconnectTimer(): void {
    if (this.displayReconnectTimer) {
      clearTimeout(this.displayReconnectTimer);
      this.displayReconnectTimer = null;
    }
  }

  private stopKeyboardReconnectTimer(): void {
    if (this.keyboardReconnectTimer) {
      clearTimeout(this.keyboardReconnectTimer);
      this.keyboardReconnectTimer = null;
    }
  }
}
