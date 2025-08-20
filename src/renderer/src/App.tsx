import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Library, Gem, Settings as SettingsIcon, ChevronDown, Bot, BrainCircuit, ScanSearch, PencilRuler, Send, FileUp, Paperclip, X, Palette as CanvasIcon, Plug, Layers, Users, ArrowLeft } from 'lucide-react';
import Settings from './components/Settings';
import { ChatMessage } from './types';
import { v4 as uuidv4 } from 'uuid';
import ChatInterface from './components/ChatInterface';
import CanvasEngine from './components/Canvas/CanvasEngine';
import MCPManager from './components/MCP/MCPManager';
import { motion } from 'framer-motion';
import { ProjectSidebar } from './components/ProjectSidebar';
import { ProjectView } from './components/ProjectView';
import { FolderKanban } from 'lucide-react';

// Define props for the ChatInterface component
interface ChatInterfaceProps {
  messages: ChatMessage[];
  userInput: string;
  isLoading: boolean;
  isToolsOpen: boolean;
  tools: { name: string; icon: JSX.Element }[];
  setUserInput: (input: string) => void;
  handleSendMessage: () => void;
  setIsToolsOpen: (isOpen: boolean) => void;
  attachedFile: { path: string; name: string } | null;
  setAttachedFile: (file: { path: string; name: string } | null) => void;
  isDeepResearchMode: boolean;
  setIsDeepResearchMode: (isMode: boolean) => void;
  researchProgress: string[];
}

const App: React.FC = () => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<'pro' | 'flash'>('pro');
  const [activeView, setActiveView] = useState<'chat' | 'canvas' | 'mcp' | 'settings' | 'projects'>('chat');
  const [showCanvasPane, setShowCanvasPane] = useState<boolean>(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ path: string; name: string } | null>(null);
  const [isDeepResearchMode, setIsDeepResearchMode] = useState(false);
  const [researchProgress, setResearchProgress] = useState<string[]>([]);

  // Canvas 관련 상태
  const [currentProjectId, setCurrentProjectId] = useState<string>('default-project');
  
  // MCP 관련 상태
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [mcpConnectionStatus, setMcpConnectionStatus] = useState<Record<string, 'connected' | 'disconnected' | 'connecting'>>({});
  const [mcpTools, setMcpTools] = useState<Record<string, Array<{ name: string; description: string }>>>({});
  const [showConsent, setShowConsent] = useState<{ server?: string; tool?: string } | null>(null);
  
  const tools = [
    { name: 'Deep research', icon: <BrainCircuit size={18} /> },
    { name: 'Canvas', icon: <PencilRuler size={18} /> },
    { name: 'Web search', icon: <ScanSearch size={18} /> },
    // MCP tools will be appended dynamically below in the dropdown
  ];

  useEffect(() => {
    const loadTools = async () => {
      try {
        const grouped = await window.api.getMCPTools();
        setMcpTools(grouped || {});
      } catch (e) {
        console.warn('Unable to load MCP tools (maybe no servers connected yet).');
      }
    };
    loadTools();
  }, [activeView]);

  const handleToolInvokeMCP = async (server: string, tool: string) => {
    // simple first-use consent stub
    if (showConsent && showConsent.server === server && showConsent.tool === tool) {
      setShowConsent(null);
    } else {
      setShowConsent({ server, tool });
      return;
    }

    try {
      const args = userInput ? { query: userInput } : {};
      const result = await window.api.callMCPTool(server, tool, args);
      const text = typeof result?.content?.[0]?.text === 'string' ? result.content[0].text : JSON.stringify(result);
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        text,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        text: `MCP tool call failed: ${error}`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    }
  };

  const spring = {
    type: "spring",
    stiffness: 700,
    damping: 30
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() && !attachedFile) return;
    
    const modelMap = {
      pro: 'gemini-2.5-pro',
      flash: 'gemini-2.5-flash'
    };
    const currentModelName = modelMap[activeModel];

    const userMessage: ChatMessage = {
      id: uuidv4(),
      text: userInput,
      sender: 'user',
      timestamp: new Date().toISOString(),
      fileName: attachedFile?.name,
      filePath: attachedFile?.path,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setResearchProgress([]);

    try {
      let aiResponseText = '';
      if (isDeepResearchMode) {
        setResearchProgress(['🔍 Planning research strategy...']);
        
        const result = await window.api.deepResearch(userInput, currentModelName);

        setResearchProgress(['✅ Research completed successfully']);

        const refinedQueryMessage: ChatMessage = {
          id: uuidv4(),
          text: `🔍 Research Query: "${result.refinedQuery}"`,
          sender: 'ai',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, refinedQueryMessage]);

        aiResponseText = result.answer;

      } else if (attachedFile) {
        if (attachedFile.mimeType?.startsWith('image/') || attachedFile.mimeType?.startsWith('audio/')) {
          const result = await window.api.handleMultimodalPrompt(userInput, attachedFile.path, attachedFile.mimeType);
          aiResponseText = result.response || `Error: ${result.error}`;
        } else {
          // Fallback to RAG service for other file types
          const result = await window.api.runRagQuery(attachedFile.path, userInput);
          aiResponseText = result.response || `Error: ${result.error}`;
        }
        setAttachedFile(null);
      } else {
        const result = await window.api.chatWithWeb(userInput, currentModelName);
        const refs = (result.citations || [])
          .map((c, idx) => `- [${idx + 1}] ${c.title} (${c.url})\n  ${c.snippet}`)
          .join('\n');
        aiResponseText = refs ? `${result.answer}\n\nReferences:\n${refs}` : result.answer;
      }

      const aiMessage: ChatMessage = {
        id: uuidv4(),
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        text: 'Sorry, there was an error processing your request.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setResearchProgress([]);
    }
  };

  const handleFileAttach = async () => {
    try {
      const filePath = await window.api.openFile();
      if (filePath) {
        const fileName = filePath.split(/[/\\]/).pop() || 'Unknown file';
        setAttachedFile({ path: filePath, name: fileName });
      }
    } catch (error) {
      console.error('Error attaching file:', error);
    }
  };

  // Canvas AI 요청 처리
  const handleCanvasAIRequest = async (request: string): Promise<string> => {
    try {
      const response = await window.api.sendMessage(request, activeModel === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash');
      return response;
    } catch (error) {
      console.error('Canvas AI request failed:', error);
      return 'AI 요청 처리 중 오류가 발생했습니다.';
    }
  };

  // 뷰 변경 핸들러
  const handleViewChange = (view: 'chat' | 'canvas' | 'mcp' | 'settings' | 'projects') => {
    if (view === 'canvas') {
      // open inline canvas pane instead of navigating away
      setShowCanvasPane(true);
      setActiveView('chat');
      return;
    }
    // For other views, just set the active view
    setActiveView(view);
  };

  // The main return statement needs to decide whether to show the "Project" view
  // or the original tabbed view.
  if (activeView === 'projects') {
    return (
      <div className="flex h-screen bg-gray-900 text-white">
        <ProjectSidebar />
        <ProjectView />
      </div>
    );
  }

  // Original view for 'chat', 'canvas', 'mcp', 'settings'
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Gemini Desktop</h1>
          <p className="text-sm text-gray-400">AI Research Assistant</p>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
             {/* Projects Button */}
             <button
              onClick={() => handleViewChange('projects')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                activeView === 'projects' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <FolderKanban size={20} />
              <span>Projects</span>
            </button>

            {/* Chat */}
            <button
              onClick={() => handleViewChange('chat')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                activeView === 'chat' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Bot size={20} />
              <span>Chat</span>
            </button>
            
            {/* Canvas */}
            <button
              onClick={() => handleViewChange('canvas')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                activeView === 'canvas' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <CanvasIcon size={20} />
              <span>Canvas</span>
            </button>
            
            {/* MCP */}
            <button
              onClick={() => handleViewChange('mcp')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                activeView === 'mcp' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Plug size={20} />
              <span>MCP Servers</span>
              {Object.keys(mcpConnectionStatus).length > 0 && (
                <div className="ml-auto flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs">{Object.keys(mcpConnectionStatus).length}</span>
                </div>
              )}
            </button>
            
            {/* Settings */}
            <button
              onClick={() => handleViewChange('settings')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                activeView === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <SettingsIcon size={20} />
              <span>Settings</span>
            </button>
          </div>
          
          {/* Project Info */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Current Project</h3>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Layers size={16} className="text-blue-400" />
                <span className="text-sm">Default Project</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">ID: {currentProjectId}</p>
            </div>
          </div>
          
          {/* Connected MCP Servers */}
          {Object.keys(mcpConnectionStatus).length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Connected Servers</h3>
              <div className="space-y-1">
                {Object.entries(mcpConnectionStatus).map(([serverName, status]) => (
                  <div key={serverName} className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      status === 'connected' ? 'bg-green-500' :
                      status === 'connecting' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></div>
                    <span className="text-gray-300">{serverName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Header Bar */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          {/* Left Side - Back Button & View Title */}
          <div className="flex items-center space-x-4">
            {activeView !== 'chat' && (
              <button
                onClick={() => handleViewChange('chat')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to Chat"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-lg font-semibold text-white">
              {activeView === 'chat' && 'Chat'}
              {activeView === 'canvas' && 'Gemini Canvas'}
              {activeView === 'mcp' && 'MCP Connections'}
              {activeView === 'settings' && 'Settings'}
            </h2>
          </div>

          {/* Right Side - Model Selector (only for chat and canvas) */}
          {(activeView === 'chat' || activeView === 'canvas') && (
            <div 
              className="w-64 h-10 bg-gray-700 rounded-full flex items-center p-1 cursor-pointer relative"
              onClick={() => setActiveModel(activeModel === 'pro' ? 'flash' : 'pro')}
            >
              <motion.div 
                className="w-1/2 h-full bg-blue-600 rounded-full" 
                layout 
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
                initial={false}
                animate={{ x: activeModel === 'pro' ? '0%' : '100%' }}
              />
              <div className="absolute w-full h-full flex justify-around items-center">
                <span className={`font-semibold text-sm z-10 ${activeModel === 'pro' ? 'text-white' : 'text-gray-400'}`}>
                  Gemini 2.5 Pro
                </span>
                <span className={`font-semibold text-sm z-10 ${activeModel === 'flash' ? 'text-white' : 'text-gray-400'}`}>
                  Gemini 2.5 Flash
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto relative flex">
          {activeView === 'chat' && (
            <>
              {/* Left: Chat */}
              <div className={`flex-1 min-w-0 ${showCanvasPane ? 'border-r border-gray-800' : ''}`}>
                <ChatInterface
                  messages={messages}
                  userInput={userInput}
                  isLoading={isLoading}
                  isToolsOpen={isToolsOpen}
                  tools={tools}
                  setUserInput={setUserInput}
                  handleSendMessage={handleSendMessage}
                  setIsToolsOpen={setIsToolsOpen}
                  attachedFile={attachedFile}
                  setAttachedFile={setAttachedFile}
                  isDeepResearchMode={isDeepResearchMode}
                  setIsDeepResearchMode={setIsDeepResearchMode}
                  researchProgress={researchProgress}
                  onSelectCanvas={() => setShowCanvasPane(true)}
                />
              </div>

              {/* Right: Inline Canvas Pane */}
              {showCanvasPane && (
                <div className="w-[45%] min-w-[380px] max-w-[900px] h-full">
                  <CanvasEngine
                    projectId={currentProjectId}
                    onAIRequest={handleCanvasAIRequest}
                    onSave={(project) => {
                      console.log('Canvas project saved:', project);
                    }}
                  />
                </div>
              )}

              {/* Floating MCP tool list when Tools is open */}
              {isToolsOpen && Object.keys(mcpTools).length > 0 && (
                <div className="absolute left-6 bottom-48 w-80 bg-[#121212] rounded-md shadow-lg z-30 border border-gray-800 p-2">
                  <div className="text-xs text-gray-400 px-1 pb-1">MCP Tools</div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {Object.entries(mcpTools).map(([server, tools]) => (
                      <div key={server} className="">
                        <div className="px-2 py-1 text-xs text-gray-500">{server}</div>
                        {tools.map(t => (
                          <button
                            key={`${server}:${t.name}`}
                            onClick={() => handleToolInvokeMCP(server, t.name)}
                            className="w-full text-left px-2 py-1 rounded hover:bg-gray-700 text-sm text-gray-200"
                            title={t.description}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Canvas standalone view removed in favor of inline pane */}
          
          {activeView === 'mcp' && (
            <MCPManager
              onConnectionStatusChange={setMcpConnectionStatus}
              onServersChange={setMcpServers}
            />
          )}
          
          {activeView === 'settings' && <Settings />}
        </div>

        {/* Consent modal for MCP tool (simple) */}
        {showConsent && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-2">Allow MCP Tool</h3>
              <p className="text-sm text-gray-300 mb-4">Allow tool "{showConsent.tool}" on server "{showConsent.server}" to run with your current input?</p>
              <div className="flex justify-end space-x-2">
                <button className="px-3 py-2 bg-gray-600 rounded" onClick={() => setShowConsent(null)}>Cancel</button>
                <button className="px-3 py-2 bg-blue-600 rounded" onClick={() => handleToolInvokeMCP(showConsent.server!, showConsent.tool!)}>Allow</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App; 