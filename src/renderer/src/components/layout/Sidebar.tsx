import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, BookOpen, Plug, Settings, Cpu,
  ChevronLeft, ChevronRight, Plus, Search, Bot,
  Code2, Globe, Sparkles, Zap, ChevronDown, ChevronUp,
  Hash, Clock, Database
} from 'lucide-react';
import { ViewType, ConversationSession, MCPServer, Model } from '../../types';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  sessions: ConversationSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  mcpServers: MCPServer[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  selectedModel: Model;
  chatMode: 'chat' | 'coding' | 'research';
}

const navItems = [
  { id: 'chat' as ViewType, label: 'Chat & Agents', icon: MessageSquare, description: 'Chat, Coding & Research' },
  { id: 'rag' as ViewType, label: 'Knowledge Base', icon: BookOpen, description: 'RAG & Documents' },
  { id: 'mcp' as ViewType, label: 'MCP Manager', icon: Plug, description: 'Model Context Protocol' },
  { id: 'models' as ViewType, label: 'Models', icon: Cpu, description: 'Local & API Models' },
  { id: 'settings' as ViewType, label: 'Settings', icon: Settings, description: 'Configuration' },
];

const modeIcons = {
  chat: Bot,
  coding: Code2,
  research: Globe,
};

const modeColors = {
  chat: 'text-blue-500',
  coding: 'text-emerald-500',
  research: 'text-purple-500',
};

const providerColors: Record<string, string> = {
  gemini: 'bg-blue-500',
  openai: 'bg-emerald-500',
  anthropic: 'bg-orange-500',
  ollama: 'bg-purple-500',
  local: 'bg-gray-500',
};

const Sidebar: React.FC<SidebarProps> = ({
  activeView, onViewChange, sessions, currentSessionId,
  onSelectSession, onNewSession, mcpServers, collapsed,
  onToggleCollapse, selectedModel, chatMode
}) => {
  const [sessionsExpanded, setSessionsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const connectedServers = mcpServers.filter(s => s.status === 'connected');
  const recentSessions = sessions
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const filteredSessions = searchQuery
    ? recentSessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : recentSessions;

  const ModeIcon = modeIcons[chatMode];

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col bg-white border-r border-slate-200 shadow-sm relative overflow-hidden flex-shrink-0"
    >
      {/* Logo / Header */}
      <div className="flex items-center px-4 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
          <Sparkles size={16} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="ml-3 min-w-0"
            >
              <h1 className="text-sm font-bold text-slate-800 truncate">LLM Desktop</h1>
              <p className="text-xs text-slate-400 truncate">AI Workspace</p>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onToggleCollapse}
          className="ml-auto p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-3 border-b border-slate-100">
        <button
          onClick={() => { onNewSession(); onViewChange('chat'); }}
          className={`flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <Plus size={16} className="flex-shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="px-3 py-3 border-b border-slate-100">
        {!collapsed && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Navigation</p>}
        <div className="space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
                {!collapsed && (
                  <div className="min-w-0 text-left">
                    <div className="truncate">{item.label}</div>
                  </div>
                )}
                {!collapsed && item.id === 'mcp' && connectedServers.length > 0 && (
                  <span className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full px-1.5 py-0.5">
                    {connectedServers.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Active Model Status */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Active Model</p>
          <div className="bg-slate-50 rounded-lg px-3 py-2 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${providerColors[selectedModel.provider]}`} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-700 truncate">{selectedModel.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <ModeIcon size={10} className={modeColors[chatMode]} />
                <span className="text-xs text-slate-400 capitalize">{chatMode} mode</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <button
            onClick={() => setSessionsExpanded(!sessionsExpanded)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1 hover:text-slate-600 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Clock size={11} />
              <span>Recent Chats</span>
            </div>
            {sessionsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {sessionsExpanded && (
            <>
              {sessions.length > 3 && (
                <div className="mb-2 relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 text-slate-700"
                  />
                </div>
              )}
              <div className="space-y-0.5">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-4 text-slate-400">
                    <MessageSquare size={20} className="mx-auto mb-1 opacity-40" />
                    <p className="text-xs">No chats yet</p>
                  </div>
                ) : (
                  filteredSessions.map(session => {
                    const Icon = modeIcons[session.mode] || Bot;
                    const isCurrentSession = session.id === currentSessionId;
                    return (
                      <button
                        key={session.id}
                        onClick={() => onSelectSession(session.id)}
                        className={`flex items-center gap-2 w-full rounded-lg px-2 py-2 text-xs transition-all text-left group ${
                          isCurrentSession
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                      >
                        <Icon size={13} className="flex-shrink-0 opacity-70" />
                        <span className="truncate flex-1">{session.title || 'Untitled Chat'}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer status */}
      {!collapsed && connectedServers.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{connectedServers.length} MCP server{connectedServers.length > 1 ? 's' : ''} connected</span>
          </div>
        </div>
      )}
    </motion.aside>
  );
};

export default Sidebar;
