import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IElectronAPI, AppSettings } from './types'

// Custom APIs for renderer
const api: IElectronAPI = {
  sendMessage: (message: string, modelName: string) => ipcRenderer.invoke('send-message', message, modelName),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke('save-settings', settings),
  openFile: () => ipcRenderer.invoke('open-file'),
  openMediaFile: () => ipcRenderer.invoke('openMediaFile'),
  runRagQuery: (filePath: string, query: string) => ipcRenderer.invoke('run-rag-query', filePath, query),
  handleMultimodalPrompt: (prompt: string, filePath: string, mimeType: string) => ipcRenderer.invoke('handle-multimodal-prompt', prompt, filePath, mimeType),
  deepResearch: (prompt: string, modelName: string) => ipcRenderer.invoke('deep-research', prompt, modelName),
  
  // New: default chat with web search & citations
  chatWithWeb: (message: string, modelName: string) => ipcRenderer.invoke('chat-with-web', message, modelName),
  
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
  getMCPTools: () => ipcRenderer.invoke('get-mcp-tools'),
  
  // MCP Config APIs
  getMCPConfigPath: () => ipcRenderer.invoke('get-mcp-config-path'),
  importMCPConfig: (jsonConfig: string) => ipcRenderer.invoke('import-mcp-config', jsonConfig),
  exportMCPConfig: () => ipcRenderer.invoke('export-mcp-config'),
  addMCPServerToConfig: (serverName: string, serverConfig: any) => ipcRenderer.invoke('add-mcp-server-to-config', serverName, serverConfig)
}

contextBridge.exposeInMainWorld('api', api)
contextBridge.exposeInMainWorld('electron', electronAPI) 