import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Key, Cpu, ArrowRight, ArrowLeft, CheckCircle,
  Cloud, HardDrive, Eye, EyeOff, Download, Zap,
  AlertCircle, ChevronRight, Globe, Code, BookOpen, Plus, Trash2
} from 'lucide-react';
import { Model, ApiKey } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface OnboardingPageProps {
  onComplete: (keys: ApiKey[]) => void;
  models: Model[];
  onModelsChange: (models: Model[]) => void;
}

const providerInfo = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✦',
    color: 'blue',
    description: 'Access Gemini 2.5 Pro & Flash. Most capable for multimodal tasks.',
    keyLabel: 'Gemini API Key',
    keyPlaceholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    recommended: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '⊕',
    color: 'emerald',
    description: 'Access GPT-4o and other OpenAI models.',
    keyLabel: 'OpenAI API Key',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    icon: '◆',
    color: 'orange',
    description: 'Access Claude 3.5 Sonnet for excellent coding and analysis.',
    keyLabel: 'Anthropic API Key',
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
];

const features = [
  { icon: <Globe size={20} />, title: 'Multi-Provider Support', desc: 'Switch between Gemini, OpenAI, Claude, and local models' },
  { icon: <Code size={20} />, title: 'Coding Agent', desc: 'Advanced AI for code generation, debugging, and review' },
  { icon: <BookOpen size={20} />, title: 'RAG Knowledge Base', desc: 'Chat with your documents, PDFs, and technical books' },
  { icon: <Zap size={20} />, title: 'MCP Integrations', desc: 'Connect external tools via Model Context Protocol' },
];

type Step = 'welcome' | 'api_keys' | 'local_models' | 'complete';

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete, models, onModelsChange }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState<string | null>(null);
  const [validated, setValidated] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
    setErrors(prev => ({ ...prev, [provider]: '' }));
    setValidated(prev => ({ ...prev, [provider]: false }));
  };

  const handleValidateKey = async (provider: string) => {
    const key = apiKeys[provider];
    if (!key?.trim()) {
      setErrors(prev => ({ ...prev, [provider]: 'Please enter an API key' }));
      return;
    }
    setValidating(provider);
    // Simulate validation
    await new Promise(r => setTimeout(r, 1200));
    const isValid = key.length > 10;
    setValidating(null);
    if (isValid) {
      setValidated(prev => ({ ...prev, [provider]: true }));
    } else {
      setErrors(prev => ({ ...prev, [provider]: 'Invalid API key format' }));
    }
  };

  const handleComplete = () => {
    const keys: ApiKey[] = Object.entries(apiKeys)
      .filter(([_, v]) => v.trim())
      .map(([provider, key]) => ({
        id: uuidv4(),
        provider,
        key,
        isValid: validated[provider] || false,
        label: `${provider} API Key`,
        validatedAt: new Date().toISOString(),
      }));
    onComplete(keys);
  };

  const stepVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  const colorMap: Record<string, string> = {
    blue: 'border-blue-300 bg-blue-50',
    emerald: 'border-emerald-300 bg-emerald-50',
    orange: 'border-orange-300 bg-orange-50',
  };
  const badgeMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    orange: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['welcome', 'api_keys', 'local_models', 'complete'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-blue-500 text-white scale-110' :
                (['welcome','api_keys','local_models','complete'].indexOf(step) > i)
                  ? 'bg-blue-500/30 text-blue-300' : 'bg-white/10 text-slate-400'
              }`}>
                {(['welcome','api_keys','local_models','complete'].indexOf(step) > i)
                  ? <CheckCircle size={14} /> : i + 1}
              </div>
              {i < 3 && <div className={`w-12 h-px ${(['welcome','api_keys','local_models','complete'].indexOf(step) > i) ? 'bg-blue-500/50' : 'bg-white/10'}`} />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* WELCOME STEP */}
          {step === 'welcome' && (
            <motion.div key="welcome" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-white">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                    <Sparkles size={28} className="text-white" />
                  </div>
                  <h1 className="text-3xl font-bold mb-2">Welcome to LLM Desktop</h1>
                  <p className="text-slate-300 text-base max-w-md mx-auto">
                    A unified workspace for managing and running both cloud API models and local AI models.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {features.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3 bg-white/5 rounded-xl p-4 border border-white/8"
                    >
                      <div className="text-blue-400 mt-0.5 flex-shrink-0">{f.icon}</div>
                      <div>
                        <div className="font-semibold text-sm">{f.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{f.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button
                  onClick={() => setStep('api_keys')}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/25"
                >
                  Get Started <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* API KEYS STEP */}
          {step === 'api_keys' && (
            <motion.div key="api_keys" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Key size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">API Keys Setup</h2>
                    <p className="text-slate-400 text-sm">Add your API keys to enable cloud AI models</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {providerInfo.map(provider => (
                    <div
                      key={provider.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{provider.icon}</span>
                          <span className="font-semibold">{provider.name}</span>
                          {provider.recommended && (
                            <span className="bg-blue-500/20 text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full">Recommended</span>
                          )}
                        </div>
                        {validated[provider.id] && (
                          <div className="flex items-center gap-1 text-emerald-400 text-xs">
                            <CheckCircle size={13} /> Valid
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{provider.description}</p>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={visibleKeys[provider.id] ? 'text' : 'password'}
                            value={apiKeys[provider.id] || ''}
                            onChange={e => handleKeyChange(provider.id, e.target.value)}
                            placeholder={provider.keyPlaceholder}
                            className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8"
                          />
                          <button
                            onClick={() => setVisibleKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {visibleKeys[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <button
                          onClick={() => handleValidateKey(provider.id)}
                          disabled={validating === provider.id || !apiKeys[provider.id]}
                          className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg text-xs font-medium transition-all disabled:opacity-40 whitespace-nowrap"
                        >
                          {validating === provider.id ? 'Checking...' : 'Validate'}
                        </button>
                      </div>
                      {errors[provider.id] && (
                        <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs">
                          <AlertCircle size={12} /> {errors[provider.id]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('welcome')}
                    className="px-4 py-3 text-slate-400 hover:text-white border border-white/10 rounded-xl text-sm transition-all flex items-center gap-2"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    onClick={() => setStep('local_models')}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all"
                  >
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
                <p className="text-center text-xs text-slate-500 mt-3">
                  You can also skip and add keys in Settings later
                </p>
              </div>
            </motion.div>
          )}

          {/* LOCAL MODELS STEP */}
          {step === 'local_models' && (
            <motion.div key="local_models" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <HardDrive size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Local Models</h2>
                    <p className="text-slate-400 text-sm">Optional: download models to run offline</p>
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 mb-5 flex items-start gap-2">
                  <AlertCircle size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-300">
                    Local models require <strong>Ollama</strong> to be installed on your system. 
                    They run entirely offline with no API costs.
                  </p>
                </div>

                <div className="space-y-3 mb-8">
                  {models.filter(m => m.type === 'local').map(model => (
                    <div key={model.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Cpu size={16} className="text-purple-400" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{model.name}</div>
                          <div className="text-xs text-slate-400">{model.description} · {model.size}</div>
                          <div className="flex gap-1 mt-1">
                            {model.tags?.map(tag => (
                              <span key={tag} className="bg-white/10 text-slate-300 text-xs px-1.5 py-0.5 rounded">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {model.isDownloaded ? (
                          <span className="text-emerald-400 text-xs flex items-center gap-1">
                            <CheckCircle size={12} /> Ready
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              onModelsChange(models.map(m =>
                                m.id === model.id ? { ...m, downloadProgress: 0 } : m
                              ));
                              // Simulate download progress
                              let progress = 0;
                              const interval = setInterval(() => {
                                progress += Math.random() * 15;
                                if (progress >= 100) {
                                  clearInterval(interval);
                                  onModelsChange(models.map(m =>
                                    m.id === model.id ? { ...m, isDownloaded: true, downloadProgress: undefined } : m
                                  ));
                                } else {
                                  onModelsChange(models.map(m =>
                                    m.id === model.id ? { ...m, downloadProgress: Math.min(99, progress) } : m
                                  ));
                                }
                              }, 300);
                            }}
                            className="flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs px-3 py-1.5 rounded-lg border border-purple-500/20 transition-all"
                          >
                            <Download size={12} /> Download
                          </button>
                        )}
                        {model.downloadProgress !== undefined && (
                          <div className="w-20">
                            <div className="bg-white/10 rounded-full h-1.5">
                              <div
                                className="bg-purple-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${model.downloadProgress}%` }}
                              />
                            </div>
                            <div className="text-xs text-slate-400 text-right">{Math.round(model.downloadProgress)}%</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('api_keys')}
                    className="px-4 py-3 text-slate-400 hover:text-white border border-white/10 rounded-xl text-sm transition-all flex items-center gap-2"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    onClick={() => setStep('complete')}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all"
                  >
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* COMPLETE STEP */}
          {step === 'complete' && (
            <motion.div key="complete" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-white text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
                >
                  <CheckCircle size={36} className="text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-3">You're all set!</h2>
                <p className="text-slate-300 mb-2">Your LLM Desktop is ready to use.</p>

                <div className="grid grid-cols-3 gap-3 my-8">
                  {[
                    { icon: <Key size={18} />, label: 'API Keys', value: `${Object.values(apiKeys).filter(v => v).length} configured` },
                    { icon: <Cpu size={18} />, label: 'Local Models', value: `${models.filter(m => m.type === 'local' && m.isDownloaded).length} ready` },
                    { icon: <Zap size={18} />, label: 'Features', value: 'All enabled' },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-blue-400 flex justify-center mb-2">{item.icon}</div>
                      <div className="text-sm font-semibold">{item.value}</div>
                      <div className="text-xs text-slate-400">{item.label}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleComplete}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all text-lg hover:shadow-lg hover:shadow-blue-500/25"
                >
                  Launch LLM Desktop <Sparkles size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingPage;
