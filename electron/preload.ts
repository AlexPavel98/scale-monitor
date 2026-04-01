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
   * Get the current connection status (for when the renderer loads after connection).
   */
  getStatus: (): Promise<StatusData> => {
    return ipcRenderer.invoke("scale:get-status");
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

contextBridge.exposeInMainWorld("electronTrafficLight", {
  connect: (host: string, port: number): Promise<void> => {
    return ipcRenderer.invoke("trafficLight:connect", host, port);
  },

  disconnect: (): Promise<void> => {
    return ipcRenderer.invoke("trafficLight:disconnect");
  },

  setRed: (): Promise<void> => {
    return ipcRenderer.invoke("trafficLight:setRed");
  },

  setGreen: (): Promise<void> => {
    return ipcRenderer.invoke("trafficLight:setGreen");
  },

  allOff: (): Promise<void> => {
    return ipcRenderer.invoke("trafficLight:allOff");
  },

  setGreenThenOff: (delay?: number): Promise<void> => {
    return ipcRenderer.invoke("trafficLight:setGreenThenOff", delay);
  },

  onStatusChange: (callback: (data: StatusData) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: StatusData) => {
      callback(data);
    };
    ipcRenderer.on("trafficLight:status", handler);
    return () => {
      ipcRenderer.removeListener("trafficLight:status", handler);
    };
  },

  onAutoChange: (callback: (data: { state: "red" | "green" }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { state: "red" | "green" }) => {
      callback(data);
    };
    ipcRenderer.on("trafficLight:auto", handler);
    return () => {
      ipcRenderer.removeListener("trafficLight:auto", handler);
    };
  },
});

contextBridge.exposeInMainWorld("electronKiosk", {
  connect: (
    host: string,
    displayPort: number,
    keyboardPort: number
  ): Promise<void> => {
    return ipcRenderer.invoke("kiosk:connect", host, displayPort, keyboardPort);
  },

  disconnect: (): Promise<void> => {
    return ipcRenderer.invoke("kiosk:disconnect");
  },

  sendDisplay: (line1: string, line2?: string): Promise<void> => {
    return ipcRenderer.invoke("kiosk:sendDisplay", line1, line2);
  },

  showReady: (): Promise<void> => {
    return ipcRenderer.invoke("kiosk:showReady");
  },

  showWeight: (kg: number): Promise<void> => {
    return ipcRenderer.invoke("kiosk:showWeight", kg);
  },

  showWait: (): Promise<void> => {
    return ipcRenderer.invoke("kiosk:showWait");
  },

  onKey: (
    callback: (data: { key: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { key: string }
    ) => {
      callback(data);
    };
    ipcRenderer.on("kiosk:key", handler);
    return () => {
      ipcRenderer.removeListener("kiosk:key", handler);
    };
  },

  onSubmit: (
    callback: (data: { cardNumber: string; weight: number }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { cardNumber: string; weight: number }
    ) => {
      callback(data);
    };
    ipcRenderer.on("kiosk:submit", handler);
    return () => {
      ipcRenderer.removeListener("kiosk:submit", handler);
    };
  },

  onStatusChange: (callback: (data: StatusData) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: StatusData) => {
      callback(data);
    };
    ipcRenderer.on("kiosk:status", handler);
    return () => {
      ipcRenderer.removeListener("kiosk:status", handler);
    };
  },
});
