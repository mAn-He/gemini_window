import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plug, Plus, Trash2, Power, PowerOff, ChevronDown, ChevronRight,
  CheckCircle, AlertCircle, Clock, Server, Wrench, Globe,
  Code, Database, FileText, Terminal, RefreshCw, Settings,
  Copy, ExternalLink, X, Eye, EyeOff, Info, Loader2,
  Zap, Shield, Activity
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { MCPServer } from '../../types';

interface MCPManagerPageProps {
  servers: MCPServer[];
  onServersChange: (servers: MCPServer[]) => void;
}

const PRESET_SERVERS: Omit<MCPServer, 'id' | 'status'>[] = [
  {
    name: 'Filesystem',
    description: 'Access and manage local files and directories. Read, write, list.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/home/user'],
    category: 'storage',
    tools: [
      { name: 'read_file', description: 'Read contents of a file' },
      { name: 'write_file', description: 'Write content to a file' },
      { name: 'list_directory', description: 'List directory contents' },
      { name: 'search_files', description: 'Search for files matching a pattern' },
    ],
  },
  {
    name: 'Sequential Thinking',
    description: 'Advanced step-by-step reasoning for complex problems.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    category: 'reasoning',
    tools: [
      { name: 'think_step_by_step', description: 'Break complex problems into reasoning steps' },
    ],
  },
  {
    name: 'GitHub',
    description: 'Interact with GitHub repositories, issues, PRs, and code.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' },
    category: 'development',
    tools: [
      { name: 'search_repositories', description: 'Search GitHub repositories' },
      { name: 'get_file_contents', description: 'Get file contents from repository' },
      { name: 'create_issue', description: 'Create a new GitHub issue' },
      { name: 'list_commits', description: 'List repository commits' },
    ],
  },
  {
    name: 'Tavily Search',
    description: 'Real-time web search and content extraction capabilities.',
    command: 'npx',
    args: ['-y', 'tavily-mcp'],
    env: { TAVILY_API_KEY: '' },
    category: 'search',
    tools: [
      { name: 'search', description: 'Search the web for information' },
      { name: 'extract', description: 'Extract content from a URL' },
    ],
  },
  {
    name: 'PostgreSQL',
    description: 'Connect and query PostgreSQL databases.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    env: { DATABASE_URL: '' },
    category: 'database',
    tools: [
      { name: 'query', description: 'Execute a SQL query' },
      { name: 'list_tables', description: 'List all database tables' },
      { name: 'describe_table', description: 'Describe a table schema' },
    ],
  },
  {
    name: 'Puppeteer',
    description: 'Browser automation and web scraping with Puppeteer.',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    category: 'browser',
    tools: [
      { name: 'navigate', description: 'Navigate to a URL' },
      { name: 'screenshot', description: 'Take a webpage screenshot' },
      { name: 'click', description: 'Click on an element' },
      { name: 'fill', description: 'Fill a form field' },
    ],
  },
];

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  storage: { icon: <Database size={14} />, color: 'text-blue-600', bg: 'bg-blue-50' },
  reasoning: { icon: <Zap size={14} />, color: 'text-amber-600', bg: 'bg-amber-50' },
  development: { icon: <Code size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  search: { icon: <Globe size={14} />, color: 'text-purple-600', bg: 'bg-purple-50' },
  database: { icon: <Server size={14} />, color: 'text-orange-600', bg: 'bg-orange-50' },
  browser: { icon: <Globe size={14} />, color: 'text-cyan-600', bg: 'bg-cyan-50' },
};

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  connected: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle size={12} />, label: 'Connected' },
  disconnected: { color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', icon: <PowerOff size={12} />, label: 'Disconnected' },
  connecting: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <Loader2 size={12} className="animate-spin" />, label: 'Connecting...' },
  error: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: <AlertCircle size={12} />, label: 'Error' },
};

const MCPManagerPage: React.FC<MCPManagerPageProps> = ({ servers, onServersChange }) => {
  const [activeTab, setActiveTab] = useState<'servers' | 'marketplace' | 'custom'>('servers');
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingEnv, setEditingEnv] = useState<string | null>(null);
  const [envValues, setEnvValues] = useState<Record<string, Record<string, string>>>({});
  const [visibleEnvKeys, setVisibleEnvKeys] = useState<Record<string, boolean>>({});

  // Custom server form
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [customArgs, setCustomArgs] = useState('');
  const [customEnv, setCustomEnv] = useState('');

  const handleConnect = (serverId: string) => {
    onServersChange(servers.map(s =>
      s.id === serverId ? { ...s, status: 'connecting' } : s
    ));
    setTimeout(() => {
      onServersChange(prev => prev.map(s =>
        s.id === serverId ? { ...s, status: 'connected', lastConnected: new Date().toISOString() } : s
      ));
    }, 1500 + Math.random() * 1000);
  };

  const handleDisconnect = (serverId: string) => {
    onServersChange(servers.map(s =>
      s.id === serverId ? { ...s, status: 'disconnected' } : s
    ));
  };

  const handleDeleteServer = (serverId: string) => {
    onServersChange(servers.filter(s => s.id !== serverId));
  };

  const handleAddPreset = (preset: Omit<MCPServer, 'id' | 'status'>) => {
    const exists = servers.find(s => s.name === preset.name);
    if (exists) return;
    const newServer: MCPServer = {
      ...preset,
      id: uuidv4(),
      status: 'disconnected',
    };
    onServersChange([...servers, newServer]);
    setActiveTab('servers');
  };

  const handleAddCustom = () => {
    if (!customName.trim() || !customCommand.trim()) return;
    let env: Record<string, string> = {};
    if (customEnv.trim()) {
      customEnv.split('\n').forEach(line => {
        const [k, ...v] = line.split('=');
        if (k?.trim()) env[k.trim()] = v.join('=').trim();
      });
    }
    const newServer: MCPServer = {
      id: uuidv4(),
      name: customName.trim(),
      description: customDesc.trim(),
      command: customCommand.trim(),
      args: customArgs.split(' ').filter(a => a.trim()),
      env: Object.keys(env).length > 0 ? env : undefined,
      status: 'disconnected',
      category: 'custom',
    };
    onServersChange([...servers, newServer]);
    setCustomName(''); setCustomDesc(''); setCustomCommand('');
    setCustomArgs(''); setCustomEnv('');
    setShowCustomForm(false);
    setActiveTab('servers');
  };

  const handleSaveEnv = (serverId: string) => {
    const envData = envValues[serverId] || {};
    onServersChange(servers.map(s =>
      s.id === serverId
        ? { ...s, env: { ...(s.env || {}), ...envData } }
        : s
    ));
    setEditingEnv(null);
  };

  const connectedCount = servers.filter(s => s.status === 'connected').length;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Plug size={20} className="text-blue-500" /> MCP Manager
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Model Context Protocol server management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${connectedCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-slate-600">{connectedCount} connected</span>
            </div>
            <button
              onClick={() => { setShowCustomForm(true); setActiveTab('custom'); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              <Plus size={15} /> Add Custom Server
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-4">
          {[
            { id: 'servers', label: 'My Servers', count: servers.length },
            { id: 'marketplace', label: 'Marketplace' },
            { id: 'custom', label: 'Custom Server' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="bg-slate-100 text-slate-500 text-xs rounded-full px-1.5 py-0.5">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* MY SERVERS TAB */}
        {activeTab === 'servers' && (
          <div>
            {servers.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Plug size={40} className="mx-auto mb-4 opacity-20" />
                <p className="text-slate-500 font-medium text-lg">No servers configured</p>
                <p className="text-sm mt-2 mb-6">Add servers from the Marketplace or create a custom one</p>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-all"
                >
                  Browse Marketplace
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {servers.map(server => {
                  const status = statusConfig[server.status];
                  const cat = categoryConfig[server.category || 'storage'];
                  const isExpanded = expandedServer === server.id;
                  const isEditingEnv = editingEnv === server.id;
                  const serverEnvValues = envValues[server.id] || {};

                  return (
                    <motion.div
                      key={server.id}
                      layout
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                    >
                      <div className="p-5">
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-xl ${cat?.bg || 'bg-slate-100'} flex items-center justify-center flex-shrink-0 ${cat?.color || 'text-slate-500'}`}>
                            {cat?.icon || <Server size={18} />}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-800">{server.name}</h3>
                              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                                {status.icon} {status.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5 truncate">{server.description}</p>
                            {server.lastConnected && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                Last connected: {new Date(server.lastConnected).toLocaleString()}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setExpandedServer(isExpanded ? null : server.id)}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            {server.status === 'connected' ? (
                              <button
                                onClick={() => handleDisconnect(server.id)}
                                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-all"
                              >
                                <PowerOff size={14} /> Disconnect
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConnect(server.id)}
                                disabled={server.status === 'connecting'}
                                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-60"
                              >
                                {server.status === 'connecting'
                                  ? <><Loader2 size={14} className="animate-spin" /> Connecting</>
                                  : <><Power size={14} /> Connect</>
                                }
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteServer(server.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50">
                              {/* Command */}
                              <div className="mb-4">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Command</h4>
                                <div className="flex items-center gap-2 bg-slate-900 text-slate-100 rounded-xl px-4 py-3 text-xs font-mono overflow-x-auto">
                                  <Terminal size={12} className="text-slate-400 flex-shrink-0" />
                                  <span>{server.command} {server.args?.join(' ')}</span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(`${server.command} ${server.args?.join(' ')}`)}
                                    className="ml-auto text-slate-500 hover:text-slate-300"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Environment Variables */}
                              {server.env && Object.keys(server.env).length > 0 && (
                                <div className="mb-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Environment Variables</h4>
                                    <button
                                      onClick={() => setEditingEnv(isEditingEnv ? null : server.id)}
                                      className="text-xs text-blue-600 hover:text-blue-700"
                                    >
                                      {isEditingEnv ? 'Cancel' : 'Edit'}
                                    </button>
                                  </div>
                                  <div className="space-y-2">
                                    {Object.entries(server.env).map(([key, val]) => (
                                      <div key={key} className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded min-w-32">{key}</span>
                                        {isEditingEnv ? (
                                          <input
                                            type={visibleEnvKeys[`${server.id}-${key}`] ? 'text' : 'password'}
                                            value={serverEnvValues[key] ?? val}
                                            onChange={e => setEnvValues(prev => ({
                                              ...prev,
                                              [server.id]: { ...(prev[server.id] || {}), [key]: e.target.value }
                                            }))}
                                            className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                            placeholder={`Enter ${key}...`}
                                          />
                                        ) : (
                                          <span className="text-xs text-slate-500 font-mono">
                                            {val ? '••••••••••' : <span className="text-amber-500 italic">Not set</span>}
                                          </span>
                                        )}
                                        {isEditingEnv && (
                                          <button
                                            onClick={() => setVisibleEnvKeys(prev => ({ ...prev, [`${server.id}-${key}`]: !prev[`${server.id}-${key}`] }))}
                                            className="text-slate-400"
                                          >
                                            {visibleEnvKeys[`${server.id}-${key}`] ? <EyeOff size={12} /> : <Eye size={12} />}
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    {isEditingEnv && (
                                      <button
                                        onClick={() => handleSaveEnv(server.id)}
                                        className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg mt-2 hover:bg-blue-700 transition-all"
                                      >
                                        Save Variables
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Tools */}
                              {server.tools && server.tools.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Available Tools ({server.tools.length})</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    {server.tools.map(tool => (
                                      <div key={tool.name} className="flex items-start gap-2 bg-white border border-slate-100 rounded-xl p-3">
                                        <Wrench size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <div className="text-xs font-medium text-slate-700 font-mono">{tool.name}</div>
                                          <div className="text-xs text-slate-400 mt-0.5">{tool.description}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MARKETPLACE TAB */}
        {activeTab === 'marketplace' && (
          <div>
            <div className="grid grid-cols-2 gap-4">
              {PRESET_SERVERS.map(preset => {
                const isAdded = servers.some(s => s.name === preset.name);
                const cat = categoryConfig[preset.category || 'storage'];
                return (
                  <motion.div
                    key={preset.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl ${cat?.bg || 'bg-slate-100'} flex items-center justify-center flex-shrink-0 ${cat?.color || 'text-slate-500'}`}>
                        {cat?.icon || <Server size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-slate-800">{preset.name}</h3>
                          {isAdded && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle size={10} /> Added
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{preset.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {preset.tools?.slice(0, 3).map(tool => (
                        <span key={tool.name} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                          {tool.name}
                        </span>
                      ))}
                      {(preset.tools?.length || 0) > 3 && (
                        <span className="text-xs text-slate-400">+{(preset.tools?.length || 0) - 3} more</span>
                      )}
                    </div>

                    {preset.env && Object.keys(preset.env).length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 mb-3">
                        <Shield size={11} /> Requires: {Object.keys(preset.env).join(', ')}
                      </div>
                    )}

                    <button
                      onClick={() => handleAddPreset(preset)}
                      disabled={isAdded}
                      className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${
                        isAdded
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isAdded ? 'Already Added' : 'Add Server'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* CUSTOM SERVER TAB */}
        {activeTab === 'custom' && (
          <div className="max-w-2xl">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-1">Add Custom MCP Server</h3>
              <p className="text-sm text-slate-400 mb-6">Connect any MCP-compatible server with a custom command</p>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Server Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="My Custom Server"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Description</label>
                    <input
                      type="text"
                      value={customDesc}
                      onChange={e => setCustomDesc(e.target.value)}
                      placeholder="What does this server do?"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Command <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={customCommand}
                    onChange={e => setCustomCommand(e.target.value)}
                    placeholder="e.g., npx, node, python"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Arguments (space-separated)</label>
                  <input
                    type="text"
                    value={customArgs}
                    onChange={e => setCustomArgs(e.target.value)}
                    placeholder="-y @some/mcp-server --port 3000"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Environment Variables (one per line: KEY=value)</label>
                  <textarea
                    value={customEnv}
                    onChange={e => setCustomEnv(e.target.value)}
                    placeholder={"API_KEY=your_key_here\nOTHER_VAR=value"}
                    rows={4}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-mono resize-none"
                  />
                </div>

                {/* Preview */}
                {customCommand && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Command Preview</label>
                    <div className="bg-slate-900 text-slate-100 rounded-xl px-4 py-3 text-xs font-mono flex items-center gap-2">
                      <Terminal size={12} className="text-slate-400" />
                      <span>{customCommand} {customArgs}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setCustomName(''); setCustomDesc(''); setCustomCommand(''); setCustomArgs(''); setCustomEnv(''); }}
                    className="px-4 py-2.5 text-slate-600 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-all"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleAddCustom}
                    disabled={!customName.trim() || !customCommand.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-40"
                  >
                    Add Server
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MCPManagerPage;
