export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  fileName?: string;
  filePath?: string;
  mimeType?: string;
  mode?: 'chat' | 'coding' | 'research';
  thinkingSteps?: string[];
  codeBlocks?: CodeBlock[];
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export interface Model {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'local';
  type: 'api' | 'local';
  description: string;
  contextLength: number;
  isAvailable: boolean;
  isDownloaded?: boolean;
  downloadProgress?: number;
  size?: string;
  tags?: string[];
}

export interface ApiKey {
  id: string;
  provider: string;
  key: string;
  isValid?: boolean;
  validatedAt?: string;
  label?: string;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  path: string;
  type: 'pdf' | 'docx' | 'txt' | 'md' | 'url';
  size: number;
  uploadedAt: string;
  status: 'processing' | 'ready' | 'error';
  chunks?: number;
  collectionId?: string;
  tags?: string[];
}

export interface KnowledgeCollection {
  id: string;
  name: string;
  description: string;
  documents: string[];
  createdAt: string;
  color: string;
  isActive?: boolean;
}

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  tools?: MCPTool[];
  error?: string;
  lastConnected?: string;
  category?: string;
  icon?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface ConversationSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  modelId: string;
  mode: 'chat' | 'coding' | 'research';
  createdAt: string;
  updatedAt: string;
  knowledgeCollectionId?: string;
}

export type ViewType = 'onboarding' | 'chat' | 'rag' | 'mcp' | 'settings' | 'models';

export interface AppState {
  activeView: ViewType;
  hasCompletedOnboarding: boolean;
  selectedModel: Model | null;
  chatMode: 'chat' | 'coding' | 'research';
  activeSessions: ConversationSession[];
  currentSessionId: string | null;
  apiKeys: ApiKey[];
  knowledgeCollections: KnowledgeCollection[];
  knowledgeDocuments: KnowledgeDocument[];
  mcpServers: MCPServer[];
}
