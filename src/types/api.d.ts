// Type definitions for the Electron IPC API exposed to the renderer process

export interface ElectronAPI {
  // One-way communication from renderer to main
  send: (channel: string, data?: any) => void;
  
  // Two-way communication from renderer to main and back
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  
  // One-way communication from main to renderer with cleanup
  on: (channel: string, func: (...args: any[]) => void) => () => void;
}

// Agent update types
export interface AgentUpdate {
  type: 'research_update' | 'coding_update' | 'routing_update' | 'error';
  data: any;
  timestamp?: number;
}

// Canvas command types
export interface CanvasCommand {
  command: 'add' | 'modify' | 'remove' | 'noop';
  object?: any;
  targetId?: string;
  reasoning?: string;
}

// MCP status types
export interface MCPStatus {
  status: 'running' | 'stopped' | 'error';
  message: string;
}

// Consent request types for HITL (Human-in-the-Loop)
export interface ConsentRequest {
  id: string;
  type: 'file_access' | 'api_call' | 'code_execution' | 'data_export';
  description: string;
  details: {
    action: string;
    target?: string;
    risks?: string[];
  };
  timestamp: number;
}

export interface ConsentResponse {
  requestId: string;
  approved: boolean;
  timestamp: number;
}

// Extend the Window interface
declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};