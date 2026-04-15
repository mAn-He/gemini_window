import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, Cloud, Download, CheckCircle, Trash2, Search, Filter,
  Zap, BookOpen, Code2, Globe, Star, HardDrive, Wifi, WifiOff,
  RefreshCw, Activity, Info, ExternalLink, Plus
} from 'lucide-react';
import { Model } from '../../types';

interface ModelsPageProps {
  models: Model[];
  onModelsChange: (models: Model[]) => void;
  selectedModel: Model;
  onModelSelect: (model: Model) => void;
}

const providerMeta: Record<string, { label: string; color: string; bg: string; border: string; icon: string; textColor: string }> = {
  gemini: { label: 'Google Gemini', color: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', icon: '✦', textColor: 'text-blue-600' },
  openai: { label: 'OpenAI', color: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '⊕', textColor: 'text-emerald-600' },
  anthropic: { label: 'Anthropic', color: 'bg-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', icon: '◆', textColor: 'text-orange-600' },
  ollama: { label: 'Local / Ollama', color: 'bg-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', icon: '⬡', textColor: 'text-purple-600' },
  local: { label: 'Local', color: 'bg-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: '⬡', textColor: 'text-gray-600' },
};

const tagColors: Record<string, string> = {
  reasoning: 'bg-blue-100 text-blue-600',
  multimodal: 'bg-purple-100 text-purple-600',
  coding: 'bg-emerald-100 text-emerald-600',
  fast: 'bg-amber-100 text-amber-600',
  local: 'bg-slate-100 text-slate-600',
  efficient: 'bg-cyan-100 text-cyan-600',
  writing: 'bg-pink-100 text-pink-600',
};

const ModelsPage: React.FC<ModelsPageProps> = ({ models, onModelsChange, selectedModel, onModelSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'api' | 'local'>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const filtered = models.filter(m => {
    const matchesSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || m.type === filterType;
    const matchesProvider = filterProvider === 'all' || m.provider === filterProvider;
    return matchesSearch && matchesType && matchesProvider;
  });

  const apiModels = filtered.filter(m => m.type === 'api');
  const localModels = filtered.filter(m => m.type === 'local');

  const handleDownload = (modelId: string) => {
    setDownloadingIds(prev => new Set([...prev, modelId]));
    setDownloadProgress(prev => ({ ...prev, [modelId]: 0 }));

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        const current = prev[modelId] || 0;
        const next = current + Math.random() * 8;
        if (next >= 100) {
          clearInterval(interval);
          setDownloadingIds(prev2 => {
            const s = new Set(prev2);
            s.delete(modelId);
            return s;
          });
          onModelsChange(models.map(m =>
            m.id === modelId ? { ...m, isDownloaded: true, downloadProgress: undefined } : m
          ));
          return { ...prev, [modelId]: 100 };
        }
        return { ...prev, [modelId]: next };
      });
    }, 200);
  };

  const handleDeleteLocal = (modelId: string) => {
    onModelsChange(models.map(m =>
      m.id === modelId ? { ...m, isDownloaded: false } : m
    ));
  };

  const formatContext = (n: number) => {
    if (n >= 1000000) return `${n / 1000000}M`;
    if (n >= 1000) return `${n / 1000}K`;
    return n.toString();
  };

  const ModelCard = ({ model }: { model: Model }) => {
    const meta = providerMeta[model.provider] || providerMeta.local;
    const isSelected = model.id === selectedModel.id;
    const isDownloading = downloadingIds.has(model.id);
    const progress = downloadProgress[model.id];
    const canSelect = model.type === 'api' ? model.isAvailable : model.isDownloaded;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white border-2 rounded-2xl p-5 transition-all cursor-pointer hover:shadow-md ${
          isSelected ? 'border-blue-400 shadow-md shadow-blue-100' : 'border-slate-200 hover:border-slate-300'
        }`}
        onClick={() => canSelect && onModelSelect(model)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${meta.bg} ${meta.border} border flex items-center justify-center text-lg`}>
              {meta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800">{model.name}</h3>
                {isSelected && <CheckCircle size={14} className="text-blue-500" />}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{meta.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              model.type === 'api' ? (model.isAvailable ? 'bg-emerald-500' : 'bg-slate-300')
              : (model.isDownloaded ? 'bg-purple-500' : 'bg-slate-300')
            }`} />
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-3 leading-relaxed">{model.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {model.tags?.map(tag => (
            <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColors[tag] || 'bg-slate-100 text-slate-600'}`}>
              {tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
          <div className="flex items-center gap-1">
            <BookOpen size={11} />
            <span>{formatContext(model.contextLength)} ctx</span>
          </div>
          {model.size && (
            <div className="flex items-center gap-1">
              <HardDrive size={11} />
              <span>{model.size}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            {model.type === 'api' ? <Wifi size={11} /> : <Cpu size={11} />}
            <span className="capitalize">{model.type}</span>
          </div>
        </div>

        {/* Download Progress */}
        {isDownloading && progress !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Downloading...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="bg-slate-100 rounded-full h-2">
              <motion.div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {model.type === 'api' ? (
            <>
              <button
                onClick={e => { e.stopPropagation(); canSelect && onModelSelect(model); }}
                disabled={!model.isAvailable}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : canSelect
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSelected ? '✓ Active' : !model.isAvailable ? 'Add API Key' : 'Use Model'}
              </button>
            </>
          ) : (
            <>
              {model.isDownloaded ? (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); onModelSelect(model); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {isSelected ? '✓ Active' : 'Use Model'}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteLocal(model.id); }}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition-all"
                    title="Delete local model"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); !isDownloading && handleDownload(model.id); }}
                  disabled={isDownloading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all disabled:opacity-60"
                >
                  {isDownloading
                    ? <><RefreshCw size={14} className="animate-spin" /> Downloading...</>
                    : <><Download size={14} /> Download ({model.size})</>
                  }
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Cpu size={20} className="text-blue-500" /> Models
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Manage API-based and local AI models</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
            <Activity size={14} className="text-blue-500" />
            <span>Active: <strong className="text-slate-700">{selectedModel.name}</strong></span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
            />
          </div>
          <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
            {(['all', 'api', 'local'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filterType === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'all' ? 'All' : t === 'api' ? '☁ Cloud' : '⬡ Local'}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setFilterProvider('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterProvider === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              All
            </button>
            {['gemini', 'openai', 'anthropic', 'ollama'].map(p => (
              <button
                key={p}
                onClick={() => setFilterProvider(filterProvider === p ? 'all' : p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filterProvider === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {providerMeta[p].icon} {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Models', value: models.length, icon: <Cpu size={16} />, color: 'text-blue-500' },
            { label: 'Cloud API', value: models.filter(m => m.type === 'api').length, icon: <Wifi size={16} />, color: 'text-emerald-500' },
            { label: 'Downloaded', value: models.filter(m => m.isDownloaded).length, icon: <HardDrive size={16} />, color: 'text-purple-500' },
            { label: 'Available', value: models.filter(m => m.isAvailable || m.isDownloaded).length, icon: <CheckCircle size={16} />, color: 'text-amber-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className={stat.color}>{stat.icon}</div>
              <div>
                <div className="text-xl font-bold text-slate-800">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Cloud Models */}
        {(filterType === 'all' || filterType === 'api') && apiModels.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Wifi size={14} /> Cloud API Models
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {apiModels.map(m => <ModelCard key={m.id} model={m} />)}
            </div>
          </div>
        )}

        {/* Local Models */}
        {(filterType === 'all' || filterType === 'local') && localModels.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Cpu size={14} /> Local Models (via Ollama)
            </h2>
            <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-purple-700">
              <Info size={14} />
              <span>Local models require <strong>Ollama</strong> installed on your system. Run: <code className="bg-purple-100 px-1.5 rounded font-mono text-xs">curl -fsSL https://ollama.com/install.sh | sh</code></span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {localModels.map(m => <ModelCard key={m.id} model={m} />)}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Search size={32} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No models found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelsPage;
