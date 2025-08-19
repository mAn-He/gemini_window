// electron/agents/SupervisorAgent.ts
import { StateGraph, END } from '@langchain/langgraph';
import { RunnableLambda } from '@langchain/core/runnables';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";
import { DeepResearchAgent } from './DeepResearchAgent';
import { MLEAgent } from './MLEAgent';
import { ToolBelt } from '../tools/ToolBelt';
import { LLMFactory } from '../llms/LLMFactory';
import { BaseLanguageModel } from '@langchain/core/language_models/base';

// 의도 분류를 위한 Zod 스키마 정의
const RouterSchema = z.object({
  intent: z.enum(['coding_request', 'research_request', 'general_chat']).describe("The classified intent of the user's input."),
  reasoning: z.string().describe("The reasoning behind the classification.")
});

interface SupervisorState {
  userInput: string;
  intent: 'coding_request' | 'research_request' | 'general_chat';
  response: string | null;
}

export class SupervisorAgent {
  private graph: any;
  private routerModel: BaseLanguageModel;
  private researchAgent: DeepResearchAgent;
  private mleAgent: MLEAgent;
  private generalChatModel: BaseLanguageModel;
  private updateCallback?: (update: any) => void;
  private routerParser: StructuredOutputParser<typeof RouterSchema>;

  private constructor(
    geminiApiKey: string,
    toolBelt: ToolBelt
  ) {
    // Create models using the factory
    this.routerModel = LLMFactory.create('gemini', {
      apiKey: geminiApiKey,
      temperature: 0.1,
    });

    const researchModel = LLMFactory.create('gemini', {
        apiKey: geminiApiKey,
        temperature: 0.7,
    });

    const mleModel = LLMFactory.create('gemini', {
        apiKey: geminiApiKey,
        temperature: 0.1,
    });

    this.generalChatModel = LLMFactory.create('gemini', {
        apiKey: geminiApiKey,
    });

    this.routerParser = StructuredOutputParser.fromZodSchema(RouterSchema);

    // Agents are now initialized with the pre-built toolbelt and models
    this.researchAgent = new DeepResearchAgent(researchModel, toolBelt);
    this.mleAgent = new MLEAgent(mleModel, toolBelt);

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

  // [구현 완료] 라우터 노드: 의도 분류 (LLM 호출 로직 구현)
  private async routerNode(state: SupervisorState): Promise<Partial<SupervisorState>> {
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", `You are a supervisor agent responsible for classifying user intent.
      Analyze the user input and determine the most appropriate intent:

      1. coding_request: Requests related to writing code, debugging, analyzing file structures, or MLE tasks.
      2. research_request: Requests requiring in-depth analysis, web/academic searches, or generating reports.
      3. general_chat: Simple queries or conversations not falling into the above categories.

      {formatInstructions}
      `],
      ["human", "User Input: {userInput}"],
    ]);

    const chain = promptTemplate.pipe(this.routerModel).pipe(this.routerParser);

    try {
        const result = await chain.invoke({
            userInput: state.userInput,
            formatInstructions: this.routerParser.getFormatInstructions(),
        });
        console.log("Router decision:", result.intent, "| Reasoning:", result.reasoning);
        return { intent: result.intent };
    } catch (error) {
        console.error("Router failed, defaulting to general_chat:", error);
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
    // 실제 구현에서는 대화 기록(Chat History) 관리가 필요합니다.
    const response = await this.generalChatModel.invoke(state.userInput);
    return { response: response.content.toString() };
  }


  public async run(query: string, callback?: (update: any) => void) {
    this.updateCallback = callback;
    const inputs = { userInput: query };
    // LangGraph 실행 및 최종 상태 반환
    const finalState = await this.graph.invoke(inputs);
    return finalState.response || "No response generated.";
  }
}
