"use strict";
const electron = require("electron");
const electronAPI = {
  ipcRenderer: {
    send(channel, ...args) {
      electron.ipcRenderer.send(channel, ...args);
    },
    sendTo(webContentsId, channel, ...args) {
      const electronVer = process.versions.electron;
      const electronMajorVer = electronVer ? parseInt(electronVer.split(".")[0]) : 0;
      if (electronMajorVer >= 28) {
        throw new Error('"sendTo" method has been removed since Electron 28.');
      } else {
        electron.ipcRenderer.sendTo(webContentsId, channel, ...args);
      }
    },
    sendSync(channel, ...args) {
      return electron.ipcRenderer.sendSync(channel, ...args);
    },
    sendToHost(channel, ...args) {
      electron.ipcRenderer.sendToHost(channel, ...args);
    },
    postMessage(channel, message, transfer) {
      electron.ipcRenderer.postMessage(channel, message, transfer);
    },
    invoke(channel, ...args) {
      return electron.ipcRenderer.invoke(channel, ...args);
    },
    on(channel, listener) {
      electron.ipcRenderer.on(channel, listener);
      return () => {
        electron.ipcRenderer.removeListener(channel, listener);
      };
    },
    once(channel, listener) {
      electron.ipcRenderer.once(channel, listener);
      return () => {
        electron.ipcRenderer.removeListener(channel, listener);
      };
    },
    removeListener(channel, listener) {
      electron.ipcRenderer.removeListener(channel, listener);
      return this;
    },
    removeAllListeners(channel) {
      electron.ipcRenderer.removeAllListeners(channel);
    }
  },
  webFrame: {
    insertCSS(css) {
      return electron.webFrame.insertCSS(css);
    },
    setZoomFactor(factor) {
      if (typeof factor === "number" && factor > 0) {
        electron.webFrame.setZoomFactor(factor);
      }
    },
    setZoomLevel(level) {
      if (typeof level === "number") {
        electron.webFrame.setZoomLevel(level);
      }
    }
  },
  webUtils: {
    getPathForFile(file) {
      return electron.webUtils.getPathForFile(file);
    }
  },
  process: {
    get platform() {
      return process.platform;
    },
    get versions() {
      return process.versions;
    },
    get env() {
      return { ...process.env };
    }
  }
};
const api = {
  sendMessage: (message, modelName) => electron.ipcRenderer.invoke("send-message", message, modelName),
  getSettings: () => electron.ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => electron.ipcRenderer.invoke("save-settings", settings),
  openFile: () => electron.ipcRenderer.invoke("open-file"),
  processFile: (filePath, prompt) => electron.ipcRenderer.invoke("process-file", filePath, prompt),
  deepResearch: (prompt, modelName) => electron.ipcRenderer.invoke("deep-research", prompt, modelName),
  // Canvas APIs
  loadCanvasProject: (projectId) => electron.ipcRenderer.invoke("load-canvas-project", projectId),
  saveCanvasProject: (project) => electron.ipcRenderer.invoke("save-canvas-project", project),
  updateCanvasNode: (nodeId, nodeData) => electron.ipcRenderer.invoke("update-canvas-node", nodeId, nodeData),
  // MCP APIs
  getMCPServers: () => electron.ipcRenderer.invoke("get-mcp-servers"),
  addMCPServer: (serverConfig) => electron.ipcRenderer.invoke("add-mcp-server", serverConfig),
  connectMCPServer: (serverName) => electron.ipcRenderer.invoke("connect-mcp-server", serverName),
  disconnectMCPServer: (serverName) => electron.ipcRenderer.invoke("disconnect-mcp-server", serverName),
  deleteMCPServer: (serverName) => electron.ipcRenderer.invoke("delete-mcp-server", serverName),
  callMCPTool: (serverName, toolName, args) => electron.ipcRenderer.invoke("call-mcp-tool", serverName, toolName, args),
  // MCP Config APIs
  getMCPConfigPath: () => electron.ipcRenderer.invoke("get-mcp-config-path"),
  importMCPConfig: (jsonConfig) => electron.ipcRenderer.invoke("import-mcp-config", jsonConfig),
  exportMCPConfig: () => electron.ipcRenderer.invoke("export-mcp-config"),
  addMCPServerToConfig: (serverName, serverConfig) => electron.ipcRenderer.invoke("add-mcp-server-to-config", serverName, serverConfig)
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
