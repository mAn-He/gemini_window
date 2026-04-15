import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Code2, Globe } from 'lucide-react';

interface ModeSelectorProps {
  chatMode: 'chat' | 'coding' | 'research';
  onModeChange: (mode: 'chat' | 'coding' | 'research') => void;
}

const modes = [
  { id: 'chat' as const, label: 'Chat', icon: Bot, color: 'blue' },
  { id: 'coding' as const, label: 'Coding Agent', icon: Code2, color: 'emerald' },
  { id: 'research' as const, label: 'Deep Research', icon: Globe, color: 'purple' },
];

const modeStyles: Record<string, { active: string; dot: string }> = {
  chat: { active: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  coding: { active: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  research: { active: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
};

const ModeSelector: React.FC<ModeSelectorProps> = ({ chatMode, onModeChange }) => {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      {modes.map(mode => {
        const Icon = mode.icon;
        const isActive = chatMode === mode.id;
        const styles = modeStyles[mode.id];
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive ? styles.active + ' border shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="mode-indicator"
                className="absolute inset-0 rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Icon size={13} className="relative z-10" />
            <span className="relative z-10">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
