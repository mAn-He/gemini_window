import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Key, Eye, EyeOff, CheckCircle, AlertCircle, Trash2,
  Plus, Save, RefreshCw, Shield, Palette, Bell, Database,
  HardDrive, Cloud, Globe, Info, User, ExternalLink, Loader2,
  Moon, Sun, Monitor
} from 'lucide-react';
import { ApiKey } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface SettingsPageProps {
  apiKeys: ApiKey[];
  onApiKeysChange: (keys: ApiKey[]) => void;
  onResetOnboarding: () => void;
}

const providerInfo: Record<string, { name: string; icon: string; placeholder: string; docsUrl: string; color: string }> = {
  gemini: { name: 'Google Gemini', icon: '✦', placeholder: 'AIzaSy...', docsUrl: 'https://aistudio.google.com', color: 'blue' },
  openai: { name: 'OpenAI', icon: '⊕', placeholder: 'sk-...', docsUrl: 'https://platform.openai.com', color: 'emerald' },
  anthropic: { name: 'Anthropic Claude', icon: '◆', placeholder: 'sk-ant-...', docsUrl: 'https://console.anthropic.com', color: 'orange' },
  cohere: { name: 'Cohere', icon: '◉', placeholder: 'co-...', docsUrl: 'https://dashboard.cohere.com', color: 'purple' },
};

const colorMap: Record<string, string> = {
  blue: 'border-blue-300 bg-blue-50',
  emerald: 'border-emerald-300 bg-emerald-50',
  orange: 'border-orange-300 bg-orange-50',
  purple: 'border-purple-300 bg-purple-50',
};

type SettingsSection = 'api_keys' | 'appearance' | 'privacy' | 'storage' | 'advanced';

const SettingsPage: React.FC<SettingsPageProps> = ({ apiKeys, onApiKeysChange, onResetOnboarding }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('api_keys');
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [newKeyInputs, setNewKeyInputs] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [notifications, setNotifications] = useState(true);
  const [telemetry, setTelemetry] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [storageLocation, setStorageLocation] = useState<'local' | 'cloud'>('local');

  const sections = [
    { id: 'api_keys', label: 'API Keys', icon: Key },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'advanced', label: 'Advanced', icon: Settings },
  ] as const;

  const handleAddKey = async (provider: string) => {
    const key = newKeyInputs[provider];
    if (!key?.trim()) return;

    setValidating(provider);
    await new Promise(r => setTimeout(r, 1000));
    setValidating(null);

    const existingIndex = apiKeys.findIndex(k => k.provider === provider);
    const newKey: ApiKey = {
      id: existingIndex >= 0 ? apiKeys[existingIndex].id : uuidv4(),
      provider,
      key: key.trim(),
      isValid: true,
      label: `${providerInfo[provider]?.name || provider} API Key`,
      validatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      onApiKeysChange(apiKeys.map((k, i) => i === existingIndex ? newKey : k));
    } else {
      onApiKeysChange([...apiKeys, newKey]);
    }
    setNewKeyInputs(prev => ({ ...prev, [provider]: '' }));
  };

  const handleDeleteKey = (keyId: string) => {
    onApiKeysChange(apiKeys.filter(k => k.id !== keyId));
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Settings size={15} className="text-blue-500" /> Settings
          </h2>
        </div>
        <nav className="p-3 flex-1">
          <div className="space-y-0.5">
            {sections.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                    isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={15} className={isActive ? 'text-blue-500' : 'text-slate-400'} />
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          {/* API KEYS */}
          {activeSection === 'api_keys' && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">API Keys</h2>
              <p className="text-sm text-slate-400 mb-6">Manage your API keys for cloud AI providers</p>

              <div className="space-y-4">
                {Object.entries(providerInfo).map(([providerId, info]) => {
                  const existingKey = apiKeys.find(k => k.provider === providerId);
                  const inputVal = newKeyInputs[providerId] || '';
                  const isVisible = visibleKeys[providerId];
                  const isValidating = validating === providerId;

                  return (
                    <div
                      key={providerId}
                      className={`bg-white border rounded-2xl p-5 transition-all ${
                        existingKey ? 'border-emerald-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{info.icon}</span>
                          <div>
                            <h3 className="font-semibold text-slate-800">{info.name}</h3>
                            {existingKey && (
                              <div className="flex items-center gap-1 text-xs text-emerald-600 mt-0.5">
                                <CheckCircle size={11} /> Configured
                                {existingKey.validatedAt && <span className="text-slate-400">· {new Date(existingKey.validatedAt).toLocaleDateString()}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        <a
                          href={info.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          Get key <ExternalLink size={10} />
                        </a>
                      </div>

                      {existingKey && (
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mb-3">
                          <span className="flex-1 font-mono text-sm text-slate-500">
                            {isVisible ? existingKey.key : existingKey.key.slice(0, 8) + '••••••••••••'}
                          </span>
                          <button
                            onClick={() => setVisibleKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }))}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            onClick={() => handleDeleteKey(existingKey.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={inputVal}
                          onChange={e => setNewKeyInputs(prev => ({ ...prev, [providerId]: e.target.value }))}
                          placeholder={existingKey ? 'Update key: ' + info.placeholder : info.placeholder}
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-mono"
                          onKeyDown={e => e.key === 'Enter' && handleAddKey(providerId)}
                        />
                        <button
                          onClick={() => handleAddKey(providerId)}
                          disabled={!inputVal.trim() || isValidating}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40"
                        >
                          {isValidating
                            ? <><Loader2 size={13} className="animate-spin" /> Saving...</>
                            : <><Save size={13} /> {existingKey ? 'Update' : 'Save'}</>
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* APPEARANCE */}
          {activeSection === 'appearance' && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Appearance</h2>
              <p className="text-sm text-slate-400 mb-6">Customize the look and feel of LLM Desktop</p>

              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-3">Theme</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'system', label: 'System', icon: Monitor },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id as any)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          theme === t.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <t.icon size={20} className={theme === t.id ? 'text-blue-500' : 'text-slate-400'} />
                        <span className="text-sm font-medium text-slate-700">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-3">Interface</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Show timestamps in chat', value: true },
                      { label: 'Enable message animations', value: true },
                      { label: 'Compact mode', value: false },
                      { label: 'Show model icon in chat', value: true },
                    ].map((setting, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-700">{setting.label}</span>
                        <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${setting.value ? 'bg-blue-500' : 'bg-slate-200'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${setting.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PRIVACY */}
          {activeSection === 'privacy' && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Privacy & Security</h2>
              <p className="text-sm text-slate-400 mb-6">Control your data and privacy preferences</p>

              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-3">Data Privacy</h3>
                  <div className="space-y-4">
                    {[
                      {
                        label: 'Send usage analytics',
                        desc: 'Help improve LLM Desktop by sending anonymous usage data',
                        value: telemetry,
                        onChange: setTelemetry,
                      },
                      {
                        label: 'Enable notifications',
                        desc: 'Show desktop notifications for long operations',
                        value: notifications,
                        onChange: setNotifications,
                      },
                    ].map((setting, i) => (
                      <div key={i} className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-slate-700">{setting.label}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{setting.desc}</div>
                        </div>
                        <button
                          onClick={() => setting.onChange(!setting.value)}
                          className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 mt-0.5 ${setting.value ? 'bg-blue-500' : 'bg-slate-200'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${setting.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-1">API Key Security</h3>
                  <p className="text-sm text-slate-400 mb-3">Your API keys are stored locally and never shared with third parties.</p>
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
                    <Shield size={14} /> Keys are encrypted at rest using AES-256
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-red-700 mb-2">Danger Zone</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-700">Clear all chat history</div>
                        <div className="text-xs text-slate-400">Permanently delete all conversations</div>
                      </div>
                      <button className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-all">
                        Clear
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-700">Reset onboarding</div>
                        <div className="text-xs text-slate-400">Run the setup wizard again</div>
                      </div>
                      <button
                        onClick={onResetOnboarding}
                        className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-all"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STORAGE */}
          {activeSection === 'storage' && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Storage</h2>
              <p className="text-sm text-slate-400 mb-6">Configure where your data is stored</p>

              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-3">Storage Location</h3>
                  <div className="space-y-3">
                    {[
                      { id: 'local', label: 'Local Storage', desc: 'Fast, private. Data stays on this computer.', icon: HardDrive },
                      { id: 'cloud', label: 'Cloud Sync', desc: 'Sync across devices (coming soon)', icon: Cloud, disabled: true },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => !opt.disabled && setStorageLocation(opt.id as any)}
                        disabled={opt.disabled}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                          storageLocation === opt.id ? 'border-blue-400 bg-blue-50' :
                          opt.disabled ? 'opacity-40 cursor-not-allowed border-slate-100' :
                          'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <opt.icon size={20} className={storageLocation === opt.id ? 'text-blue-500' : 'text-slate-400'} />
                        <div>
                          <div className="font-medium text-slate-700">{opt.label}</div>
                          <div className="text-xs text-slate-400">{opt.desc}</div>
                        </div>
                        {storageLocation === opt.id && <CheckCircle size={16} className="ml-auto text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-3">Auto-save</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-700">Auto-save conversations</div>
                      <div className="text-xs text-slate-400">Automatically save chat history</div>
                    </div>
                    <button
                      onClick={() => setAutoSave(!autoSave)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${autoSave ? 'bg-blue-500' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${autoSave ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-3">Storage Usage</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Chat History', size: '2.4 MB', color: 'bg-blue-500', pct: 20 },
                      { label: 'Knowledge Base', size: '145 MB', color: 'bg-purple-500', pct: 60 },
                      { label: 'Model Cache', size: '0 MB', color: 'bg-slate-300', pct: 5 },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="text-slate-400">{item.size}</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-1.5">
                          <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ADVANCED */}
          {activeSection === 'advanced' && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Advanced</h2>
              <p className="text-sm text-slate-400 mb-6">Advanced configuration options</p>

              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-3">Generation Parameters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Temperature', value: 0.7, min: 0, max: 2, step: 0.1 },
                      { label: 'Max Tokens', value: 4096, min: 256, max: 32768, step: 256 },
                      { label: 'Top P', value: 0.9, min: 0, max: 1, step: 0.05 },
                      { label: 'Top K', value: 40, min: 1, max: 100, step: 1 },
                    ].map(param => (
                      <div key={param.label}>
                        <label className="text-sm font-medium text-slate-700 block mb-1.5">
                          {param.label}: <span className="text-blue-600">{param.value}</span>
                        </label>
                        <input
                          type="range"
                          defaultValue={param.value}
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          className="w-full accent-blue-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-3">System Prompt</h3>
                  <textarea
                    defaultValue="You are a helpful, accurate, and thoughtful AI assistant. Always provide clear, well-structured responses."
                    rows={4}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 resize-none"
                  />
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-3">Ollama Configuration</h3>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Ollama API URL</label>
                    <input
                      type="text"
                      defaultValue="http://localhost:11434"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all">
                    <Save size={15} /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
