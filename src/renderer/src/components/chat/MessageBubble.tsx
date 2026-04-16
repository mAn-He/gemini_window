import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot, User, Copy, ThumbsUp, ThumbsDown, CheckCircle,
  Code2, Globe, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  chatMode: string;
}

// Simple markdown-like renderer
const renderText = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = '';
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim() || 'code';
        codeLines = [];
      } else {
        inCodeBlock = false;
        const codeContent = codeLines.join('\n');
        elements.push(
          <CodeBlock key={key++} code={codeContent} language={codeLang} />
        );
        codeLines = [];
        codeLang = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(<h1 key={key++} className="text-lg font-bold mt-3 mb-1 text-slate-800">{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="text-base font-bold mt-3 mb-1 text-slate-800">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="text-sm font-bold mt-2 mb-1 text-slate-700">{line.slice(4)}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={key++} className="text-sm text-slate-700 ml-4 list-disc">{renderInline(line.slice(2))}</li>
      );
    } else if (line.match(/^\d+\. /)) {
      const content = line.replace(/^\d+\. /, '');
      elements.push(
        <li key={key++} className="text-sm text-slate-700 ml-4 list-decimal">{renderInline(content)}</li>
      );
    } else if (line === '') {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(
        <p key={key++} className="text-sm text-slate-700 leading-relaxed">{renderInline(line)}</p>
      );
    }
  }

  if (inCodeBlock && codeLines.length > 0) {
    elements.push(<CodeBlock key={key++} code={codeLines.join('\n')} language={codeLang} />);
  }

  return elements;
};

const renderInline = (text: string): React.ReactNode => {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-100 text-blue-700 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
        <span className="text-xs font-medium text-slate-300">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 text-xs p-4 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, chatMode }) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [showThinking, setShowThinking] = useState(false);

  const isUser = message.sender === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modeColor = message.mode === 'coding' ? 'text-emerald-600' :
    message.mode === 'research' ? 'text-purple-600' : 'text-blue-600';
  const ModeIcon = message.mode === 'coding' ? Code2 : message.mode === 'research' ? Globe : Bot;

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end mb-4"
      >
        <div className="flex items-end gap-2 max-w-2xl">
          <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
            {message.fileName && (
              <div className="flex items-center gap-1.5 text-blue-200 text-xs mb-2 bg-blue-700/30 rounded-lg px-2 py-1">
                <FileText size={11} />
                <span>{message.fileName}</span>
              </div>
            )}
            <p className="text-sm leading-relaxed">{message.text}</p>
            <p className="text-xs text-blue-200 mt-1 text-right">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0 mb-1">
            <User size={14} className="text-slate-600" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start mb-4 group"
    >
      <div className="flex items-start gap-3 max-w-3xl w-full">
        <div className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1`}>
          <ModeIcon size={14} className={modeColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
            <div className="prose prose-sm max-w-none">
              {renderText(message.text)}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100 transition-all"
            >
              {copied ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => setLiked(liked === true ? null : true)}
              className={`p-1 rounded hover:bg-slate-100 transition-all ${liked === true ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ThumbsUp size={12} />
            </button>
            <button
              onClick={() => setLiked(liked === false ? null : false)}
              className={`p-1 rounded hover:bg-slate-100 transition-all ${liked === false ? 'text-red-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ThumbsDown size={12} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
