# LLM Desktop

**A unified AI workspace for managing and running both cloud API models and local AI models — built with Electron, React, and LangGraph.**

> Seamlessly switch between Gemini, OpenAI, Claude, and local models (Gemma, Phi, Llama). Run advanced agentic workflows, query your personal knowledge base via RAG, and manage MCP integrations — all from a single desktop application.

---

## 📸 Screenshots

> Chat & Agent Workspace · RAG Knowledge Base · MCP Manager

---

## ✨ What This App Does

LLM Desktop is more than a chat client. It is a full **AI operations center** designed around four core workflows:

| Workflow | What it does |
|---|---|
| **Chat & Agents** | Standard chat, Coding Agent with self-correction loop, Deep Research with multi-step web investigation |
| **RAG / Knowledge Base** | Upload PDFs, DOCX, Markdown — chunk, embed, store in ChromaDB, and chat with your documents |
| **MCP Manager** | Connect, configure, and verify any MCP-compatible server via a visual GUI (no JSON editing required) |
| **Model Management** | Switch between cloud API providers and local Ollama models from a single interface |

---

## 🏗️ Architecture

The application follows a strict **Electron 3-layer architecture** where each layer has a single responsibility and communicates exclusively through typed IPC channels.

```
┌──────────────────────────────────────────────────────────────┐
│  RENDERER PROCESS  (React + Vite + TailwindCSS)              │
│                                                              │
│  OnboardingPage  ChatWorkspace  RAGDashboard                 │
│  MCPManagerPage  ModelsPage     SettingsPage                 │
└─────────────────────┬────────────────────────────────────────┘
                      │  window.api  (contextBridge)
                      │  IPC invoke / handle
┌─────────────────────▼────────────────────────────────────────┐
│  PRELOAD BRIDGE  (preload/index.ts)                          │
│  Exposes typed window.api — zero direct Node.js access       │
└─────────────────────┬────────────────────────────────────────┘
                      │  Node.js IPC channel
┌─────────────────────▼────────────────────────────────────────┐
│  MAIN PROCESS  (Node.js)                                     │
│                                                              │
│  ┌─────────────────────────────────────┐                     │
│  │  SupervisorAgent  (LangGraph)       │                     │
│  │  Intent Router: classifies input    │                     │
│  │  → research · coding · general      │                     │
│  └──────┬──────────────────┬───────────┘                     │
│         │                  │                                 │
│  ┌──────▼──────┐   ┌───────▼──────┐                         │
│  │DeepResearch │   │  MLEAgent    │                         │
│  │Agent        │   │  (LangGraph) │                         │
│  │(LangGraph)  │   │  plan →      │                         │
│  │clarify →    │   │  generate →  │                         │
│  │plan →       │   │  test →      │                         │
│  │search →     │   │  critique    │                         │
│  │reason →     │   │  (max 5x)    │                         │
│  │synthesize   │   └──────────────┘                         │
│  └─────────────┘                                            │
│                                                              │
│  LLMFactory ──► Gemini 2.5 Pro / Flash                      │
│  ToolBelt   ──► Playwright scraping + Web search            │
│  MCPClient  ──► stdio JSON-RPC 2.0 (external MCP servers)   │
│  ProjectService ► ChromaDB + text-embedding-004             │
│  RAGService ──► LlamaIndex + Gemini                         │
│  DatabaseService ► SQLite (chat history)                    │
└──────────────────────────────────────────────────────────────┘
```

### IPC Communication Map

| `window.api` method | Main handler | Service |
|---|---|---|
| `chatWithWeb()` | `chat-with-web` | MultimodalAIService → Gemini |
| `deepResearch()` | `deep-research` | SupervisorAgent → DeepResearchAgent |
| `runRagQuery()` | `run-rag-query` | RAGService (LlamaIndex) |
| `connectMCPServer()` | `connect-mcp-server` | MCPClient (stdio spawn) |
| `callMCPTool()` | `call-mcp-tool` | MCPClient → JSON-RPC 2.0 |
| `project.chat()` | `project:chat` | ProjectService → ChromaDB |
| `handleMultimodalPrompt()` | `handle-multimodal-prompt` | MultimodalAIService (PDF / Image) |

---

## 🤖 Agent System

### SupervisorAgent — Intent Router
Classifies every user message using Gemini with structured JSON output (Zod schema) into one of three intents, then delegates to the appropriate sub-agent or falls through to direct LLM chat.

```
user input
    │
    ▼
SupervisorAgent.routerNode()
    ├── "research_request"  ──► DeepResearchAgent
    ├── "coding_request"    ──► MLEAgent
    └── "general_chat"      ──► MultimodalAIService (direct)
```

### DeepResearchAgent — LangGraph StateGraph
Implements a multi-step autonomous research loop. The agent maintains a `ResearchState` object that flows through each node and accumulates findings.

```
[initializing]
      │
      ▼
[clarifying] ──(ambiguous query)──► [awaiting_clarification]
      │                                       │
      │◄──────────────────────────────────────┘
      ▼
[planning] ──► [awaiting_approval] ──(revision)──► [planning]
      │                │
      │           (approved)
      ▼
[searching]  ◄──────────────────────────────────┐
      │   Playwright scraping + ToolBelt         │
      ▼                                         │
[reasoning]  ──(needs more data)────────────────┘
      │
  (sufficient)
      ▼
[synthesizing] ──► [completed]
```

**SourceStrategy**: Before planning, the agent identifies the query's domain (Academic, Finance, Legal, etc.) and applies the optimal search strategy — selecting primary sources (arXiv, IEEE, Bloomberg) and search operators (`filetype:pdf`, `site:arxiv.org`) automatically.

### MLEAgent — Self-Correcting Coding Agent
Implements a plan → generate → test → critique loop with a maximum of 5 iterations. Uses Zod structured output parsers at each stage to ensure valid, executable code.

```
[plan]  ──► PlanSchema (step-by-step breakdown)
  │
  ▼
[generate]  ──► CodeSchema (code + testCommand)
  │
  ▼
[test]  ──► runs testCommand, captures stdout/stderr
  │
  ▼
[critique]  ──► CritiqueSchema (root cause analysis)
  │
  ├── (pass)  ──► return final code
  └── (fail, iteration < 5)  ──► back to [generate]
```

---

## 📋 Core Sections

### 1. Onboarding & Token Management
A guided 4-step setup wizard that runs on first launch.

- **Step 1 — Welcome**: Feature overview with animated cards
- **Step 2 — API Keys**: Configure providers (Gemini, OpenAI, Anthropic, Cohere) with inline validation and show/hide toggle
- **Step 3 — Local Models**: Browse and download Ollama-compatible models (Gemma 3 4B, Phi-4, Llama 3.2 3B) with progress tracking
- **Step 4 — Complete**: Summary of configured keys and ready models

API keys and onboarding state are persisted to `localStorage`. The wizard is skipped on subsequent launches.

### 2. Chat & Agent Workspace
The main interface. A single `ModeSelector` component switches between three fundamentally different execution modes.

| Mode | Color | Behavior |
|---|---|---|
| **Chat** | Blue | Standard conversational AI with web context |
| **Coding Agent** | Emerald | Routes to MLEAgent — shows plan/generate/test/critique steps |
| **Deep Research** | Purple | Routes to DeepResearchAgent — shows live progress: planning → searching → reasoning → synthesizing |

Additional features:
- **Model selector** — switch between any configured API or local model mid-conversation
- **Knowledge base selector** — attach an active RAG collection to the conversation for document-grounded answers
- **File attachment** — attach PDFs, code files, or images inline
- **Markdown renderer** — full code block rendering with syntax highlighting and one-click copy
- **Session persistence** — conversations are saved to `localStorage` and listed in the collapsible sidebar

### 3. RAG & Knowledge Base Dashboard
A complete document ingestion and retrieval pipeline with a visual management interface.

**Ingestion pipeline:**
```
File upload / URL
    │
    ▼
Document parsing (PDF → pdf-parse, DOCX → mammoth, TXT/MD → direct)
    │
    ▼
RecursiveCharacterTextSplitter (configurable chunk size + overlap)
    │
    ▼
Google text-embedding-004 (embedding generation)
    │
    ▼
ChromaDB (vector storage, per-collection namespacing)
```

**Retrieval:** Top-K similarity search with optional MMR (Maximal Marginal Relevance) for result diversity, cross-encoder re-ranking, and HyDE (Hypothetical Document Embeddings).

**UI features:**
- Color-coded document collections with sidebar navigation
- Drag-and-drop upload for PDF, DOCX, TXT, MD
- URL ingestion (crawls and indexes web pages)
- Real-time processing status (processing → ready → chunks count)
- RAG settings panel: embedding model, chunk size slider (128–2048), chunk overlap, vector store selection (ChromaDB / Pinecone / Qdrant), retrieval parameters

### 4. MCP Manager GUI
A visual alternative to manually editing JSON config files. Manages the full lifecycle of MCP (Model Context Protocol) server processes.

**How it works:**
```
GUI click "Connect"
    │
    ▼
MCPClient.connect()
    │
    ▼
child_process.spawn(command, args, { env })   ← stdio transport
    │
    ▼
JSON-RPC 2.0 handshake (initialize → initialized)
    │
    ▼
tools/list request → tool definitions cached
    │
    ▼
Status: connected ✓  (tools available to agents)
```

**Bundled Marketplace servers:**

| Server | Category | Key Tools |
|---|---|---|
| Filesystem | Storage | `read_file`, `write_file`, `list_directory`, `search_files` |
| Sequential Thinking | Reasoning | `think_step_by_step` |
| GitHub | Development | `search_repositories`, `get_file_contents`, `create_issue` |
| Tavily Search | Search | `search`, `extract` |
| PostgreSQL | Database | `query`, `list_tables`, `describe_table` |
| Puppeteer | Browser | `navigate`, `screenshot`, `click`, `fill` |

**Custom server form:** Specify command, arguments, environment variables, and get a live terminal-style command preview before connecting.

---

## 🛠️ Tech Stack

### Frontend (Renderer Process)
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite + electron-vite | Build tool |
| Tailwind CSS | Utility-first styling |
| Framer Motion | Animations and transitions |
| Lucide React | Icon library |
| localStorage | Client-side state persistence |

### Backend (Main Process)
| Technology | Purpose |
|---|---|
| Electron 33 | Desktop runtime + IPC |
| Node.js | Backend execution environment |
| LangChain.js | Agent chains, prompts, output parsers |
| LangGraph.js | Stateful multi-node agent workflows |
| `@langchain/google-genai` | Gemini 2.5 Pro / Flash integration |
| LlamaIndex | Single-file RAG pipeline |
| ChromaDB | Local vector database |
| Playwright | Headless browser for web scraping |
| Cheerio | HTML parsing |
| SQLite + `sqlite3` | Chat history persistence |
| `mammoth` | DOCX parsing |
| `pdf-parse` | PDF text extraction |
| Zod | Runtime schema validation for structured LLM outputs |

### AI Models & APIs
| Model | Provider | Used For |
|---|---|---|
| `gemini-2.5-pro` | Google | Reasoning, research synthesis, coding |
| `gemini-2.5-flash` | Google | Fast responses, intent classification |
| `text-embedding-004` | Google | Document and query embeddings |
| GPT-4o | OpenAI | Optional (requires key) |
| Claude 3.5 Sonnet | Anthropic | Optional (requires key) |
| Gemma 3 4B / Phi-4 / Llama 3.2 | Ollama (local) | Offline operation |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Git
- A Google AI Studio API key ([get one here](https://aistudio.google.com/app/apikey))
- (Optional) [Ollama](https://ollama.com) for local model support

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mAn-He/gemini_window.git
cd gemini_window

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Configure environment variables
cp .env.example .env
# Edit .env and add your keys:
#   GEMINI_API_KEY=AIzaSy...
#   TAVILY_API_KEY=tvly-...  (optional, for web search in Deep Research)
```

### Running

```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Package as distributable (Windows .exe / macOS .dmg / Linux .AppImage)
npm run package
```

### First Launch
1. The **Onboarding Wizard** will appear automatically
2. Enter your Gemini API key and click **Validate**
3. (Optional) Download a local model for offline use
4. Click **Launch LLM Desktop**

On subsequent launches, the wizard is skipped and you go directly to the Chat workspace.

---

## 📁 Project Structure

```
gemini_window/
│
├── src/
│   ├── main/                        # Electron Main Process
│   │   ├── index.ts                 # App entry, IPC handlers, window management
│   │   └── services/
│   │       ├── DeepResearchAgent.ts # LangGraph research state machine
│   │       ├── MultimodalAIService.ts # Gemini API wrapper (text + vision)
│   │       ├── MCPClient.ts         # MCP stdio client (JSON-RPC 2.0)
│   │       ├── MCPConfigService.ts  # MCP server config persistence
│   │       ├── MCPService.ts        # MCP server lifecycle management
│   │       ├── DatabaseService.ts   # SQLite chat history
│   │       ├── SettingsService.ts   # App settings persistence
│   │       ├── ToolBelt.ts          # Playwright + search tools
│   │       └── SourceStrategy.ts   # Domain-aware search strategy
│   │
│   ├── preload/
│   │   ├── index.ts                 # contextBridge — exposes window.api
│   │   └── types.d.ts               # IElectronAPI type definitions
│   │
│   └── renderer/
│       └── src/
│           ├── App.tsx              # Root component, routing, global state
│           ├── types.ts             # Shared TypeScript interfaces
│           ├── index.css            # Global styles + design system
│           ├── main.tsx             # React entry point + window.api mock
│           ├── components/
│           │   ├── layout/
│           │   │   └── Sidebar.tsx  # Collapsible nav, session list
│           │   ├── chat/
│           │   │   ├── ChatWorkspace.tsx  # Main chat interface (3 modes)
│           │   │   ├── MessageBubble.tsx  # Markdown renderer + code blocks
│           │   │   ├── ModeSelector.tsx   # Chat / Coding / Research toggle
│           │   │   └── ModelSelector.tsx  # Cloud + local model picker
│           │   └── pages/
│           │       ├── OnboardingPage.tsx # 4-step setup wizard
│           │       ├── RAGDashboard.tsx   # Knowledge base management
│           │       ├── MCPManagerPage.tsx # MCP server GUI
│           │       ├── ModelsPage.tsx     # Model browser + download
│           │       └── SettingsPage.tsx   # App configuration
│           └── store/
│               └── useAppStore.ts   # Zustand global state store
│
├── electron/                        # Electron-specific modules
│   ├── agents/
│   │   ├── SupervisorAgent.ts       # Intent classifier + router
│   │   ├── DeepResearchAgent.ts     # Research LangGraph (clarify→synthesize)
│   │   └── MLEAgent.ts              # Coding LangGraph (plan→code→test loop)
│   ├── llms/
│   │   └── LLMFactory.ts            # Provider-agnostic LLM factory
│   ├── tools/
│   │   └── ToolBelt.ts              # Playwright scraper + web search
│   └── services/
│       ├── ProjectService.ts        # ChromaDB + LangChain RAG
│       ├── RAGService.ts            # LlamaIndex single-file RAG
│       └── CanvasService.ts         # Gemini-powered canvas operations
│
├── electron.vite.config.ts          # Build configuration
├── tailwind.config.js               # Design system tokens
└── package.json
```

---

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
# Required — Google AI (Gemini)
GEMINI_API_KEY=AIzaSy...
GOOGLE_API_KEY=AIzaSy...   # alias, same key works for both

# Optional — enables web search in Deep Research mode
TAVILY_API_KEY=tvly-...

# Optional — GitHub MCP server
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...

# Optional — PostgreSQL MCP server
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

API keys can also be configured at runtime via **Settings → API Keys** in the app itself.

---

## 🗺️ Roadmap

- [ ] OpenAI and Anthropic agent routing (currently Gemini-only in backend)
- [ ] Streaming responses for chat and agent steps
- [ ] Export research reports to PDF / Markdown
- [ ] Multi-file canvas with AI annotation
- [ ] Vector store sync across devices (cloud backup)
- [ ] Plugin marketplace for custom MCP servers
- [ ] Voice input via Web Speech API

---

## 🤝 Contributing

Contributions are welcome. Please open an issue to discuss the change before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/)
4. Push and open a Pull Request targeting `main`

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
