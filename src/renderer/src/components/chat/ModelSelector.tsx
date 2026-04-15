import React from 'react';
import { CheckCircle, Cpu, Cloud, Zap, ChevronRight, X } from 'lucide-react';
import { Model } from '../../types';

interface ModelSelectorProps {
  models: Model[];
  selectedModel: Model;
  onSelect: (model: Model) => void;
  onClose: () => void;
}

const providerMeta: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  gemini: { label: 'Google', color: 'text-blue-600', bg: 'bg-blue-50', icon: '✦' },
  openai: { label: 'OpenAI', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '⊕' },
  anthropic: { label: 'Anthropic', color: 'text-orange-600', bg: 'bg-orange-50', icon: '◆' },
  ollama: { label: 'Local / Ollama', color: 'text-purple-600', bg: 'bg-purple-50', icon: '⬡' },
  local: { label: 'Local', color: 'text-gray-600', bg: 'bg-gray-50', icon: '⬡' },
};

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, selectedModel, onSelect, onClose }) => {
  const apiModels = models.filter(m => m.type === 'api');
  const localModels = models.filter(m => m.type === 'local');

  const ModelItem = ({ model }: { model: Model }) => {
    const meta = providerMeta[model.provider] || providerMeta.local;
    const isSelected = model.id === selectedModel.id;
    const isDisabled = !model.isAvailable || (model.type === 'local' && !model.isDownloaded);

    return (
      <button
        onClick={() => !isDisabled && onSelect(model)}
        disabled={isDisabled}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
          isSelected ? 'bg-blue-50 text-blue-800' :
          isDisabled ? 'opacity-40 cursor-not-allowed text-slate-400' :
          'hover:bg-slate-50 text-slate-700'
        }`}
      >
        <div className={`w-7 h-7 rounded-md ${meta.bg} flex items-center justify-center flex-shrink-0 text-sm`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{model.name}</span>
            {model.type === 'local' && !model.isDownloaded && (
              <span className="text-xs text-slate-400">({model.size})</span>
            )}
          </div>
          <div className="text-xs text-slate-400 truncate">{model.description.slice(0, 50)}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isSelected && <CheckCircle size={14} className="text-blue-500" />}
          {model.type === 'local' && model.isDownloaded && (
            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 rounded">local</span>
          )}
          {model.type === 'local' && !model.isDownloaded && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded">not installed</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Select Model</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
      </div>

      {apiModels.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <Cloud size={11} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Cloud API</span>
          </div>
          {apiModels.map(m => <ModelItem key={m.id} model={m} />)}
        </div>
      )}

      {localModels.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <Cpu size={11} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Local Models</span>
          </div>
          {localModels.map(m => <ModelItem key={m.id} model={m} />)}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
