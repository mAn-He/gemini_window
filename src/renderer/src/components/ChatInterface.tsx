import React, { useRef, useEffect } from 'react';
import { Bot, Paperclip, Send, X, Plus, ChevronDown, Link, BrainCircuit } from 'lucide-react';
import { ChatMessage } from '../types';

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

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  userInput,
  isLoading,
  isToolsOpen,
  tools,
  setUserInput,
  handleSendMessage,
  setIsToolsOpen,
  attachedFile,
  setAttachedFile,
  isDeepResearchMode,
  setIsDeepResearchMode,
  researchProgress,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [userInput]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileAttach = async () => {
    const filePath = await window.api.openFile();
    if (filePath) {
      const fileName = filePath.split('\\').pop()?.split('/').pop() || 'attached_file';
      setAttachedFile({ path: filePath, name: fileName });
    }
  };

  const handleToolClick = (toolName: string) => {
    if (toolName === 'Deep research') {
      setIsDeepResearchMode(!isDeepResearchMode); // Toggle the mode
      setIsToolsOpen(false);
    }
    // Handle other tools later
  };
  
  // cancelDeepResearch is no longer needed

  return (
    <>
      <div ref={chatContainerRef} className="flex-1 w-full max-w-4xl overflow-y-auto p-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Bot size={48} className="mx-auto mb-4" />
            <h1 className="text-4xl font-bold">What can I help with?</h1>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'ai' && <Bot size={24} className="flex-shrink-0" />}
                <div className={`p-4 rounded-lg max-w-xl ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>
                  {msg.fileName && (
                    <div className="mb-2 p-2 bg-gray-600 rounded-md flex items-center gap-2">
                      <Paperclip size={16} />
                      <span>{msg.fileName}</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}

            {/* Show research progress */}
            {researchProgress.length > 0 && (
              <div className="flex items-start gap-4">
                <BrainCircuit size={24} className="flex-shrink-0 text-blue-400 animate-pulse" />
                <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-400/30">
                  <div className="space-y-2">
                    {researchProgress.map((step, index) => (
                      <div key={index} className="text-blue-200 text-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isLoading && researchProgress.length === 0 && (
              <div className="flex items-start gap-4">
                <Bot size={24} className="flex-shrink-0" />
                <div className="p-4 rounded-lg bg-gray-700">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-full max-w-3xl p-4">
        <div className="flex flex-col gap-2">
          {/* The entire isDeepResearchMode block for the URL input is removed */}
          
          {attachedFile && (
            <div className="p-2 bg-gray-600 rounded-md flex items-center gap-2">
              <Paperclip size={16} />
              <span>{attachedFile.name}</span>
            </div>
          )}

          <div className="relative">
            <button 
              onClick={handleFileAttach}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-600 rounded-full transition-colors"
            >
              <Paperclip size={18} />
            </button>
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, or attach a file"
              className="w-full bg-[#2F2F2F] rounded-xl py-3 pl-12 pr-16 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-48 overflow-y-auto"
              rows={1}
              disabled={isLoading}
            />
            <button 
              onClick={handleSendMessage} 
              disabled={isLoading || (!userInput.trim() && !attachedFile)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-full hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>

          <div className="relative flex items-center">
            <div className="relative">
              <button 
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className="flex items-center space-x-1 p-2 bg-gray-600 rounded-md hover:bg-gray-500 text-sm"
              >
                {isDeepResearchMode ? 
                  <BrainCircuit size={16} className="text-blue-400" /> : 
                  <Plus size={16} />
                }
                <span>Tools</span>
                <ChevronDown size={16} />
              </button>
              {isToolsOpen && (
                <div className="absolute bottom-full mb-2 w-48 bg-[#121212] rounded-md shadow-lg z-10">
                  {tools.map((tool) => {
                    const isDeepResearch = tool.name === 'Deep research';
                    const isActive = isDeepResearch && isDeepResearchMode;
                    return (
                      <button
                        key={tool.name}
                        onClick={() => handleToolClick(tool.name)}
                        className="flex items-center space-x-2 w-full text-left p-2 hover:bg-gray-700"
                      >
                        {/* Clone the icon to add conditional styling */}
                        {React.cloneElement(tool.icon, { className: isActive ? 'text-blue-400' : '' })}
                        <span className={isActive ? 'text-blue-400' : ''}>{tool.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {isDeepResearchMode && (
              <span className="ml-4 text-sm text-blue-400 font-semibold">Deep Research Mode is ON</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatInterface; 