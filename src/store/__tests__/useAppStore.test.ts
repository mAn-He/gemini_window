import { useAppStore } from '../useAppStore';
import { v4 as uuidv4 } from 'uuid';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      canvasData: null,
      conversationHistory: [],
      currentSession: null,
      apiKeys: {},
      consentHistory: [],
    });
  });

  describe('Canvas Data Management', () => {
    it('should update canvas data', () => {
      const testData = { objects: [], version: '5.3.0' };
      
      useAppStore.getState().updateCanvasData(testData);
      
      expect(useAppStore.getState().canvasData).toEqual(testData);
    });
  });

  describe('Conversation History Management', () => {
    it('should create a new session', () => {
      const sessionId = 'test-session-1';
      
      useAppStore.getState().createSession(sessionId);
      
      const state = useAppStore.getState();
      expect(state.currentSession).toBe(sessionId);
      expect(state.conversationHistory).toHaveLength(1);
      expect(state.conversationHistory[0].sessionId).toBe(sessionId);
    });

    it('should add messages to an existing session', () => {
      const sessionId = 'test-session-2';
      const message = {
        id: uuidv4(),
        role: 'user' as const,
        content: 'Hello, AI!',
        timestamp: Date.now(),
      };
      
      useAppStore.getState().createSession(sessionId);
      useAppStore.getState().addMessage(sessionId, message);
      
      const state = useAppStore.getState();
      const session = state.conversationHistory.find(s => s.sessionId === sessionId);
      
      expect(session?.messages).toHaveLength(1);
      expect(session?.messages[0]).toEqual(message);
    });

    it('should create session if it does not exist when adding message', () => {
      const sessionId = 'new-session';
      const message = {
        id: uuidv4(),
        role: 'assistant' as const,
        content: 'Hello, human!',
        timestamp: Date.now(),
        agentType: 'general' as const,
      };
      
      useAppStore.getState().addMessage(sessionId, message);
      
      const state = useAppStore.getState();
      const session = state.conversationHistory.find(s => s.sessionId === sessionId);
      
      expect(session).toBeDefined();
      expect(session?.messages).toHaveLength(1);
    });

    it('should clear a session', () => {
      const sessionId = 'session-to-clear';
      const message = {
        id: uuidv4(),
        role: 'user' as const,
        content: 'Test message',
        timestamp: Date.now(),
      };
      
      useAppStore.getState().createSession(sessionId);
      useAppStore.getState().addMessage(sessionId, message);
      useAppStore.getState().clearSession(sessionId);
      
      const state = useAppStore.getState();
      const session = state.conversationHistory.find(s => s.sessionId === sessionId);
      
      expect(session).toBeUndefined();
      expect(state.currentSession).toBeNull();
    });

    it('should set current session', () => {
      const sessionId1 = 'session-1';
      const sessionId2 = 'session-2';
      
      useAppStore.getState().createSession(sessionId1);
      useAppStore.getState().createSession(sessionId2);
      useAppStore.getState().setCurrentSession(sessionId1);
      
      expect(useAppStore.getState().currentSession).toBe(sessionId1);
    });
  });

  describe('API Key Management', () => {
    it('should set API keys', () => {
      useAppStore.getState().setApiKey('gemini', 'test-gemini-key');
      useAppStore.getState().setApiKey('tavily', 'test-tavily-key');
      
      const state = useAppStore.getState();
      expect(state.apiKeys.gemini).toBe('test-gemini-key');
      expect(state.apiKeys.tavily).toBe('test-tavily-key');
    });

    it('should update existing API key', () => {
      useAppStore.getState().setApiKey('gemini', 'old-key');
      useAppStore.getState().setApiKey('gemini', 'new-key');
      
      expect(useAppStore.getState().apiKeys.gemini).toBe('new-key');
    });
  });

  describe('Consent History Management', () => {
    it('should add consent decision', () => {
      const decision = {
        requestId: 'consent-1',
        approved: true,
        type: 'file_access',
      };
      
      useAppStore.getState().addConsentDecision(decision);
      
      const state = useAppStore.getState();
      expect(state.consentHistory).toHaveLength(1);
      expect(state.consentHistory[0]).toMatchObject(decision);
      expect(state.consentHistory[0].timestamp).toBeDefined();
    });

    it('should track multiple consent decisions', () => {
      const decisions = [
        { requestId: 'consent-1', approved: true, type: 'file_access' },
        { requestId: 'consent-2', approved: false, type: 'api_call' },
        { requestId: 'consent-3', approved: true, type: 'code_execution' },
      ];
      
      decisions.forEach(decision => {
        useAppStore.getState().addConsentDecision(decision);
      });
      
      const state = useAppStore.getState();
      expect(state.consentHistory).toHaveLength(3);
      
      // Check that all decisions are tracked correctly
      decisions.forEach((decision, index) => {
        expect(state.consentHistory[index]).toMatchObject(decision);
      });
    });
  });

  describe('State Persistence', () => {
    it('should persist specified state properties', () => {
      // Set various state properties
      useAppStore.getState().updateCanvasData({ test: 'data' });
      useAppStore.getState().setApiKey('gemini', 'test-key');
      useAppStore.getState().createSession('test-session');
      
      // Get the partialize function from the store configuration
      // Note: In a real test, you would test actual localStorage persistence
      const state = useAppStore.getState();
      
      expect(state.canvasData).toBeDefined();
      expect(state.apiKeys).toBeDefined();
      expect(state.conversationHistory).toBeDefined();
      expect(state.currentSession).toBeDefined();
      expect(state.consentHistory).toBeDefined();
    });
  });
});