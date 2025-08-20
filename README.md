# Gemini Desktop

**An AI-Powered Research Assistant with Deep Research, a Dynamic Canvas, and MCP Support.**

This is a sophisticated Electron application that brings the power of Google's Gemini AI to your desktop, supercharged with advanced, multi-step research capabilities. It is built with React, TypeScript, LangGraph.js, and the Gemini 2.5 Pro AI model to create a professional research workflow.

---

## ✨ Core Features

*   **Multi-Agent Architecture**: Utilizes a `Supervisor` agent to route tasks to specialized agents like the `DeepResearchAgent` or `MLEAgent`, creating a robust and scalable system.
*   **Deep Research Engine (TTD-DR)**: Implements a "Test-Driven Deep Research" methodology using LangGraph. The agent performs a multi-step process of planning, drafting, and iterative refinement with tool-based fact-checking to produce comprehensive reports.
*   **Interactive AI Canvas**: A dynamic canvas powered by Fabric.js and Gemini. Users can conversationally add, modify, and remove objects, making it a powerful tool for visual brainstorming and diagramming.
*   **Model Context Protocol (MCP) Integration**: Ready to connect with local development servers through MCP. The application can robustly start and manage the lifecycle of an MCP server.
*   **Project-Based RAG**: Create isolated project workspaces to chat with your documents. Each project has its own vector store, ensuring contextually relevant conversations based on the files you upload (PDF, TXT, MD, JS, TS).
*   **Modern & Secure Desktop UI**: Built with React, TypeScript, and a secure Electron architecture that uses a preload script to bridge the main and renderer processes safely.

---

## 📊 Implementation Status

This project has a solid architectural foundation, and the core logic for its main features has been fully implemented.

### 1. **Core Infrastructure & Refactoring (Phase 1) - ✅ Completed**
*   **IPC & State Management**: Communication channels have been unified to `window.api` (via `preload/index.ts`), and Zustand-based state management (`useAppStore.ts`) has been correctly introduced with Immer and `useShallow` optimizations.
*   **Tool Optimization**: The `ToolBelt.ts` has been successfully migrated to use Tavily, ArxivRetriever, and a Gemini-powered web browser tool.

### 2. **Deep Research Agent (TTD-DR) - ✅ Implemented**
*   **Implementation Status**: The LangGraph state machine structure for the TTD-DR methodology (`DeepResearchAgent.ts`) is fully implemented. The state definitions, node configurations (clarify → plan → draft → critique → refine), and the conditional edge logic for the "denoising loop" are all in place and functional.
*   **Details**: Each node now makes live calls to the Gemini API with sophisticated prompt engineering to conduct actual research, a significant upgrade from the initial placeholder logic. The `critiqueNode` effectively analyzes reports to identify gaps and generate tool calls for the `searchNode`.

### 3. **MCP Integration & Local Tools - ✅ Implemented**
*   **MCP Management**: A robust process management pattern using `child_process.spawn` is correctly implemented in `electron/main/index.ts`. The app's lifecycle management, which terminates child processes on exit, is solid.
*   **MCP Path Configuration**: The `startMcpServer` function now dynamically resolves the path to the MCP server script (`@modelcontextprotocol/server-filesystem`) using `require.resolve`, ensuring the server can be reliably started in any environment.

### 4. **Gemini Canvas - ✅ Implemented**
*   **Implementation Status**: The Fabric.js-based canvas (`GeminiCanvas.tsx`) and its AI backend (`CanvasService.ts`) are fully implemented. The data flow for **adding**, **modifying**, and **removing** objects via conversational commands is complete, utilizing Gemini's JSON mode and Zod schemas for structured data parsing.
*   **Details**: The `handleCanvasUpdate` function is no longer a TODO; it now contains the complete logic for modifying and removing objects based on their unique IDs, enabling a fully interactive editing experience.

### 5. **Coding & Supervisor Agents - ✅ Implemented**
*   **Coding Agent (`MLEAgent.ts`)**: A specialized agent for coding tasks with a well-defined system prompt is complete and functional.
*   **Supervisor Agent (`SupervisorAgent.ts`)**: The supervisor-router structure is complete. The `routerNode` now dynamically classifies user intent by calling the Gemini API with JSON mode, moving beyond the initial hardcoded logic.

### 6. **Project RAG Feature - ✅ Implemented**
*   **Implementation Status**: The backend RAG pipeline and frontend UI for the 'Project' feature are complete.
*   **Details**: The backend uses a `ProjectService` with LangChain.js and ChromaDB to manage project-specific vector stores. The frontend provides a complete UI for creating projects, uploading files, and chatting with the project's documents.

---

## 🛠️ Tech Stack

### **Frontend**
- React 18 + TypeScript
- Tailwind CSS + Framer Motion (for UI components not yet implemented)
- Fabric.js for Canvas
- Zustand for State Management

### **Backend** 
- Electron Main Process + Node.js
- Google Generative AI SDK (Gemini 2.5 Pro)
- **LangChain.js / LangGraph.js** for Agent Architecture
- Tavily & Arxiv for Tools

### **Development**
- Electron Vite (Build Tool)
- ESLint + Prettier (Code Quality)
- Electron Builder (Packaging)

---

## 🚀 Quick Start

### 📋 Prerequisites
- Node.js 18+
- Git
- Required API Keys (see Environment Setup)

### 🔧 Installation and Execution
```bash
# 1. Clone the repository
git clone https://github.com/your-username/gemini-desktop.git
cd gemini-desktop

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env file in the root directory and add your API keys:
# GEMINI_API_KEY=your-google-ai-api-key-here
# TAVILY_API_KEY=your-tavily-api-key-here

# 4. Run in development mode
npm run dev

# 5. Build for production
npm run build

# 6. Package for distribution
npm run package
```
---

## 🤝 Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
