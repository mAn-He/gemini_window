// electron/agents/DeepResearchAgent.ts

import { StateGraph, END } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AIMessage, HumanMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { RunnableLambda } from '@langchain/core/runnables';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { ToolBelt } from '../tools/ToolBelt';
import { retryManager } from '../utils/RetryManager';

const MAX_ITERATIONS = 5;

// Define the state for the TTD-DR agent
interface TTDRAgentState {
  originalQuery: string;
  clarifiedQuery: string;
  researchPlan: string[];
  draftReport: string;
  identifiedGaps: string[];
  messages: BaseMessage[];
  iterationCount: number;
}

export class DeepResearchAgent {
  private graph: StateGraph<TTDRAgentState>;
  private model: ChatGoogleGenerativeAI;
  private toolBelt: ToolBelt;
  private updateCallback?: (update: any) => void;

  constructor(geminiApiKey: string, toolBelt: ToolBelt) {
    this.model = new ChatGoogleGenerativeAI({
      apiKey: geminiApiKey,
      modelName: 'gemini-2.5-pro',
      temperature: 0.7,
    });
    this.toolBelt = toolBelt;
    this.initializeWorkflow();
  }

  private initializeWorkflow() {
    const workflow = new StateGraph<TTDRAgentState>({
      channels: {
        originalQuery: { value: (x, y) => y ?? x, default: () => "" },
        clarifiedQuery: { value: (x, y) => y ?? x, default: () => "" },
        researchPlan: { value: (x, y) => y ?? x, default: () => [] },
        draftReport: { value: (x, y) => y ?? x, default: () => "" },
        identifiedGaps: { value: (x, y) => y ?? x, default: () => [] },
        messages: { value: (x, y) => (x ?? []).concat(y), default: () => [] },
        iterationCount: { value: (x, y) => (x ?? 0) + (y ?? 0), default: () => 0 },
      },
    });

    // --- Add Nodes ---
    workflow.addNode('clarify', new RunnableLambda({ func: this.clarifyNode.bind(this) }));
    workflow.addNode('plan', new RunnableLambda({ func: this.planNode.bind(this) }));
    workflow.addNode('draft', new RunnableLambda({ func: this.draftNode.bind(this) }));
    workflow.addNode('critique', new RunnableLambda({ func: this.critiqueNode.bind(this) }));
    workflow.addNode('refine', new RunnableLambda({ func: this.refineNode.bind(this) }));

    // Use a pre-built ToolNode for executing search tools
    const searchNode = new ToolNode(this.toolBelt.getTools());
    workflow.addNode('search', searchNode);

    // --- Define Edges ---
    workflow.setEntryPoint('clarify');
    workflow.addEdge('clarify', 'plan');
    workflow.addEdge('plan', 'draft');
    workflow.addEdge('draft', 'critique');
    workflow.addEdge('critique', 'routeCritique');
    workflow.addConditionalEdges('routeCritique', this.routeCritique.bind(this), {
      search: 'search',
      end: END,
    });
    workflow.addEdge('search', 'refine');
    workflow.addEdge('refine', 'critique');

    this.graph = workflow.compile();
  }

  // --- Node Implementations (Core Logic) ---

  private async clarifyNode(state: TTDRAgentState): Promise<Partial<TTDRAgentState>> {
    this.sendUpdate("Clarifying research question...");
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are an expert research analyst. Refine the user's initial query into a clear, focused, and comprehensive research question. Identify the core objective and necessary scope."],
        ["human", "Original Query: {query}"],
    ]);
    const chain = prompt.pipe(this.model);
    
    try {
      const response = await retryManager.executeWithRetry(
        async () => chain.invoke({ query: state.originalQuery }),
        {
          maxRetries: 2,
          onRetry: (attempt) => {
            this.sendUpdate(`Retrying clarification (attempt ${attempt})...`);
          }
        }
      );
      const clarifiedQuery = response.content as string;
      return { clarifiedQuery, messages: [new AIMessage("Clarified Query: " + clarifiedQuery)] };
    } catch (error: any) {
      console.error('Failed to clarify query:', error);
      this.sendUpdate('Failed to clarify query, using original query.');
      return { clarifiedQuery: state.originalQuery, messages: [new AIMessage("Using original query due to error.")] };
    }
  }

  private async planNode(state: TTDRAgentState): Promise<Partial<TTDRAgentState>> {
    this.sendUpdate("Formulating research plan...");
    const PlanSchema = z.object({
        plan: z.array(z.string()).describe("A list of sequential steps required to thoroughly answer the research question, including structure (e.g., Introduction, Analysis, Conclusion).")
    });
    const parser = StructuredOutputParser.fromZodSchema(PlanSchema);

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are an expert research strategist. Devise a detailed, step-by-step research plan based on the clarified question.
        {format_instructions}`],
        ["human", "Research Question: {query}"],
    ]);

    const chain = prompt.pipe(this.model.bind({ generationConfig: { responseMimeType: 'application/json' } })).pipe(parser);

    try {
        const result = await retryManager.executeWithRetry(
            async () => chain.invoke({
                query: state.clarifiedQuery,
                format_instructions: parser.getFormatInstructions()
            }),
            {
                maxRetries: 2,
                onRetry: (attempt, error) => {
                    this.sendUpdate(`Retrying plan generation (attempt ${attempt}): ${error.message}`);
                }
            }
        );
        return { researchPlan: result.plan, messages: [new AIMessage("Research Plan Generated.")] };
    } catch (e: any) {
        console.error("Failed to generate research plan after retries:", e);
        this.sendUpdate('Using fallback research plan due to errors.');
        return { researchPlan: ["1. Introduction", "2. Core Analysis", "3. Conclusion"], messages: [new AIMessage("Plan generation failed, using fallback.")] };
    }
  }

  private async draftNode(state: TTDRAgentState): Promise<Partial<TTDRAgentState>> {
    this.sendUpdate("Generating initial 'noisy' draft...");
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `Generate an initial draft (TTD-DR concept: "noisy draft") based on the research question and plan.
        Utilize your internal knowledge. Do NOT search externally yet.
        Focus on structure and explicitly mark areas needing verification (e.g., "[CITATION NEEDED]", "[VERIFY DATA]").

        Research Plan:
        {plan}`],
        ["human", "Research Question: {query}"],
    ]);

    const chain = prompt.pipe(this.model);
    
    try {
      const response = await retryManager.executeWithRetry(
        async () => chain.invoke({ 
          query: state.clarifiedQuery, 
          plan: JSON.stringify(state.researchPlan) 
        }),
        {
          maxRetries: 2,
          onRetry: (attempt) => {
            this.sendUpdate(`Retrying draft generation (attempt ${attempt})...`);
          }
        }
      );
      const draftReport = response.content as string;
      return { draftReport, messages: [new AIMessage("Initial Draft Generated.")] };
    } catch (error: any) {
      console.error('Failed to generate draft:', error);
      this.sendUpdate('Failed to generate draft, creating minimal report.');
      return { 
        draftReport: `# Research Report\n\n## Query\n${state.clarifiedQuery}\n\n## Analysis\n[Error generating detailed analysis]\n\n## Conclusion\nUnable to complete full analysis due to technical issues.`,
        messages: [new AIMessage("Draft generation failed, using minimal template.")] 
      };
    }
  }

  private async critiqueNode(state: TTDRAgentState): Promise<Partial<TTDRAgentState>> {
    this.sendUpdate(`Critiquing draft (Iteration ${state.iterationCount + 1}/${MAX_ITERATIONS})...`);
    if (state.iterationCount >= MAX_ITERATIONS) {
        this.sendUpdate("Maximum iterations reached. Finalizing report.");
        return { identifiedGaps: [] };
    }

    const CritiqueSchema = z.object({
        critique: z.string().describe("A critical analysis of the current draft's weaknesses and inconsistencies."),
        gaps: z.array(z.string()).describe("A list of specific information gaps or questions that require external research. If the draft is sufficient, return an empty list.")
    });
    const parser = StructuredOutputParser.fromZodSchema(CritiqueSchema);

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are a critical reviewer. Analyze the current draft against the research question.
        Identify weaknesses, unsubstantiated claims, and specific information gaps. If the draft is sufficient, the 'gaps' list must be empty.
        Research Question: {question}
        {format_instructions}`],
        ["human", "Current Draft:\n\n{draft}"],
    ]);

    const chain = prompt.pipe(this.model.bind({ generationConfig: { responseMimeType: 'application/json' } })).pipe(parser);
    
    try {
      const result = await retryManager.executeWithRetry(
        async () => chain.invoke({
            question: state.clarifiedQuery,
            draft: state.draftReport,
            format_instructions: parser.getFormatInstructions()
        }),
        {
          maxRetries: 2,
          onRetry: (attempt) => {
            this.sendUpdate(`Retrying critique (attempt ${attempt})...`);
          }
        }
      );
    } catch (error: any) {
      console.error('Failed to critique draft:', error);
      this.sendUpdate('Critique failed, skipping refinement.');
      return { identifiedGaps: [] };
    }
    
    const result = await chain.invoke({
        question: state.clarifiedQuery,
        draft: state.draftReport,
        format_instructions: parser.getFormatInstructions()
    });

    const identifiedGaps = result.gaps;
    this.sendUpdate(`Identified ${identifiedGaps.length} gaps.`);

    if (identifiedGaps.length > 0) {
        this.sendUpdate("Generating tool calls to fill gaps...");
        const modelWithTools = this.model.bindTools(this.toolBelt.getTools());
        const toolPrompt = `The following information gaps have been identified:\n- ${identifiedGaps.join("\n- ")}\n\nUse the available tools (tavily_search_results_json, arxiv_search, read_webpage_content) optimally to find the necessary information to fill these gaps. Call multiple tools if required.`;

        try {
          const response = await retryManager.executeWithRetry(
            async () => modelWithTools.invoke([new HumanMessage(toolPrompt)]),
            {
              maxRetries: 2,
              onRetry: (attempt) => {
                this.sendUpdate(`Retrying tool calls (attempt ${attempt})...`);
              }
            }
          );
          return { identifiedGaps, messages: [response] };
        } catch (error: any) {
          console.error('Failed to generate tool calls:', error);
          this.sendUpdate('Tool calls failed, proceeding without additional research.');
          return { identifiedGaps: [] };
        }
    }

    return { identifiedGaps: [] };
  }

  private routeCritique(state: TTDRAgentState): 'search' | 'end' {
    if (state.identifiedGaps.length > 0) {
      return 'search';
    }
    this.sendUpdate("Critique complete. No further gaps identified.");
    return 'end';
  }

  private async refineNode(state: TTDRAgentState): Promise<Partial<TTDRAgentState>> {
    this.sendUpdate("Refining draft with new information...");
    const searchResults = state.messages.filter(msg => msg._getType() === 'tool') as ToolMessage[];
    const formattedResults = searchResults.map(res => `[Source: ${res.name}]\n${res.content}`).join('\n\n---\n\n');

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are an expert editor (Denoising Step). Refine the current draft using the newly retrieved information.
        Integrate the new information seamlessly, addressing the previously identified gaps. Improve overall quality, accuracy, and coherence.

        Research Question: {question}
        Previously Identified Gaps: \n- {gaps}`],
        ["human", "Current Draft:\n\n{draft}\n\n---\n\nNewly Retrieved Information:\n\n{results}\n\n---\n\nProduce the complete, refined report."],
    ]);

    const chain = prompt.pipe(this.model);
    
    try {
      const response = await retryManager.executeWithRetry(
        async () => chain.invoke({
            question: state.clarifiedQuery,
            gaps: state.identifiedGaps.join('\n- '),
            draft: state.draftReport,
            results: formattedResults
        }),
        {
          maxRetries: 2,
          onRetry: (attempt) => {
            this.sendUpdate(`Retrying refinement (attempt ${attempt})...`);
          }
        }
      );
      
      const refinedReport = response.content.toString();
      return { draftReport: refinedReport, iterationCount: 1, messages: [new AIMessage("Draft Refined.")] };
    } catch (error: any) {
      console.error('Failed to refine draft:', error);
      this.sendUpdate('Refinement failed, using current draft.');
      return { draftReport: state.draftReport, iterationCount: 1, messages: [new AIMessage("Refinement failed, keeping current draft.")] };
    }
  }

  private sendUpdate(message: string) {
    if (this.updateCallback) {
      this.updateCallback({
        type: 'research_update',
        data: message,
      });
    }
    console.log(`[DeepResearchAgent] ${message}`);
  }

  public async run(query: string, callback?: (update: any) => void) {
    this.updateCallback = callback;
    const inputs = { originalQuery: query };
    let finalState: TTDRAgentState | null = null;
    
    try {
      for await (const s of await this.graph.stream(inputs)) {
          const [node, state] = Object.entries(s)[0];
          this.sendUpdate(`Executing node: ${node}`);
          finalState = state;
      }
      this.sendUpdate("Research process complete.");
      return finalState?.draftReport || "No report generated.";
    } catch (error: any) {
      console.error('Fatal error in research workflow:', error);
      this.sendUpdate(`Research failed: ${error.message}`);
      return `Research could not be completed due to an error: ${error.message}\n\nPlease try again or rephrase your query.`;
    }
  }
}
