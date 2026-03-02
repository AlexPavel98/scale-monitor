import { contextBridge, ipcRenderer } from "electron";

export interface PortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  vendorId?: string;
  productId?: string;
}

export interface WeightData {
  weight: number;
  stable: boolean;
  raw: string;
}

export interface StatusData {
  status: "connected" | "disconnected" | "error";
  error?: string;
}

contextBridge.exposeInMainWorld("electronScale", {
  /**
   * Connect to a serial port with the given settings.
   */
  connect: (
    port: string,
    baudRate: number
  ): Promise<void> => {
    return ipcRenderer.invoke("scale:connect", port, baudRate);
  },

  /**
   * Disconnect from the currently connected serial port.
   */
  disconnect: (): Promise<void> => {
    return ipcRenderer.invoke("scale:disconnect");
  },

  /**
   * List all available serial ports.
   */
  listPorts: (): Promise<PortInfo[]> => {
    return ipcRenderer.invoke("scale:list-ports");
  },

  /**
   * Subscribe to weight updates from the scale.
   * Returns a cleanup function to remove the listener.
   */
  onWeightUpdate: (callback: (data: WeightData) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: WeightData) => {
      callback(data);
    };
    ipcRenderer.on("scale:weight", handler);
    return () => {
      ipcRenderer.removeListener("scale:weight", handler);
    };
  },

  /**
   * Subscribe to connection status changes.
   * Returns a cleanup function to remove the listener.
   */
  onStatusChange: (callback: (data: StatusData) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: StatusData) => {
      callback(data);
    };
    ipcRenderer.on("scale:status", handler);
    return () => {
      ipcRenderer.removeListener("scale:status", handler);
    };
  },
});
