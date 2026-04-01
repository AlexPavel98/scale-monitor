import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { EventEmitter } from "events";

export interface WeightData {
  weight: number;
  stable: boolean;
  raw: string;
}

export interface SerialPortConfig {
  port: string;
  baudRate: number;
  dataBits?: 5 | 6 | 7 | 8;
  parity?: "none" | "even" | "odd" | "mark" | "space";
  stopBits?: 1 | 1.5 | 2;
}

export type ConnectionStatus = "connected" | "disconnected" | "error";

const DEFAULT_WEIGHT_REGEX = /\s*([+-]?\d+\.?\d*)\s*KG/i;
const STABILITY_THRESHOLD = 3; // readings with same weight = stable
const DEFAULT_RECONNECT_INTERVAL = 5000; // ms

export class SerialPortManager extends EventEmitter {
  private serialPort: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private config: SerialPortConfig | null = null;
  private weightRegex: RegExp = DEFAULT_WEIGHT_REGEX;
  private buffer: string = "";

  // Stability detection
  private lastWeight: number | null = null;
  private stableCount: number = 0;

  // Reconnection
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectInterval: number = DEFAULT_RECONNECT_INTERVAL;
  private shouldReconnect: boolean = false;
  private isConnecting: boolean = false;

  constructor(options?: {
    weightRegex?: RegExp;
    reconnectInterval?: number;
  }) {
    super();
    if (options?.weightRegex) {
      this.weightRegex = options.weightRegex;
    }
    if (options?.reconnectInterval) {
      this.reconnectInterval = options.reconnectInterval;
    }
  }

  async connect(
    port: string,
    baudRate: number,
    dataBits: 5 | 6 | 7 | 8 = 8,
    parity: "none" | "even" | "odd" | "mark" | "space" = "none",
    stopBits: 1 | 1.5 | 2 = 1
  ): Promise<void> {
    if (this.isConnecting) {
      throw new Error("Connection already in progress");
    }

    // Disconnect existing connection if any
    if (this.serialPort?.isOpen) {
      await this.disconnect();
    }

    this.isConnecting = true;
    this.config = { port, baudRate, dataBits, parity, stopBits };
    this.shouldReconnect = true;
    this.stopReconnectTimer();

    try {
      this.serialPort = new SerialPort({
        path: port,
        baudRate,
        dataBits,
        parity,
        stopBits,
        autoOpen: false,
      });

      this.parser = new ReadlineParser({ delimiter: "\r" });
      this.serialPort.pipe(this.parser);

      // Set up event handlers
      this.parser.on("data", (line: string) => {
        console.log("[SerialPortManager] RAW LINE:", JSON.stringify(line));
        this.handleData(line);
      });

      // Also log raw bytes for debugging
      this.serialPort.on("data", (buf: Buffer) => {
        console.log("[SerialPortManager] RAW BYTES:", buf.toString("hex"), "=>", JSON.stringify(buf.toString()));
      });

      this.serialPort.on("error", (err: Error) => {
        console.error("[SerialPortManager] Port error:", err.message);
        this.emitStatus("error", err.message);
        this.handleDisconnect();
      });

      this.serialPort.on("close", () => {
        console.log("[SerialPortManager] Port closed");
        this.emitStatus("disconnected");
        this.handleDisconnect();
      });

      // Open the port
      await new Promise<void>((resolve, reject) => {
        this.serialPort!.open((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.isConnecting = false;
      this.resetStability();
      this.buffer = "";
      this.emitStatus("connected");
      console.log(
        `[SerialPortManager] Connected to ${port} at ${baudRate} baud`
      );
    } catch (err) {
      this.isConnecting = false;
      const message = err instanceof Error ? err.message : String(err);
      console.error("[SerialPortManager] Failed to connect:", message);
      this.emitStatus("error", message);
      this.handleDisconnect();
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    this.stopReconnectTimer();

    if (this.serialPort?.isOpen) {
      await new Promise<void>((resolve, reject) => {
        this.serialPort!.close((err) => {
          if (err) {
            // Port may already be closed
            console.warn(
              "[SerialPortManager] Error closing port:",
              err.message
            );
          }
          resolve();
        });
      });
    }

    this.cleanup();
    this.emitStatus("disconnected");
    console.log("[SerialPortManager] Disconnected");
  }

  static async listPorts(): Promise<
    Array<{
      path: string;
      manufacturer?: string;
      serialNumber?: string;
      pnpId?: string;
      vendorId?: string;
      productId?: string;
    }>
  > {
    const ports = await SerialPort.list();
    return ports.map((p) => ({
      path: p.path,
      manufacturer: p.manufacturer,
      serialNumber: p.serialNumber,
      pnpId: p.pnpId,
      vendorId: p.vendorId,
      productId: p.productId,
    }));
  }

  get isConnected(): boolean {
    return this.serialPort?.isOpen ?? false;
  }

  setWeightRegex(regex: RegExp): void {
    this.weightRegex = regex;
  }

  setReconnectInterval(ms: number): void {
    this.reconnectInterval = ms;
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  private handleData(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    const match = trimmed.match(this.weightRegex);
    if (match) {
      const weight = parseFloat(match[1]);
      if (!isNaN(weight)) {
        const stable = this.updateStability(weight);
        const data: WeightData = { weight, stable, raw: trimmed };
        this.emit("weight", data);
      }
    }
  }

  private updateStability(weight: number): boolean {
    if (this.lastWeight !== null && weight === this.lastWeight) {
      this.stableCount++;
    } else {
      this.stableCount = 1;
      this.lastWeight = weight;
    }
    return this.stableCount >= STABILITY_THRESHOLD;
  }

  private resetStability(): void {
    this.lastWeight = null;
    this.stableCount = 0;
  }

  private emitStatus(status: ConnectionStatus, error?: string): void {
    this.emit("status", { status, error });
  }

  private handleDisconnect(): void {
    this.cleanup();
    if (this.shouldReconnect && this.config) {
      this.startReconnectTimer();
    }
  }

  private cleanup(): void {
    if (this.parser) {
      this.parser.removeAllListeners();
      this.parser = null;
    }
    if (this.serialPort) {
      this.serialPort.removeAllListeners();
      this.serialPort = null;
    }
    this.buffer = "";
    this.resetStability();
    this.isConnecting = false;
  }

  private startReconnectTimer(): void {
    if (this.reconnectTimer) return;

    console.log(
      `[SerialPortManager] Will attempt reconnect in ${this.reconnectInterval}ms`
    );

    this.reconnectTimer = setInterval(async () => {
      if (!this.shouldReconnect || !this.config) {
        this.stopReconnectTimer();
        return;
      }

      console.log("[SerialPortManager] Attempting reconnect...");
      try {
        await this.connect(
          this.config.port,
          this.config.baudRate,
          this.config.dataBits,
          this.config.parity,
          this.config.stopBits
        );
        this.stopReconnectTimer();
      } catch {
        console.log("[SerialPortManager] Reconnect failed, will retry...");
      }
    }, this.reconnectInterval);
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
