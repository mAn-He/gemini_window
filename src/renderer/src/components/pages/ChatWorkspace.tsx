import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, X, Bot, Code2, Globe, ChevronDown,
  Zap, BrainCircuit, Sparkles, RotateCcw, Copy, ThumbsUp,
  ThumbsDown, Share2, Download, AlertCircle, Loader2, Plus,
  Terminal, Search, FileText, CheckCircle, XCircle, BookOpen,
  ChevronRight, Mic, Image, Settings, Cpu, Activity
} from 'lucide-react';
import { motion as m } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import {
  Model, ChatMessage, ConversationSession, ApiKey, KnowledgeCollection, MCPServer
} from '../../types';
import ModelSelector from '../chat/ModelSelector';
import MessageBubble from '../chat/MessageBubble';
import ModeSelector from '../chat/ModeSelector';

interface ChatWorkspaceProps {
  selectedModel: Model;
  onModelChange: (model: Model) => void;
  models: Model[];
  chatMode: 'chat' | 'coding' | 'research';
  onChatModeChange: (mode: 'chat' | 'coding' | 'research') => void;
  sessions: ConversationSession[];
  onSessionsChange: (sessions: ConversationSession[]) => void;
  currentSessionId: string | null;
  onCurrentSessionChange: (id: string | null) => void;
  knowledgeCollections: KnowledgeCollection[];
  mcpServers: MCPServer[];
  apiKeys: ApiKey[];
}

const WELCOME_MESSAGES: Record<string, { title: string; subtitle: string; suggestions: string[] }> = {
  chat: {
    title: 'How can I help you today?',
    subtitle: 'Start a conversation, ask questions, or explore ideas.',
    suggestions: [
      'Explain quantum computing in simple terms',
      'Write a creative story about time travel',
      'What are the best practices for React in 2025?',
      'Summarize the latest AI research trends',
    ],
  },
  coding: {
    title: 'Coding Agent Ready',
    subtitle: 'I can write, review, debug, and explain code in any language.',
    suggestions: [
      'Build a REST API with FastAPI and SQLite',
      'Review my Python code for performance issues',
      'Create a React component with TypeScript',
      'Explain the difference between async and sync patterns',
    ],
  },
  research: {
    title: 'Deep Research Mode',
    subtitle: 'I will conduct thorough multi-step research on any topic.',
    suggestions: [
      'Research the current state of fusion energy technology',
      'Compare different machine learning frameworks in 2025',
      'Analyze the impact of AI on healthcare systems',
      'Investigate quantum computing commercialization progress',
    ],
  },
};

const modeColors = {
  chat: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  coding: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  research: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
};

const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  selectedModel, onModelChange, models, chatMode, onChatModeChange,
  sessions, onSessionsChange, currentSessionId, onCurrentSessionChange,
  knowledgeCollections, mcpServers, apiKeys,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; path?: string; content?: string } | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [researchSteps, setResearchSteps] = useState<string[]>([]);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [thinkingDots, setThinkingDots] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const welcome = WELCOME_MESSAGES[chatMode];
  const colors = modeColors[chatMode];

  // Load session messages when session changes
  useEffect(() => {
    if (currentSession) {
      setMessages(currentSession.messages);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, researchSteps, agentSteps]);

  // Thinking dots animation
  useEffect(() => {
    if (!isLoading) { setThinkingDots(''); return; }
    const interval = setInterval(() => {
      setThinkingDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, [isLoading]);

  const saveSession = useCallback((msgs: ChatMessage[], sessionId: string | null, title?: string) => {
    const id = sessionId || uuidv4();
    const now = new Date().toISOString();
    const newSession: ConversationSession = {
      id,
      title: title || msgs[0]?.text?.slice(0, 50) || 'New Chat',
      messages: msgs,
      modelId: selectedModel.id,
      mode: chatMode,
      createdAt: currentSession?.createdAt || now,
      updatedAt: now,
      knowledgeCollectionId: selectedCollection || undefined,
    };
    onSessionsChange(sessions.some(s => s.id === id)
      ? sessions.map(s => s.id === id ? newSession : s)
      : [...sessions, newSession]
    );
    if (!sessionId) onCurrentSessionChange(id);
    return id;
  }, [sessions, selectedModel, chatMode, currentSession, selectedCollection]);

  const simulateResearch = async (query: string) => {
    const steps = [
      '🔍 Analyzing query and identifying key research areas...',
      '📊 Searching for academic papers and authoritative sources...',
      '🌐 Cross-referencing multiple data sources...',
      '🧠 Synthesizing findings and identifying patterns...',
      '📝 Generating comprehensive report...',
    ];
    setResearchSteps([]);
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      setResearchSteps(prev => [...prev, step]);
    }
  };

  const simulateCodingAgent = async (query: string) => {
    const steps = [
      '🤔 Analyzing requirements...',
      '📐 Designing solution architecture...',
      '💻 Writing code...',
      '🔍 Reviewing for bugs and edge cases...',
      '✅ Running internal validation...',
    ];
    setAgentSteps([]);
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 300));
      setAgentSteps(prev => [...prev, step]);
    }
  };

  const generateMockResponse = (query: string, mode: string): string => {
    if (mode === 'coding') {
      if (query.toLowerCase().includes('api') || query.toLowerCase().includes('fastapi')) {
        return `Here's a complete FastAPI implementation:

\`\`\`python
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    price = Column(Float)

Base.metadata.create_all(bind=engine)

# Pydantic models
class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

class ItemResponse(ItemCreate):
    id: int
    class Config:
        from_attributes = True

# FastAPI app
app = FastAPI(title="Items API", version="1.0.0")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/items/", response_model=List[ItemResponse])
def list_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Item).offset(skip).limit(limit).all()

@app.post("/items/", response_model=ItemResponse, status_code=201)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    db_item = Item(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
\`\`\`

**Key Features:**
- SQLite database with SQLAlchemy ORM
- Pydantic validation models  
- CRUD operations with proper HTTP status codes
- Dependency injection for DB sessions
- Auto-generated OpenAPI docs at \`/docs\`

Run with: \`pip install fastapi sqlalchemy uvicorn && python main.py\``;
      }
      return `Here's a solution to your coding request:

\`\`\`typescript
// TypeScript implementation
interface Solution {
  id: string;
  result: string;
  timestamp: Date;
}

async function processSolution(input: string): Promise<Solution> {
  const result = await computeAnswer(input);
  return {
    id: crypto.randomUUID(),
    result,
    timestamp: new Date(),
  };
}

async function computeAnswer(input: string): Promise<string> {
  // Implementation logic here
  return \`Processed: \${input}\`;
}

// Usage example
const solution = await processSolution("your input");
console.log(solution);
\`\`\`

This implementation includes proper TypeScript types, async/await patterns, and error handling best practices.`;
    }

    if (mode === 'research') {
      return `# Research Report: ${query.slice(0, 60)}...

## Executive Summary
Based on comprehensive analysis of current literature and data sources, here is a detailed research report on the topic.

## Key Findings

### 1. Current State
The field has seen remarkable progress in recent years, with significant developments across multiple dimensions including technical capabilities, commercial adoption, and regulatory frameworks.

### 2. Major Trends
- **Trend 1**: Rapid advancement in core technology with 40% improvement in efficiency metrics
- **Trend 2**: Increased industry investment, reaching new highs in 2024-2025
- **Trend 3**: Growing regulatory attention leading to new governance frameworks

### 3. Challenges & Opportunities
The primary challenges include scalability, cost reduction, and regulatory compliance. However, these present significant opportunities for innovation and market differentiation.

## Data Sources
- Academic papers from Nature, Science, and IEEE (2023-2025)
- Industry reports from leading research firms
- Government publications and regulatory filings
- Expert interviews and conference proceedings

## Conclusions
The evidence strongly suggests continued growth and maturation of this field over the next 2-5 years, with key inflection points expected in 2025-2026.

**Confidence Level**: High (based on 15+ primary sources)`;
    }

    return `Thank you for your question! I'd be happy to help with "${query.slice(0, 40)}..."

Here's a comprehensive response:

${query.toLowerCase().includes('react') || query.toLowerCase().includes('component')
  ? `**React Best Practices in 2025:**

1. **Use Function Components** - Always prefer function components with hooks over class components
2. **State Management** - Use Zustand or Jotai for global state; keep local state with useState
3. **Performance** - Leverage React.memo(), useMemo(), and useCallback() strategically
4. **TypeScript** - Fully type your props and state for better developer experience
5. **Server Components** - Consider React Server Components for data-heavy views

\`\`\`tsx
// Modern React Pattern (2025)
import { memo, useCallback } from 'react';

interface Props {
  title: string;
  onAction: (id: string) => void;
}

const MyComponent = memo<Props>(({ title, onAction }) => {
  const handleClick = useCallback(() => {
    onAction('some-id');
  }, [onAction]);

  return (
    <div className="container">
      <h2>{title}</h2>
      <button onClick={handleClick}>Action</button>
    </div>
  );
});
\`\`\``
  : `This is a well-considered response based on current knowledge and best practices. The key points to understand are:

- **Core concept**: The fundamental principle involves systematic analysis and structured thinking
- **Application**: In practice, this manifests as a multi-step process
- **Considerations**: Important factors include context, requirements, and constraints
- **Next steps**: I recommend starting with a small proof-of-concept before scaling

Would you like me to elaborate on any specific aspect of this topic?`}`;
  };

  const handleSend = async () => {
    if (!input.trim() && !attachedFile) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
      fileName: attachedFile?.name,
      mode: chatMode,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const queryText = input;
    setInput('');
    setAttachedFile(null);
    setIsLoading(true);
    setResearchSteps([]);
    setAgentSteps([]);

    try {
      if (chatMode === 'research') {
        await simulateResearch(queryText);
      } else if (chatMode === 'coding') {
        await simulateCodingAgent(queryText);
      } else {
        await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
      }

      const responseText = generateMockResponse(queryText, chatMode);

      const aiMessage: ChatMessage = {
        id: uuidv4(),
        text: responseText,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        mode: chatMode,
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      saveSession(finalMessages, currentSessionId);
    } catch (err) {
      const errMessage: ChatMessage = {
        id: uuidv4(),
        text: 'An error occurred. Please check your API key in Settings and try again.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      const errMessages = [...newMessages, errMessage];
      setMessages(errMessages);
      saveSession(errMessages, currentSessionId);
    } finally {
      setIsLoading(false);
      setResearchSteps([]);
      setAgentSteps([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile({ name: file.name });
    }
  };

  const connectedMCPServers = mcpServers.filter(s => s.status === 'connected');

  return (
    <div className="flex h-full bg-slate-50 relative">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <ModeSelector chatMode={chatMode} onModeChange={onChatModeChange} />
          </div>
          <div className="flex items-center gap-3">
            {knowledgeCollections.length > 0 && (
              <div className="relative">
                <select
                  value={selectedCollection || ''}
                  onChange={e => setSelectedCollection(e.target.value || null)}
                  className="text-xs bg-slate-100 border border-slate-200 rounded-lg pl-7 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 appearance-none text-slate-600 cursor-pointer"
                >
                  <option value="">No knowledge base</option>
                  {knowledgeCollections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <BookOpen size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              <div className={`w-2 h-2 rounded-full ${selectedModel.type === 'local' ? 'bg-purple-500' : 'bg-blue-500'}`} />
              <span className="max-w-28 truncate">{selectedModel.name}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Model Selector Dropdown */}
        <AnimatePresence>
          {showModelSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 right-4 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2 w-72"
            >
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onSelect={(model) => { onModelChange(model); setShowModelSelector(false); }}
                onClose={() => setShowModelSelector(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <WelcomeScreen
              welcome={welcome}
              chatMode={chatMode}
              colors={colors}
              onSuggestion={(s) => { setInput(s); inputRef.current?.focus(); }}
              connectedServers={connectedMCPServers}
              selectedCollection={selectedCollection}
              collections={knowledgeCollections}
            />
          ) : (
            <div className="max-w-3xl mx-auto space-y-2">
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} chatMode={chatMode} />
              ))}

              {/* Research Progress */}
              {isLoading && researchSteps.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm max-w-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                        <Globe size={12} className="text-purple-600" />
                      </div>
                      <span className="text-sm font-medium text-purple-700">Deep Research in Progress</span>
                    </div>
                    <div className="space-y-2">
                      {researchSteps.map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2 text-sm text-slate-600"
                        >
                          <CheckCircle size={13} className="text-purple-500 flex-shrink-0" />
                          <span>{step}</span>
                        </motion.div>
                      ))}
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 size={13} className="animate-spin text-purple-400 flex-shrink-0" />
                        <span>Finalizing{thinkingDots}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Coding Agent Progress */}
              {isLoading && agentSteps.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm max-w-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Code2 size={12} className="text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium text-emerald-700">Coding Agent Working</span>
                    </div>
                    <div className="space-y-2">
                      {agentSteps.map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2 text-sm text-slate-600"
                        >
                          <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                          <span>{step}</span>
                        </motion.div>
                      ))}
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 size={13} className="animate-spin text-emerald-400 flex-shrink-0" />
                        <span>Writing code{thinkingDots}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Simple loading indicator */}
              {isLoading && researchSteps.length === 0 && agentSteps.length === 0 && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <Bot size={12} className="text-blue-600" />
                      </div>
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                            className="w-1.5 h-1.5 rounded-full bg-blue-400"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 px-4 py-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Attached file */}
            {attachedFile && (
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 mb-2 text-sm">
                <FileText size={14} className="text-slate-500" />
                <span className="text-slate-600 flex-1 truncate">{attachedFile.name}</span>
                <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Selected collection indicator */}
            {selectedCollection && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 mb-2 text-xs">
                <BookOpen size={12} className="text-blue-500" />
                <span className="text-blue-700">Using knowledge base: <strong>{knowledgeCollections.find(c => c.id === selectedCollection)?.name}</strong></span>
                <button onClick={() => setSelectedCollection(null)} className="ml-auto text-blue-400 hover:text-blue-600">
                  <X size={12} />
                </button>
              </div>
            )}

            <div className={`flex items-end gap-2 bg-slate-50 border-2 rounded-2xl px-4 py-3 transition-all focus-within:bg-white ${
              chatMode === 'coding' ? 'focus-within:border-emerald-400' :
              chatMode === 'research' ? 'focus-within:border-purple-400' :
              'focus-within:border-blue-400'
            } border-slate-200`}>
              {/* File attach */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileAttach}
                className="hidden"
                accept=".pdf,.txt,.md,.docx,.py,.js,.ts,.tsx,.jsx"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0 mb-0.5 transition-colors"
                title="Attach file"
              >
                <Paperclip size={18} />
              </button>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  chatMode === 'coding' ? 'Describe what you want to build or debug...' :
                  chatMode === 'research' ? 'Enter your research topic or question...' :
                  'Message LLM Desktop...'
                }
                rows={1}
                className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 text-sm resize-none focus:outline-none max-h-32 leading-relaxed"
                style={{ minHeight: '24px' }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                }}
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !attachedFile)}
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all mb-0.5 ${
                  (input.trim() || attachedFile) && !isLoading
                    ? chatMode === 'coding' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                    : chatMode === 'research' ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-sm'
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">
                Press <kbd className="bg-slate-100 px-1 py-0.5 rounded text-slate-500">Enter</kbd> to send, <kbd className="bg-slate-100 px-1 py-0.5 rounded text-slate-500">Shift+Enter</kbd> for new line
              </p>
              {connectedMCPServers.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Activity size={10} className="text-emerald-500" />
                  <span>{connectedMCPServers.length} MCP tool{connectedMCPServers.length > 1 ? 's' : ''} active</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Welcome Screen Component
const WelcomeScreen: React.FC<{
  welcome: typeof WELCOME_MESSAGES.chat;
  chatMode: string;
  colors: typeof modeColors.chat;
  onSuggestion: (s: string) => void;
  connectedServers: MCPServer[];
  selectedCollection: string | null;
  collections: KnowledgeCollection[];
}> = ({ welcome, chatMode, colors, onSuggestion, connectedServers, selectedCollection, collections }) => {
  const Icon = chatMode === 'coding' ? Code2 : chatMode === 'research' ? Globe : Bot;

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 text-center max-w-2xl mx-auto">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className={`w-16 h-16 rounded-2xl ${colors.light} border-2 ${colors.border} flex items-center justify-center mb-6`}
      >
        <Icon size={28} className={colors.text} />
      </motion.div>

      <motion.h2
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-slate-800 mb-2"
      >
        {welcome.title}
      </motion.h2>
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-slate-500 mb-8"
      >
        {welcome.subtitle}
      </motion.p>

      {selectedCollection && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-6 text-sm text-blue-700"
        >
          <BookOpen size={14} />
          <span>Knowledge base active: <strong>{collections.find(c => c.id === selectedCollection)?.name}</strong></span>
        </motion.div>
      )}

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-2 w-full"
      >
        {welcome.suggestions.map((s, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            onClick={() => onSuggestion(s)}
            className="text-left px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm text-slate-600 hover:text-slate-800 transition-all hover:shadow-sm group"
          >
            <span className="group-hover:text-blue-600 transition-colors">{s}</span>
          </motion.button>
        ))}
      </motion.div>

      {connectedServers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-2 mt-6 text-xs text-slate-400"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{connectedServers.map(s => s.name).join(', ')} tools available</span>
        </motion.div>
      )}
    </div>
  );
};

export default ChatWorkspace;
