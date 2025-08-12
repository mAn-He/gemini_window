import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Power, 
  PowerOff, 
  Settings as SettingsIcon, 
  Info, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Plug,
  Server,
  Wrench,
  Database,
  Globe,
  Mail,
  FileText,
  ChevronRight,
  ChevronDown,
  Copy,
  ExternalLink,
  Upload,
  Download,
  FolderOpen,
  Code
} from 'lucide-react';

interface MCPServer {
  name: string;
  description: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  tools?: any[];
  resources?: any[];
  error?: string;
  lastConnected?: string;
}

interface MCPManagerProps {
  onConnectionStatusChange: (status: Record<string, 'connected' | 'disconnected' | 'connecting'>) => void;
  onServersChange: (servers: MCPServer[]) => void;
}

const MCPManager: React.FC<MCPManagerProps> = ({ 
  onConnectionStatusChange, 
  onServersChange 
}) => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configText, setConfigText] = useState('');
  const [configPath, setConfigPath] = useState('');
  
  // 새 서버 추가 폼 상태
  const [newServer, setNewServer] = useState({
    name: '',
    description: '',
    command: '',
    args: '',
    env: ''
  });

  // 사전 정의된 MCP 서버 템플릿
  const serverTemplates = [
    {
      name: 'Obsidian',
      description: 'Connect to Obsidian vault for note management',
      command: 'obsidian-mcp-server',
      args: [],
      icon: <FileText size={20} className="text-purple-400" />
    },
    {
      name: 'Gmail',
      description: 'Access Gmail emails and compose messages',
      command: 'gmail-mcp-server',
      args: [],
      icon: <Mail size={20} className="text-red-400" />
    },
    {
      name: 'Supabase',
      description: 'Database operations with Supabase',
      command: 'npx',
      args: ['@supabase-community/supabase-mcp'],
      icon: <Database size={20} className="text-green-400" />
    },
    {
      name: 'N8N',
      description: 'Workflow automation with N8N',
      command: 'npx',
      args: ['@guinness77/n8n-mcp-server'],
      icon: <SettingsIcon size={20} className="text-blue-400" />
    },
    {
      name: 'Web Search',
      description: 'Search the web for information',
      command: 'web-search-mcp-server',
      args: [],
      icon: <Globe size={20} className="text-orange-400" />
    }
  ];

  useEffect(() => {
    loadMCPServers();
  }, []);

  useEffect(() => {
    // 상태 변경을 부모 컴포넌트에 알림
    const statusMap: Record<string, 'connected' | 'disconnected' | 'connecting'> = {};
    servers.forEach(server => {
      if (server.status !== 'error') {
        statusMap[server.name] = server.status;
      }
    });
    onConnectionStatusChange(statusMap);
    onServersChange(servers);
  }, [servers, onConnectionStatusChange, onServersChange]);

  // 저장된 MCP 서버 목록 로드
  const loadMCPServers = async () => {
    try {
      const savedServers = await window.api.getMCPServers();
      setServers(savedServers || []);
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    }
  };

  // 서버 연결
  const connectServer = async (serverName: string) => {
    setServers(prev => prev.map(server => 
      server.name === serverName 
        ? { ...server, status: 'connecting', error: undefined }
        : server
    ));

    try {
      await window.api.connectMCPServer(serverName);
      setServers(prev => prev.map(server => 
        server.name === serverName 
          ? { ...server, status: 'connected', lastConnected: new Date().toISOString() }
          : server
      ));
    } catch (error: any) {
      setServers(prev => prev.map(server => 
        server.name === serverName 
          ? { ...server, status: 'error', error: error.message }
          : server
      ));
    }
  };

  // 서버 연결 해제
  const disconnectServer = async (serverName: string) => {
    try {
      await window.api.disconnectMCPServer(serverName);
      setServers(prev => prev.map(server => 
        server.name === serverName 
          ? { ...server, status: 'disconnected' }
          : server
      ));
    } catch (error: any) {
      console.error('Failed to disconnect server:', error);
    }
  };

  // 서버 추가
  const addServer = async () => {
    if (!newServer.name || !newServer.command) return;

    const server: MCPServer = {
      name: newServer.name,
      description: newServer.description,
      command: newServer.command,
      args: newServer.args ? newServer.args.split(' ').filter(Boolean) : [],
      env: newServer.env ? JSON.parse(newServer.env) : {},
      status: 'disconnected'
    };

    try {
      await window.api.addMCPServer(server);
      setServers(prev => [...prev, server]);
      setIsAddingServer(false);
      setNewServer({
        name: '',
        description: '',
        command: '',
        args: '',
        env: ''
      });
    } catch (error: any) {
      console.error('Failed to add server:', error);
    }
  };

  // 템플릿에서 서버 추가
  const addFromTemplate = (template: any) => {
    setNewServer({
      name: template.name,
      description: template.description,
      command: template.command,
      args: template.args.join(' '),
      env: '{}'
    });
    setIsAddingServer(true);
  };

  // 서버 삭제
  const deleteServer = async (serverName: string) => {
    try {
      await window.api.deleteMCPServer(serverName);
      setServers(prev => prev.filter(server => server.name !== serverName));
    } catch (error: any) {
      console.error('Failed to delete server:', error);
    }
  };

  // 서버 확장/축소
  const toggleServerExpanded = (serverName: string) => {
    setExpandedServers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serverName)) {
        newSet.delete(serverName);
      } else {
        newSet.add(serverName);
      }
      return newSet;
    });
  };

  // Load config path on mount
  useEffect(() => {
    const loadConfigPath = async () => {
      try {
        const path = await window.api.getMCPConfigPath();
        setConfigPath(path);
      } catch (error) {
        console.error('Error loading config path:', error);
      }
    };
    loadConfigPath();
  }, []);

  // Config 관련 함수들
  const handleExportConfig = async () => {
    try {
      const configJson = await window.api.exportMCPConfig();
      setConfigText(configJson);
      setShowConfigModal(true);
    } catch (error) {
      console.error('Error exporting config:', error);
      alert('Failed to export config');
    }
  };

  const handleImportConfig = async () => {
    try {
      await window.api.importMCPConfig(configText);
      setShowConfigModal(false);
      setConfigText('');
      // Reload servers
      loadServers();
      alert('Config imported successfully! Servers are being reconnected.');
    } catch (error) {
      console.error('Error importing config:', error);
      alert('Failed to import config: ' + error);
    }
  };

  const handleShowConfigModal = async () => {
    try {
      const configJson = await window.api.exportMCPConfig();
      setConfigText(configJson);
      setShowConfigModal(true);
    } catch (error) {
      console.error('Error loading config:', error);
      setConfigText('{\n  "mcpServers": {\n    \n  }\n}');
      setShowConfigModal(true);
    }
  };

  // 상태 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'connecting':
        return <Clock size={16} className="text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertTriangle size={16} className="text-red-500" />;
      default:
        return <PowerOff size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="w-full h-full bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Info & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-400">
              Manage Model Context Protocol servers and integrations
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Config file: {configPath}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleShowConfigModal}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title="Edit JSON Config"
            >
              <Code size={16} />
              <span>JSON Config</span>
            </button>
            <button
              onClick={() => loadMCPServers()}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title="Refresh"
            >
              <Plug size={16} />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={() => setIsAddingServer(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus size={20} />
              <span>Add Server</span>
            </button>
          </div>
        </div>

        {/* Connected Servers quick view */}
        {servers.some(s => s.status === 'connected') && (
          <div className="mb-6">
            <h2 className="text-sm text-gray-400 mb-2">Connected</h2>
            <div className="flex flex-wrap gap-2">
              {servers.filter(s => s.status === 'connected').map(s => (
                <span key={s.name} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Server Templates */}
        {!isAddingServer && servers.length === 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Quick Start Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serverTemplates.map((template) => (
                <div
                  key={template.name}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                  onClick={() => addFromTemplate(template)}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    {template.icon}
                    <h3 className="font-semibold">{template.name}</h3>
                  </div>
                  <p className="text-sm text-gray-400">{template.description}</p>
                  <div className="mt-3 flex items-center text-xs text-blue-400">
                    <Plus size={14} className="mr-1" />
                    <span>Add to project</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Server Form */}
        {isAddingServer && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Add New MCP Server</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Server Name *
                </label>
                <input
                  type="text"
                  value={newServer.name}
                  onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Obsidian"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Command *
                </label>
                <input
                  type="text"
                  value={newServer.command}
                  onChange={(e) => setNewServer(prev => ({ ...prev, command: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., obsidian-mcp-server"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newServer.description}
                  onChange={(e) => setNewServer(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this server"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Arguments
                </label>
                <input
                  type="text"
                  value={newServer.args}
                  onChange={(e) => setNewServer(prev => ({ ...prev, args: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="--arg1 value1 --arg2 value2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Environment Variables (JSON)
                </label>
                <input
                  type="text"
                  value={newServer.env}
                  onChange={(e) => setNewServer(prev => ({ ...prev, env: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder='{"API_KEY": "your-key"}'
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={addServer}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Add Server
              </button>
              <button
                onClick={() => setIsAddingServer(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Server List */}
        <div className="space-y-4">
          {servers.map((server) => (
            <div
              key={server.name}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
            >
              {/* Server Header */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleServerExpanded(server.name)}
                      className="text-gray-400 hover:text-white"
                    >
                      {expandedServers.has(server.name) ? 
                        <ChevronDown size={20} /> : 
                        <ChevronRight size={20} />
                      }
                    </button>
                    
                    <Server size={20} className="text-blue-400" />
                    
                    <div>
                      <h3 className="font-semibold">{server.name}</h3>
                      {server.description && (
                        <p className="text-sm text-gray-400">{server.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(server.status)}
                    
                    <div className="flex space-x-2">
                      {server.status === 'connected' ? (
                        <button
                          onClick={() => disconnectServer(server.name)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded"
                          title="Disconnect"
                        >
                          <PowerOff size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => connectServer(server.name)}
                          className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded"
                          title="Connect"
                        >
                          <Power size={16} />
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteServer(server.name)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Error Message */}
                {server.error && (
                  <div className="mt-3 p-2 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
                    <AlertTriangle size={14} className="inline mr-2" />
                    {server.error}
                  </div>
                )}
              </div>
              
              {/* Expanded Content */}
              {expandedServers.has(server.name) && (
                <div className="border-t border-gray-700 p-4 bg-gray-850">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Server Info */}
                    <div>
                      <h4 className="font-medium mb-2 text-gray-300">Configuration</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Command:</span>
                          <code className="bg-gray-700 px-2 py-1 rounded text-gray-300">
                            {server.command}
                          </code>
                        </div>
                        {server.args && server.args.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Arguments:</span>
                            <code className="bg-gray-700 px-2 py-1 rounded text-gray-300">
                              {server.args.join(' ')}
                            </code>
                          </div>
                        )}
                        {server.lastConnected && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Last Connected:</span>
                            <span className="text-gray-300">
                              {new Date(server.lastConnected).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Tools & Resources */}
                    <div>
                      <h4 className="font-medium mb-2 text-gray-300">Available Tools</h4>
                      {server.tools && server.tools.length > 0 ? (
                        <div className="space-y-1">
                          {server.tools.slice(0, 3).map((tool, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <Wrench size={14} className="text-blue-400" />
                              <span className="text-gray-300">{tool.name}</span>
                            </div>
                          ))}
                          {server.tools.length > 3 && (
                            <div className="text-sm text-gray-400">
                              +{server.tools.length - 3} more tools
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          {server.status === 'connected' ? 'No tools available' : 'Connect to see tools'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {servers.length === 0 && !isAddingServer && (
          <div className="text-center py-12">
            <Plug size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No MCP Servers</h3>
            <p className="text-gray-500 mb-4">
              Add your first MCP server to start extending your AI assistant's capabilities
            </p>
            <button
              onClick={() => setIsAddingServer(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Add Your First Server
            </button>
          </div>
        )}

        {/* JSON Config Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-4/5 max-w-4xl max-h-4/5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">MCP Configuration (Claude Desktop Style)</h3>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">
                  Edit your MCP server configuration in JSON format. This is similar to Claude Desktop's config file.
                </p>
                <div className="text-xs text-gray-500 bg-gray-700 p-3 rounded mb-4">
                  <p><strong>Example:</strong></p>
                  <pre>{`{
  "mcpServers": {
    "youtube-data-mcp-server": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@smithery/cli@latest", "run", "@icraft2170/youtube-data-mcp-server", "--key", "YOUR_API_KEY"],
      "description": "YouTube Data API MCP Server"
    }
  }
}`}</pre>
                </div>
              </div>
              
              <div className="flex-1 mb-4">
                <textarea
                  value={configText}
                  onChange={(e) => setConfigText(e.target.value)}
                  className="w-full h-full resize-none bg-gray-700 border border-gray-600 rounded p-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Enter your MCP configuration JSON..."
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleImportConfig}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Upload size={16} />
                  <span>Apply Config</span>
                </button>
                
                <button
                  onClick={handleExportConfig}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Download size={16} />
                  <span>Export Current</span>
                </button>
                
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MCPManager; 