import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IElectronAPI, AppSettings } from './types'

// Custom APIs for renderer
const api: IElectronAPI = {
  sendMessage: (message: string, modelName: string) => ipcRenderer.invoke('send-message', message, modelName),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke('save-settings', settings),
  openFile: () => ipcRenderer.invoke('open-file'),
  processFile: (filePath: string, prompt: string) => ipcRenderer.invoke('process-file', filePath, prompt),
  deepResearch: (prompt: string, modelName: string) => ipcRenderer.invoke('deep-research', prompt, modelName),
  
  // Canvas APIs
  loadCanvasProject: (projectId: string) => ipcRenderer.invoke('load-canvas-project', projectId),
  saveCanvasProject: (project: any) => ipcRenderer.invoke('save-canvas-project', project),
  updateCanvasNode: (nodeId: string, nodeData: any) => ipcRenderer.invoke('update-canvas-node', nodeId, nodeData),
  
  // MCP APIs
  getMCPServers: () => ipcRenderer.invoke('get-mcp-servers'),
  addMCPServer: (serverConfig: any) => ipcRenderer.invoke('add-mcp-server', serverConfig),
  connectMCPServer: (serverName: string) => ipcRenderer.invoke('connect-mcp-server', serverName),
  disconnectMCPServer: (serverName: string) => ipcRenderer.invoke('disconnect-mcp-server', serverName),
  deleteMCPServer: (serverName: string) => ipcRenderer.invoke('delete-mcp-server', serverName),
  callMCPTool: (serverName: string, toolName: string, args: any) => ipcRenderer.invoke('call-mcp-tool', serverName, toolName, args),
  
  // MCP Config APIs
  getMCPConfigPath: () => ipcRenderer.invoke('get-mcp-config-path'),
  importMCPConfig: (jsonConfig: string) => ipcRenderer.invoke('import-mcp-config', jsonConfig),
  exportMCPConfig: () => ipcRenderer.invoke('export-mcp-config'),
  addMCPServerToConfig: (serverName: string, serverConfig: any) => ipcRenderer.invoke('add-mcp-server-to-config', serverName, serverConfig)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
} 