// electron/agents/SupervisorAgent.ts
import { StateGraph, END } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { RunnableLambda } from '@langchain/core/runnables';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";
import { DeepResearchAgent } from './DeepResearchAgent';
import { MLEAgent } from './MLEAgent';
import { ToolBelt } from '../tools/ToolBelt';
import { retryManager } from '../utils/RetryManager';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

// 의도 분류를 위한 Zod 스키마 정의
const RouterSchema = z.object({
  intent: z.enum(['coding_request', 'research_request', 'general_chat']).describe("The classified intent of the user's input."),
  reasoning: z.string().describe("The reasoning behind the classification.")
});

interface SupervisorState {
  userInput: string;
  intent: 'coding_request' | 'research_request' | 'general_chat';
  response: string | null;
  conversationHistory: BaseMessage[];
  sessionId: string;
}

export class SupervisorAgent {
  private graph: any;
  private routerModel: ChatGoogleGenerativeAI;
  private researchAgent: DeepResearchAgent;
  private mleAgent: MLEAgent;
  private generalChatModel: ChatGoogleGenerativeAI;
  private updateCallback?: (update: any) => void;
  private routerParser: StructuredOutputParser<typeof RouterSchema>;
  private conversationMemory: Map<string, BaseMessage[]> = new Map();
  private maxHistoryLength: number = 20;

  private constructor(
    geminiApiKey: string,
    toolBelt: ToolBelt
  ) {
    this.routerModel = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.5-pro',
      apiKey: geminiApiKey,
      temperature: 0.1,
      generationConfig: { responseMimeType: 'application/json' },
    });

    this.routerParser = StructuredOutputParser.fromZodSchema(RouterSchema);

    // Agents are now initialized with the pre-built toolbelt
    this.researchAgent = new DeepResearchAgent(geminiApiKey, toolBelt);
    this.mleAgent = new MLEAgent(geminiApiKey, toolBelt);
    this.generalChatModel = new ChatGoogleGenerativeAI({
        modelName: 'gemini-2.5-pro',
        apiKey: geminiApiKey,
    });

    this.defineWorkflow();
  }

  public static async create(geminiApiKey: string, tavilyApiKey: string): Promise<SupervisorAgent> {
    const toolBelt = await ToolBelt.create(tavilyApiKey, geminiApiKey);
    return new SupervisorAgent(geminiApiKey, toolBelt);
  }

  private defineWorkflow() {
    const workflow = new StateGraph<SupervisorState>({
        channels: {
            userInput: { value: (x, y) => y ?? x, default: () => "" },
            intent: { value: (x, y) => y ?? x, default: () => "general_chat" },
            response: { value: (x, y) => y ?? x, default: () => null },
            conversationHistory: { value: (x, y) => y ?? x, default: () => [] },
            sessionId: { value: (x, y) => y ?? x, default: () => "" },
        }
    });

    // 노드 정의
    workflow.addNode('router', new RunnableLambda({ func: this.routerNode.bind(this) }));
    workflow.addNode('mle_node', new RunnableLambda({ func: this.mleNode.bind(this) }));
    workflow.addNode('research_node', new RunnableLambda({ func: this.researchNode.bind(this) }));
    workflow.addNode('general_chat_node', new RunnableLambda({ func: this.generalChatNode.bind(this) }));


    workflow.setEntryPoint('router');

    // 조건부 라우팅
    workflow.addConditionalEdges(
      'router',
      (state: SupervisorState) => state.intent,
      {
        coding_request: 'mle_node',
        research_request: 'research_node',
        general_chat: 'general_chat_node',
      }
    );

    workflow.addEdge('mle_node', END);
    workflow.addEdge('research_node', END);
    workflow.addEdge('general_chat_node', END);

    this.graph = workflow.compile();
  }

  // Enhanced router node with conversation context awareness
  private async routerNode(state: SupervisorState): Promise<Partial<SupervisorState>> {
    const recentHistory = this.getRecentHistory(state.sessionId, 5);
    const contextSummary = recentHistory.length > 0 
      ? `\n\nRecent conversation context:\n${recentHistory.map(m => `${m._getType()}: ${m.content}`).join('\n')}`
      : '';
      
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", `You are a supervisor agent responsible for classifying user intent.
      Analyze the user input and determine the most appropriate intent:

      1. coding_request: Requests related to writing code, debugging, analyzing file structures, or MLE tasks.
      2. research_request: Requests requiring in-depth analysis, web/academic searches, or generating reports.
      3. general_chat: Simple queries or conversations not falling into the above categories.
      
      Consider the conversation context when making your decision.${contextSummary}

      {formatInstructions}
      `],
      ["human", "User Input: {userInput}"],
    ]);

    const chain = promptTemplate.pipe(this.routerModel).pipe(this.routerParser);

    try {
        const result = await retryManager.executeWithRetry(
            async () => chain.invoke({
                userInput: state.userInput,
                formatInstructions: this.routerParser.getFormatInstructions(),
            }),
            {
                maxRetries: 2,
                onRetry: (attempt, error) => {
                    console.log(`Router retry attempt ${attempt}:`, error.message);
                    if (this.updateCallback) {
                        this.updateCallback({ 
                            type: 'routing_update', 
                            data: `Retrying intent classification (attempt ${attempt})...` 
                        });
                    }
                }
            }
        );
        console.log("Router decision:", result.intent, "| Reasoning:", result.reasoning);
        return { intent: result.intent };
    } catch (error) {
        console.error("Router failed after retries, defaulting to general_chat:", error);
        return { intent: "general_chat" };
    }
  }

  // 전문 에이전트 노드들
  private async researchNode(state: SupervisorState): Promise<Partial<SupervisorState>> {
    const result = await this.researchAgent.run(state.userInput, (updateState) => {
        if (this.updateCallback) {
            this.updateCallback({ type: 'research_update', data: updateState });
        }
    });
    return { response: result };
  }

  private async mleNode(state: SupervisorState): Promise<Partial<SupervisorState>> {
    const result = await this.mleAgent.run(state.userInput);
    return { response: result };
  }

  private async generalChatNode(state: SupervisorState): Promise<Partial<SupervisorState>> {
    // Get conversation history for context
    const history = this.getConversationHistory(state.sessionId);
    
    // Build messages with history
    const messages = [
      ...history.slice(-10), // Include last 10 messages for context
      new HumanMessage(state.userInput)
    ];
    
    try {
      const response = await retryManager.executeWithRetry(
        async () => this.generalChatModel.invoke(messages),
        { maxRetries: 2 }
      );
      
      // Update conversation history
      this.addToHistory(state.sessionId, new HumanMessage(state.userInput));
      this.addToHistory(state.sessionId, new AIMessage(response.content.toString()));
      
      return { response: response.content.toString() };
    } catch (error: any) {
      console.error('General chat failed:', error);
      return { response: 'I apologize, but I encountered an error processing your request. Please try again.' };
    }
  }


  public async run(query: string, callback?: (update: any) => void, sessionId?: string) {
    this.updateCallback = callback;
    const actualSessionId = sessionId || this.generateSessionId();
    
    // Initialize conversation history if new session
    if (!this.conversationMemory.has(actualSessionId)) {
      this.conversationMemory.set(actualSessionId, []);
    }
    
    const inputs = { 
      userInput: query,
      sessionId: actualSessionId,
      conversationHistory: this.getConversationHistory(actualSessionId)
    };
    
    try {
      // Execute with retry logic
      const finalState = await retryManager.executeWithRetry(
        async () => this.graph.invoke(inputs),
        {
          maxRetries: 1,
          onRetry: (attempt) => {
            if (callback) {
              callback({ type: 'error', data: `Retrying request (attempt ${attempt})...` });
            }
          }
        }
      );
      
      return finalState.response || "No response generated.";
    } catch (error: any) {
      console.error('Supervisor execution failed:', error);
      return `I encountered an error: ${error.message}. Please try again.`;
    }
  }
  
  /**
   * Helper methods for conversation management
   */
  private getConversationHistory(sessionId: string): BaseMessage[] {
    return this.conversationMemory.get(sessionId) || [];
  }
  
  private getRecentHistory(sessionId: string, count: number): BaseMessage[] {
    const history = this.getConversationHistory(sessionId);
    return history.slice(-count);
  }
  
  private addToHistory(sessionId: string, message: BaseMessage) {
    const history = this.getConversationHistory(sessionId);
    history.push(message);
    
    // Trim history if too long
    if (history.length > this.maxHistoryLength) {
      history.splice(0, history.length - this.maxHistoryLength);
    }
    
    this.conversationMemory.set(sessionId, history);
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Clear conversation history for a session
   */
  public clearSession(sessionId: string) {
    this.conversationMemory.delete(sessionId);
  }
  
  /**
   * Get all active sessions
   */
  public getActiveSessions(): string[] {
    return Array.from(this.conversationMemory.keys());
  }
}
