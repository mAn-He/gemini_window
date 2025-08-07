import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Library, Gem, Settings as SettingsIcon, ChevronDown, Bot, BrainCircuit, ScanSearch, PencilRuler, Send, FileUp, Paperclip, X, Palette as CanvasIcon, Plug, Layers, Users, ArrowLeft } from 'lucide-react';
import Settings from './components/Settings';
import { ChatMessage } from './types';
import { v4 as uuidv4 } from 'uuid';
import ChatInterface from './components/ChatInterface';
import CanvasEngine from './components/Canvas/CanvasEngine';
import MCPManager from './components/MCP/MCPManager';
import { motion } from 'framer-motion';

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
  const [activeView, setActiveView] = useState<'chat' | 'canvas' | 'mcp' | 'settings'>('chat');
  
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
  
  const tools = [
    { name: 'Deep research', icon: <BrainCircuit size={18} /> },
    { name: 'Canvas', icon: <PencilRuler size={18} /> },
    { name: 'Web search', icon: <ScanSearch size={18} /> },
  ];

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
        aiResponseText = await window.api.processFile(attachedFile.path, userInput);
        setAttachedFile(null);
      } else {
        aiResponseText = await window.api.sendMessage(userInput, currentModelName);
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
  const handleViewChange = (view: 'chat' | 'canvas' | 'mcp' | 'settings') => {
    setActiveView(view);
  };

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
        <div className="flex-1 overflow-hidden">
          {activeView === 'chat' && (
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
            />
          )}
          
          {activeView === 'canvas' && (
            <CanvasEngine
              projectId={currentProjectId}
              onAIRequest={handleCanvasAIRequest}
              onSave={(project) => {
                console.log('Canvas project saved:', project);
              }}
            />
          )}
          
          {activeView === 'mcp' && (
            <MCPManager
              onConnectionStatusChange={setMcpConnectionStatus}
              onServersChange={setMcpServers}
            />
          )}
          
          {activeView === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
};

export default App; 