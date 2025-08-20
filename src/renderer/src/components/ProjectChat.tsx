import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, Loader } from 'lucide-react';
import { useAppStore, ChatMessage } from '../../store/useAppStore';

interface ProjectChatProps {
  projectId: string;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({ projectId }) => {
  const {
    projectMessages,
    isProjectLoading,
    sendMessageToActiveProject
  } = useAppStore(state => ({
    projectMessages: state.projectMessages[state.activeProjectId || ''] || [],
    isProjectLoading: state.isProjectLoading,
    sendMessageToActiveProject: state.sendMessageToActiveProject,
  }));

  const [userInput, setUserInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [projectMessages]);


  const handleSendMessage = () => {
    if (userInput.trim() && !isProjectLoading) {
      sendMessageToActiveProject(userInput.trim());
      setUserInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-700">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {projectMessages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && <Bot className="w-6 h-6 text-white flex-shrink-0" />}
            <div
              className={`p-3 rounded-lg max-w-lg break-words ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300'
              }`}
            >
              {msg.content}
            </div>
             {msg.role === 'user' && <User className="w-6 h-6 text-white flex-shrink-0" />}
          </div>
        ))}
        {isProjectLoading && projectMessages[projectMessages.length-1]?.role === 'user' && (
            <div className="flex items-start gap-3">
                <Bot className="w-6 h-6 text-white flex-shrink-0" />
                <div className="p-3 rounded-lg bg-gray-800 text-gray-300">
                    <Loader className="w-5 h-5 animate-spin" />
                </div>
            </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-600">
        <div className="relative">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the project..."
            disabled={isProjectLoading}
            className="w-full p-3 pr-12 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={isProjectLoading || !userInput.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-full hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
