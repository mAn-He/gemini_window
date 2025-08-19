// All APIs are exposed on the window.api object
export interface IElectronAPI {
  sendMessage: (message: string, modelName: string) => Promise<string>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  openFile: () => Promise<string | null>;
  runRagQuery: (filePath: string, query: string) => Promise<{ response?: string; error?: string }>;
  deepResearch: (prompt: string, modelName: string) => Promise<{ answer: string; refinedQuery: string }>;
  
  // New: default web-search chat with citations
  chatWithWeb: (message: string, modelName: string) => Promise<{ answer: string; citations: { title: string; url: string; snippet: string }[] }>;
  
  // Canvas APIs
  loadCanvasProject: (projectId: string) => Promise<any>;
  saveCanvasProject: (project: any) => Promise<boolean>;
  updateCanvasNode: (nodeId: string, nodeData: any) => Promise<boolean>;
  
  // MCP APIs
  getMCPServers: () => Promise<any[]>;
  addMCPServer: (serverConfig: any) => Promise<boolean>;
  connectMCPServer: (serverName: string) => Promise<boolean>;
  disconnectMCPServer: (serverName: string) => Promise<boolean>;
  deleteMCPServer: (serverName: string) => Promise<boolean>;
  callMCPTool: (serverName: string, toolName: string, args: any) => Promise<any>;
  getMCPTools: () => Promise<Record<string, Array<{ name: string; description: string }>>>;
  
  // MCP Config APIs
  getMCPConfigPath: () => Promise<string>;
  importMCPConfig: (jsonConfig: string) => Promise<boolean>;
  exportMCPConfig: () => Promise<string>;
  addMCPServerToConfig: (serverName: string, serverConfig: any) => Promise<boolean>;
}

export interface AppSettings {
  // Placeholder to satisfy references in types; actual shape defined elsewhere
  [key: string]: any;
}

declare global {
  interface Window {
    electron: unknown; // Pre-defined by electron-toolkit
    api: IElectronAPI;
  }
} 