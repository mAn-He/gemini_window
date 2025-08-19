import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Define conversation history types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  agentType?: 'supervisor' | 'research' | 'coding' | 'general';
}

export interface ConversationContext {
  sessionId: string;
  messages: Message[];
  currentAgent?: string;
  metadata?: Record<string, any>;
}

interface AppState {
  // Canvas state
  canvasData: any; // Fabric.js JSON data
  updateCanvasData: (data: any) => void;
  
  // Conversation history management
  conversationHistory: ConversationContext[];
  currentSession: string | null;
  addMessage: (sessionId: string, message: Message) => void;
  createSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string) => void;
  clearSession: (sessionId: string) => void;
  
  // API configuration
  apiKeys: {
    gemini?: string;
    tavily?: string;
  };
  setApiKey: (service: 'gemini' | 'tavily', key: string) => void;
  
  // User consent tracking (HITL)
  consentHistory: Array<{
    requestId: string;
    approved: boolean;
    timestamp: number;
    type: string;
  }>;
  addConsentDecision: (decision: { requestId: string; approved: boolean; type: string }) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      // Canvas state
      canvasData: null,
      updateCanvasData: (data) => set((state) => {
        state.canvasData = data;
      }),
      
      // Conversation history management
      conversationHistory: [],
      currentSession: null,
      
      addMessage: (sessionId: string, message: Message) => set((state) => {
        const session = state.conversationHistory.find(s => s.sessionId === sessionId);
        if (session) {
          session.messages.push(message);
        } else {
          // Create new session if it doesn't exist
          state.conversationHistory.push({
            sessionId,
            messages: [message],
            metadata: {}
          });
        }
      }),
      
      createSession: (sessionId: string) => set((state) => {
        if (!state.conversationHistory.find(s => s.sessionId === sessionId)) {
          state.conversationHistory.push({
            sessionId,
            messages: [],
            metadata: {}
          });
        }
        state.currentSession = sessionId;
      }),
      
      setCurrentSession: (sessionId: string) => set((state) => {
        state.currentSession = sessionId;
      }),
      
      clearSession: (sessionId: string) => set((state) => {
        const index = state.conversationHistory.findIndex(s => s.sessionId === sessionId);
        if (index !== -1) {
          state.conversationHistory.splice(index, 1);
        }
        if (state.currentSession === sessionId) {
          state.currentSession = null;
        }
      }),
      
      // API configuration
      apiKeys: {},
      setApiKey: (service: 'gemini' | 'tavily', key: string) => set((state) => {
        state.apiKeys[service] = key;
      }),
      
      // User consent tracking
      consentHistory: [],
      addConsentDecision: (decision) => set((state) => {
        state.consentHistory.push({
          ...decision,
          timestamp: Date.now()
        });
      }),
    })),
    {
      name: 'gemini-desktop-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      partialize: (state) => ({
        // Only persist specific parts of the state
        canvasData: state.canvasData,
        conversationHistory: state.conversationHistory,
        currentSession: state.currentSession,
        apiKeys: state.apiKeys,
        consentHistory: state.consentHistory,
      }),
    }
  )
);
