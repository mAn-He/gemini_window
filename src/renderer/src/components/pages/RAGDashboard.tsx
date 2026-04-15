import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Upload, FileText, Trash2, Search, Plus, ChevronDown,
  CheckCircle, AlertCircle, Loader2, FolderOpen, X, FileUp,
  Database, Zap, Settings, Globe, Tag, MessageSquare,
  ExternalLink, RefreshCw, ChevronRight, Layers, Hash, Cpu
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { KnowledgeDocument, KnowledgeCollection, Model } from '../../types';

interface RAGDashboardProps {
  documents: KnowledgeDocument[];
  onDocumentsChange: (docs: KnowledgeDocument[]) => void;
  collections: KnowledgeCollection[];
  onCollectionsChange: (cols: KnowledgeCollection[]) => void;
  selectedModel: Model;
  onChatWithCollection: (collectionId: string) => void;
}

const COLLECTION_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'
];

const documentTypeIcons: Record<string, React.ReactNode> = {
  pdf: <FileText size={14} className="text-red-500" />,
  docx: <FileText size={14} className="text-blue-500" />,
  txt: <FileText size={14} className="text-slate-500" />,
  md: <FileText size={14} className="text-purple-500" />,
  url: <Globe size={14} className="text-emerald-500" />,
};

const statusColors: Record<string, string> = {
  processing: 'text-amber-600 bg-amber-50 border-amber-200',
  ready: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  error: 'text-red-600 bg-red-50 border-red-200',
};

const statusIcons: Record<string, React.ReactNode> = {
  processing: <Loader2 size={11} className="animate-spin" />,
  ready: <CheckCircle size={11} />,
  error: <AlertCircle size={11} />,
};

const RAGDashboard: React.FC<RAGDashboardProps> = ({
  documents, onDocumentsChange, collections, onCollectionsChange,
  selectedModel, onChatWithCollection,
}) => {
  const [activeTab, setActiveTab] = useState<'collections' | 'documents' | 'settings'>('collections');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState(COLLECTION_COLORS[0]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(64);
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-004');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCollection = collections.find(c => c.id === selectedCollectionId);
  const collectionDocs = selectedCollectionId
    ? documents.filter(d => d.collectionId === selectedCollectionId)
    : documents;
  const filteredDocs = searchQuery
    ? collectionDocs.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : collectionDocs;

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    const col: KnowledgeCollection = {
      id: uuidv4(),
      name: newCollectionName.trim(),
      description: newCollectionDesc.trim(),
      documents: [],
      createdAt: new Date().toISOString(),
      color: newCollectionColor,
    };
    onCollectionsChange([...collections, col]);
    setNewCollectionName('');
    setNewCollectionDesc('');
    setShowNewCollection(false);
    setSelectedCollectionId(col.id);
  };

  const handleDeleteCollection = (id: string) => {
    onCollectionsChange(collections.filter(c => c.id !== id));
    if (selectedCollectionId === id) setSelectedCollectionId(null);
    onDocumentsChange(documents.filter(d => d.collectionId !== id));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newDocs: KnowledgeDocument[] = Array.from(files).map(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() as KnowledgeDocument['type'] || 'txt';
      const doc: KnowledgeDocument = {
        id: uuidv4(),
        name: file.name,
        path: file.name,
        type: ext,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'processing',
        collectionId: selectedCollectionId || undefined,
        tags: [],
      };
      // Simulate processing
      setTimeout(() => {
        onDocumentsChange(prev =>
          prev.map(d => d.id === doc.id ? { ...d, status: 'ready', chunks: Math.floor(file.size / 400) + 5 } : d)
        );
      }, 2000 + Math.random() * 2000);
      return doc;
    });
    onDocumentsChange([...documents, ...newDocs]);
  };

  const handleUrlAdd = () => {
    if (!urlInput.trim()) return;
    const doc: KnowledgeDocument = {
      id: uuidv4(),
      name: urlInput.trim(),
      path: urlInput.trim(),
      type: 'url',
      size: 0,
      uploadedAt: new Date().toISOString(),
      status: 'processing',
      collectionId: selectedCollectionId || undefined,
      tags: [],
    };
    onDocumentsChange([...documents, doc]);
    setUrlInput('');
    setShowUrlInput(false);
    setTimeout(() => {
      onDocumentsChange(prev =>
        prev.map(d => d.id === doc.id ? { ...d, status: 'ready', chunks: 42, size: 15000 } : d)
      );
    }, 3000);
  };

  const handleDeleteDocument = (id: string) => {
    onDocumentsChange(documents.filter(d => d.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Left sidebar - Collections */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Layers size={15} className="text-blue-500" /> Collections
            </h2>
            <button
              onClick={() => setShowNewCollection(true)}
              className="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* "All Documents" option */}
          <button
            onClick={() => setSelectedCollectionId(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              !selectedCollectionId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Database size={14} className={!selectedCollectionId ? 'text-blue-500' : 'text-slate-400'} />
            <span>All Documents</span>
            <span className="ml-auto text-xs text-slate-400">{documents.length}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {collections.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FolderOpen size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">No collections yet</p>
              <p className="text-xs mt-1">Create one to organize your documents</p>
            </div>
          ) : (
            <div className="space-y-1">
              {collections.map(col => {
                const docCount = documents.filter(d => d.collectionId === col.id).length;
                const isSelected = selectedCollectionId === col.id;
                return (
                  <div key={col.id} className="group relative">
                    <button
                      onClick={() => setSelectedCollectionId(isSelected ? null : col.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                        isSelected ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: col.color }}
                      />
                      <span className="flex-1 truncate">{col.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">{docCount}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(col.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all rounded"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BookOpen size={20} className="text-blue-500" />
                {selectedCollection ? selectedCollection.name : 'Knowledge Base'}
              </h1>
              {selectedCollection && (
                <p className="text-sm text-slate-500 mt-0.5">{selectedCollection.description || 'No description'}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedCollectionId && (
                <button
                  onClick={() => onChatWithCollection(selectedCollectionId)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
                >
                  <MessageSquare size={14} /> Chat with Collection
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-3">
            {[
              { label: 'Documents', value: collectionDocs.length },
              { label: 'Ready', value: collectionDocs.filter(d => d.status === 'ready').length },
              { label: 'Total Chunks', value: collectionDocs.reduce((acc, d) => acc + (d.chunks || 0), 0) },
              { label: 'Processing', value: collectionDocs.filter(d => d.status === 'processing').length },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-lg font-bold text-slate-800">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 px-6">
          <div className="flex gap-6">
            {[
              { id: 'collections', label: 'Documents', icon: FileText },
              { id: 'settings', label: 'RAG Settings', icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'collections' && (
            <div>
              {/* Upload Area */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragOver(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-all cursor-pointer ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.txt,.md,.docx"
                  onChange={e => handleFileUpload(e.target.files)}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Upload size={22} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Drop files here or click to upload</p>
                    <p className="text-sm text-slate-400 mt-1">Supports PDF, DOCX, TXT, Markdown</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={e => { e.stopPropagation(); setShowUrlInput(!showUrlInput); }}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Globe size={12} /> Add URL
                    </button>
                  </div>
                </div>
              </div>

              {/* URL input */}
              <AnimatePresence>
                {showUrlInput && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-3">
                      <Globe size={16} className="text-slate-400 flex-shrink-0 mt-2" />
                      <input
                        type="url"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        placeholder="https://example.com/document"
                        className="flex-1 text-sm focus:outline-none text-slate-700 placeholder-slate-400"
                        onKeyDown={e => e.key === 'Enter' && handleUrlAdd()}
                      />
                      <button
                        onClick={handleUrlAdd}
                        disabled={!urlInput.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                      >
                        Add
                      </button>
                      <button onClick={() => setShowUrlInput(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search */}
              {documents.length > 0 && (
                <div className="relative mb-4">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
                  />
                </div>
              )}

              {/* Documents List */}
              {filteredDocs.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Database size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-slate-500 font-medium">No documents yet</p>
                  <p className="text-sm mt-1">Upload documents to start building your knowledge base</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocs.map(doc => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-slate-300 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {documentTypeIcons[doc.type] || <FileText size={14} className="text-slate-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-700 truncate">{doc.name}</span>
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${statusColors[doc.status]}`}>
                            {statusIcons[doc.status]}
                            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          <span>{formatFileSize(doc.size)}</span>
                          {doc.chunks && <span>{doc.chunks} chunks</span>}
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          {doc.collectionId && (
                            <span className="flex items-center gap-1">
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: collections.find(c => c.id === doc.collectionId)?.color || '#94a3b8' }}
                              />
                              {collections.find(c => c.id === doc.collectionId)?.name}
                            </span>
                          )}
                        </div>
                      </div>
                      {doc.status === 'processing' && (
                        <div className="w-20">
                          <div className="bg-slate-100 rounded-full h-1.5">
                            <motion.div
                              className="bg-amber-500 h-1.5 rounded-full"
                              animate={{ width: ['20%', '80%', '20%'] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <Cpu size={16} className="text-blue-500" /> Embedding Configuration
                </h3>
                <p className="text-sm text-slate-400 mb-4">Configure how documents are chunked and embedded into vectors</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Embedding Model</label>
                    <select
                      value={embeddingModel}
                      onChange={e => setEmbeddingModel(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 bg-white"
                    >
                      <option value="text-embedding-004">Google text-embedding-004 (Recommended)</option>
                      <option value="text-embedding-3-small">OpenAI text-embedding-3-small</option>
                      <option value="text-embedding-3-large">OpenAI text-embedding-3-large</option>
                      <option value="nomic-embed">Nomic Embed (Local)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      Chunk Size: <span className="text-blue-600">{chunkSize} tokens</span>
                    </label>
                    <input
                      type="range"
                      min={128}
                      max={2048}
                      step={64}
                      value={chunkSize}
                      onChange={e => setChunkSize(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>128 (precise)</span>
                      <span>2048 (broad)</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      Chunk Overlap: <span className="text-blue-600">{chunkOverlap} tokens</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={512}
                      step={16}
                      value={chunkOverlap}
                      onChange={e => setChunkOverlap(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <Database size={16} className="text-purple-500" /> Vector Store
                </h3>
                <p className="text-sm text-slate-400 mb-4">Configure the vector database for storing embeddings</p>
                <div className="space-y-3">
                  {[
                    { id: 'chroma', name: 'ChromaDB', desc: 'Local vector store (Default)', status: 'active' },
                    { id: 'pinecone', name: 'Pinecone', desc: 'Cloud-hosted, scalable', status: 'inactive' },
                    { id: 'qdrant', name: 'Qdrant', desc: 'Local or cloud deployment', status: 'inactive' },
                  ].map(store => (
                    <div
                      key={store.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        store.status === 'active' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      } transition-all`}
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-700">{store.name}</div>
                        <div className="text-xs text-slate-400">{store.desc}</div>
                      </div>
                      {store.status === 'active' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Active</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" /> Retrieval Settings
                </h3>
                <p className="text-sm text-slate-400 mb-4">Configure how context is retrieved for queries</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Top K Results</label>
                    <input
                      type="number"
                      defaultValue={5}
                      min={1}
                      max={20}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Similarity Threshold</label>
                    <input
                      type="number"
                      defaultValue={0.75}
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-blue-600" />
                    <span className="text-sm text-slate-600">Enable MMR (Maximal Marginal Relevance) for diversity</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-blue-600" />
                    <span className="text-sm text-slate-600">Re-rank results with cross-encoder</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded accent-blue-600" />
                    <span className="text-sm text-slate-600">Enable HyDE (Hypothetical Document Embeddings)</span>
                  </label>
                </div>
                <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all">
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Collection Modal */}
      <AnimatePresence>
        {showNewCollection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewCollection(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4">New Collection</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Name</label>
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={e => setNewCollectionName(e.target.value)}
                    placeholder="e.g., AI Research Papers"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Description (optional)</label>
                  <textarea
                    value={newCollectionDesc}
                    onChange={e => setNewCollectionDesc(e.target.value)}
                    placeholder="A brief description of this collection..."
                    rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Color</label>
                  <div className="flex gap-2">
                    {COLLECTION_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewCollectionColor(color)}
                        className={`w-7 h-7 rounded-full transition-all ${newCollectionColor === color ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewCollection(false)}
                  className="flex-1 py-2.5 text-slate-600 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-40"
                >
                  Create Collection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RAGDashboard;
