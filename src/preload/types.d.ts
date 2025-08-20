// All APIs are exposed on the window.api object
export interface IElectronAPI {
  sendMessage: (message: string, modelName: string) => Promise<string>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  openFile: () => Promise<string | null>; // Kept for potential other uses
  openMediaFile: () => Promise<{ path: string; name: string; mimeType: string; dataUrl?: string } | null>;
  runRagQuery: (filePath: string, query: string) => Promise<{ response?: string; error?: string }>;
  handleMultimodalPrompt: (prompt: string, filePath: string, mimeType: string) => Promise<{ response?: string; error?: string }>;
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

  // Project APIs
  project: {
    create: (name: string) => Promise<{ success: boolean; project?: any; error?: string }>;
    list: () => Promise<{ success: boolean; projects?: any[]; error?: string }>;
    addFile: (projectId: string, filePath: string) => Promise<{ success: boolean; error?: string }>;
    chat: (projectId: string, question: string) => Promise<{ success: boolean; response?: string; error?: string }>;
    openFile: () => Promise<{ success: boolean; filePaths: string[] }>;
  };
}

// Define the Project structure for frontend usage
export interface Project {
  id: string;
  name: string;
  files: string[];
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