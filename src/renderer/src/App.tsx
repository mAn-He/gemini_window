import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/layout/Sidebar';
import OnboardingPage from './components/pages/OnboardingPage';
import ChatWorkspace from './components/pages/ChatWorkspace';
import RAGDashboard from './components/pages/RAGDashboard';
import MCPManagerPage from './components/pages/MCPManagerPage';
import SettingsPage from './components/pages/SettingsPage';
import ModelsPage from './components/pages/ModelsPage';
import { ViewType, Model, ApiKey, KnowledgeCollection, KnowledgeDocument, MCPServer, ConversationSession } from './types';

const defaultModels: Model[] = [
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    type: 'api',
    description: 'Most capable Gemini model for complex reasoning tasks',
    contextLength: 1000000,
    isAvailable: true,
    tags: ['reasoning', 'multimodal', 'coding'],
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    type: 'api',
    description: 'Fast and efficient Gemini model',
    contextLength: 1000000,
    isAvailable: true,
    tags: ['fast', 'multimodal'],
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    type: 'api',
    description: 'OpenAI multimodal flagship model',
    contextLength: 128000,
    isAvailable: false,
    tags: ['reasoning', 'multimodal', 'coding'],
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    type: 'api',
    description: 'Anthropic model with strong coding capabilities',
    contextLength: 200000,
    isAvailable: false,
    tags: ['coding', 'reasoning', 'writing'],
  },
  {
    id: 'gemma-3-4b',
    name: 'Gemma 3 4B',
    provider: 'ollama',
    type: 'local',
    description: 'Google lightweight model, runs locally',
    contextLength: 128000,
    isAvailable: true,
    isDownloaded: false,
    size: '2.5 GB',
    tags: ['local', 'fast', 'efficient'],
  },
  {
    id: 'phi-4',
    name: 'Phi-4',
    provider: 'ollama',
    type: 'local',
    description: 'Microsoft small but capable language model',
    contextLength: 16000,
    isAvailable: true,
    isDownloaded: false,
    size: '8.9 GB',
    tags: ['local', 'coding', 'reasoning'],
  },
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    provider: 'ollama',
    type: 'local',
    description: 'Meta compact and fast local model',
    contextLength: 128000,
    isAvailable: true,
    isDownloaded: false,
    size: '2.0 GB',
    tags: ['local', 'fast'],
  },
];

const defaultMCPServers: MCPServer[] = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Access and manage local files and directories',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/home/user'],
    status: 'disconnected',
    category: 'storage',
    tools: [
      { name: 'read_file', description: 'Read contents of a file' },
      { name: 'write_file', description: 'Write content to a file' },
      { name: 'list_directory', description: 'List directory contents' },
    ],
  },
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking',
    description: 'Advanced step-by-step reasoning for complex problems',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    status: 'disconnected',
    category: 'reasoning',
    tools: [
      { name: 'think_step_by_step', description: 'Break down problem into reasoning steps' },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Interact with GitHub repositories, issues, and PRs',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' },
    status: 'disconnected',
    category: 'development',
    tools: [
      { name: 'search_repositories', description: 'Search GitHub repositories' },
      { name: 'get_file_contents', description: 'Get file contents from repo' },
      { name: 'create_issue', description: 'Create a GitHub issue' },
    ],
  },
  {
    id: 'tavily',
    name: 'Tavily Search',
    description: 'Real-time web search and research capabilities',
    command: 'npx',
    args: ['-y', 'tavily-mcp'],
    env: { TAVILY_API_KEY: '' },
    status: 'disconnected',
    category: 'search',
    tools: [
      { name: 'search', description: 'Search the web for information' },
      { name: 'extract', description: 'Extract content from a URL' },
    ],
  },
];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('onboarding');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<Model>(defaultModels[0]);
  const [models, setModels] = useState<Model[]>(defaultModels);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [chatMode, setChatMode] = useState<'chat' | 'coding' | 'research'>('chat');
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [knowledgeCollections, setKnowledgeCollections] = useState<KnowledgeCollection[]>([]);
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>([]);
  // Wrapper that supports both array and functional updates
  const handleDocumentsChange = (docsOrUpdater: KnowledgeDocument[] | ((prev: KnowledgeDocument[]) => KnowledgeDocument[])) => {
    if (typeof docsOrUpdater === 'function') {
      setKnowledgeDocuments(docsOrUpdater);
    } else {
      setKnowledgeDocuments(docsOrUpdater);
    }
  };
  const [mcpServers, setMcpServers] = useState<MCPServer[]>(defaultMCPServers);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check onboarding status from localStorage
  useEffect(() => {
    const completed = localStorage.getItem('llm_onboarding_completed');
    const savedKeys = localStorage.getItem('llm_api_keys');
    const savedSessions = localStorage.getItem('llm_sessions');
    const savedCollections = localStorage.getItem('llm_collections');
    const savedDocs = localStorage.getItem('llm_documents');
    const savedMCPServers = localStorage.getItem('llm_mcp_servers');
    const savedModels = localStorage.getItem('llm_models');

    if (completed === 'true') {
      setHasCompletedOnboarding(true);
      setActiveView('chat');
    }
    if (savedKeys) {
      try { setApiKeys(JSON.parse(savedKeys)); } catch (e) {}
    }
    if (savedSessions) {
      try { setSessions(JSON.parse(savedSessions)); } catch (e) {}
    }
    if (savedCollections) {
      try { setKnowledgeCollections(JSON.parse(savedCollections)); } catch (e) {}
    }
    if (savedDocs) {
      try { setKnowledgeDocuments(JSON.parse(savedDocs)); } catch (e) {}
    }
    if (savedMCPServers) {
      try {
        const saved = JSON.parse(savedMCPServers);
        setMcpServers(saved);
      } catch (e) {}
    }
    if (savedModels) {
      try { setModels(JSON.parse(savedModels)); } catch (e) {}
    }
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    if (apiKeys.length > 0) localStorage.setItem('llm_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem('llm_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (knowledgeCollections.length > 0) localStorage.setItem('llm_collections', JSON.stringify(knowledgeCollections));
  }, [knowledgeCollections]);

  useEffect(() => {
    if (knowledgeDocuments.length > 0) localStorage.setItem('llm_documents', JSON.stringify(knowledgeDocuments));
  }, [knowledgeDocuments]);

  useEffect(() => {
    localStorage.setItem('llm_mcp_servers', JSON.stringify(mcpServers));
  }, [mcpServers]);

  useEffect(() => {
    localStorage.setItem('llm_models', JSON.stringify(models));
  }, [models]);

  const handleOnboardingComplete = (keys: ApiKey[]) => {
    setApiKeys(keys);
    setHasCompletedOnboarding(true);
    localStorage.setItem('llm_onboarding_completed', 'true');
    setActiveView('chat');
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setActiveView('chat');
  };

  const pageVariants = {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 },
  };

  const renderView = () => {
    switch (activeView) {
      case 'onboarding':
        return (
          <OnboardingPage
            onComplete={handleOnboardingComplete}
            models={models}
            onModelsChange={setModels}
          />
        );
      case 'chat':
        return (
          <ChatWorkspace
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            models={models}
            chatMode={chatMode}
            onChatModeChange={setChatMode}
            sessions={sessions}
            onSessionsChange={setSessions}
            currentSessionId={currentSessionId}
            onCurrentSessionChange={setCurrentSessionId}
            knowledgeCollections={knowledgeCollections}
            mcpServers={mcpServers}
            apiKeys={apiKeys}
          />
        );
      case 'rag':
        return (
          <RAGDashboard
            documents={knowledgeDocuments}
            onDocumentsChange={handleDocumentsChange as any}
            collections={knowledgeCollections}
            onCollectionsChange={setKnowledgeCollections}
            selectedModel={selectedModel}
            onChatWithCollection={(collectionId) => {
              setActiveView('chat');
            }}
          />
        );
      case 'mcp':
        return (
          <MCPManagerPage
            servers={mcpServers}
            onServersChange={setMcpServers}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            apiKeys={apiKeys}
            onApiKeysChange={setApiKeys}
            onResetOnboarding={() => {
              localStorage.removeItem('llm_onboarding_completed');
              setHasCompletedOnboarding(false);
              setActiveView('onboarding');
            }}
          />
        );
      case 'models':
        return (
          <ModelsPage
            models={models}
            onModelsChange={setModels}
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
          />
        );
      default:
        return null;
    }
  };

  if (activeView === 'onboarding' && !hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <OnboardingPage
          onComplete={handleOnboardingComplete}
          models={models}
          onModelsChange={setModels}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        mcpServers={mcpServers}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        selectedModel={selectedModel}
        chatMode={chatMode}
      />
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
