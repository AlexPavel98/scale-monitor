import { EventEmitter } from "events";
import { SerialPort } from "serialport";

export type TrafficLightStatus = "connected" | "disconnected" | "error";

const DEFAULT_RECONNECT_INTERVAL = 5000;

// ICP DAS DCON commands for DIO module
const CMD_RED = "@011\r";
const CMD_GREEN = "@014\r";
const CMD_OFF = "@010\r";

export class TrafficLightManager extends EventEmitter {
  private port: SerialPort | null = null;
  private comPort: string = "";
  private baudRate: number = 9600;
  private shouldReconnect: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectInterval: number = DEFAULT_RECONNECT_INTERVAL;
  private isConnecting: boolean = false;
  private greenTimer: ReturnType<typeof setTimeout> | null = null;

  get isConnected(): boolean {
    return this.port !== null && this.port.isOpen;
  }

  async connect(comPort: string, baudRate: number = 9600): Promise<void> {
    if (this.isConnecting) {
      throw new Error("Connection already in progress");
    }

    if (this.port?.isOpen) {
      await this.disconnect();
    }

    this.comPort = comPort;
    this.baudRate = baudRate;
    this.shouldReconnect = true;
    this.isConnecting = true;
    this.stopReconnectTimer();

    return new Promise<void>((resolve, reject) => {
      this.port = new SerialPort({
        path: comPort,
        baudRate,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        autoOpen: false,
      });

      this.port.on("error", (err: Error) => {
        console.error("[TrafficLight] Port error:", err.message);
        if (this.isConnecting) {
          this.isConnecting = false;
          this.emitStatus("error", err.message);
          this.cleanup();
          this.startReconnectTimer();
          reject(err);
        } else {
          this.emitStatus("error", err.message);
          this.handleDisconnect();
        }
      });

      this.port.on("close", () => {
        if (!this.isConnecting) {
          console.log("[TrafficLight] Port closed");
          this.emitStatus("disconnected");
          this.handleDisconnect();
        }
      });

      this.port.open((err) => {
        if (err) {
          this.isConnecting = false;
          this.emitStatus("error", err.message);
          this.cleanup();
          this.startReconnectTimer();
          reject(err);
          return;
        }

        // Raise DTR and RTS — the DIO module is powered by these pins
        this.port!.set({ dtr: true, rts: true }, (setErr) => {
          this.isConnecting = false;
          if (setErr) {
            console.warn("[TrafficLight] Failed to set DTR/RTS:", setErr.message);
          }
          console.log(`[TrafficLight] Connected to ${comPort} at ${baudRate} baud (DTR/RTS raised)`);
          this.emitStatus("connected");
          resolve();
        });
      });
    });
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    this.stopReconnectTimer();
    this.clearGreenTimer();

    if (this.port?.isOpen) {
      await new Promise<void>((resolve) => {
        this.port!.close((err) => {
          if (err) {
            console.warn("[TrafficLight] Error closing port:", err.message);
          }
          resolve();
        });
      });
    }
    this.cleanup();
    this.emitStatus("disconnected");
    console.log("[TrafficLight] Disconnected");
  }

  setRed(): void {
    this.clearGreenTimer();
    this.sendCommand(CMD_RED);
  }

  setGreen(): void {
    this.clearGreenTimer();
    this.sendCommand(CMD_GREEN);
  }

  allOff(): void {
    this.clearGreenTimer();
    this.sendCommand(CMD_OFF);
  }

  setGreenThenOff(delayMs: number = 5000): void {
    this.clearGreenTimer();
    this.sendCommand(CMD_GREEN);
    this.greenTimer = setTimeout(() => {
      this.greenTimer = null;
      this.sendCommand(CMD_OFF);
    }, delayMs);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private sendCommand(cmd: string): void {
    if (this.port?.isOpen) {
      this.port.write(cmd);
      this.port.drain();
    }
  }

  private emitStatus(status: TrafficLightStatus, error?: string): void {
    this.emit("status", { status, error });
  }

  private handleDisconnect(): void {
    this.cleanup();
    if (this.shouldReconnect) {
      this.startReconnectTimer();
    }
  }

  private cleanup(): void {
    if (this.port) {
      this.port.removeAllListeners();
      if (this.port.isOpen) {
        this.port.close(() => {});
      }
      this.port = null;
    }
    this.isConnecting = false;
  }

  private clearGreenTimer(): void {
    if (this.greenTimer) {
      clearTimeout(this.greenTimer);
      this.greenTimer = null;
    }
  }

  private startReconnectTimer(): void {
    if (this.reconnectTimer) return;

    console.log(
      `[TrafficLight] Will attempt reconnect in ${this.reconnectInterval}ms`
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.shouldReconnect) return;

      console.log("[TrafficLight] Attempting reconnect...");
      try {
        await this.connect(this.comPort, this.baudRate);
      } catch {
        console.log("[TrafficLight] Reconnect failed, will retry...");
      }
    }, this.reconnectInterval);
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
