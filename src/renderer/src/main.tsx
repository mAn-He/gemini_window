import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Provide a browser-safe mock for window.api (used in Electron context)
if (typeof window !== 'undefined' && !(window as any).api) {
  (window as any).api = {
    sendMessage: async () => 'Mock response - API not available in browser mode',
    chatWithWeb: async (query: string) => ({
      answer: `[Browser Mode] This would connect to the AI model with query: "${query}"`,
      citations: [],
    }),
    deepResearch: async (query: string) => ({
      refinedQuery: query,
      answer: `[Browser Mode] Deep research results for: "${query}"`,
    }),
    runRagQuery: async () => ({ response: '[Browser Mode] RAG query result' }),
    handleMultimodalPrompt: async () => ({ response: '[Browser Mode] Multimodal response' }),
    openFile: async () => null,
    getMCPTools: async () => ({}),
    callMCPTool: async () => ({ content: [{ text: 'MCP tool result' }] }),
  };
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
