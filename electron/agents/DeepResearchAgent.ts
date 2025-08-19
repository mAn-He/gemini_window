// electron/agents/DeepResearchAgent.ts

import { StateGraph, END } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { AIMessage, HumanMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { RunnableLambda } from '@langchain/core/runnables';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { ToolBelt } from '../tools/ToolBelt';

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
  private model: BaseLanguageModel;
  private toolBelt: ToolBelt;
  private updateCallback?: (update: any) => void;

  constructor(model: BaseLanguageModel, toolBelt: ToolBelt) {
    this.model = model;
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
    const response = await chain.invoke({ query: state.originalQuery });
    const clarifiedQuery = response.content as string;

    return { clarifiedQuery, messages: [new AIMessage("Clarified Query: " + clarifiedQuery)] };
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
        const result = await chain.invoke({
            query: state.clarifiedQuery,
            format_instructions: parser.getFormatInstructions()
        });
        return { researchPlan: result.plan, messages: [new AIMessage("Research Plan Generated.")] };
    } catch (e) {
        console.error("Failed to generate research plan:", e);
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
    const response = await chain.invoke({ query: state.clarifiedQuery, plan: JSON.stringify(state.researchPlan) });
    const draftReport = response.content as string;

    return { draftReport, messages: [new AIMessage("Initial Draft Generated.")] };
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
        const toolPrompt = `The following information gaps have been identified:\n- ${identifiedGaps.join("\n- ")}\n\nTo address these gaps, you must use the specialized academic research tools. First, use 'google_scholar_search' to find relevant papers. Then, use 'fetch_paper_content' with the URLs from the search results to get the full text. Synthesize this information to fill the gaps. Call multiple tools if required.`;

        const response = await modelWithTools.invoke([new HumanMessage(toolPrompt)]);
        return { identifiedGaps, messages: [response] };
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
    const response = await chain.invoke({
        question: state.clarifiedQuery,
        gaps: state.identifiedGaps.join('\n- '),
        draft: state.draftReport,
        results: formattedResults
    });

    const refinedReport = response.content.toString();
    return { draftReport: refinedReport, iterationCount: 1, messages: [new AIMessage("Draft Refined.")] };
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
    for await (const s of await this.graph.stream(inputs)) {
        const [node, state] = Object.entries(s)[0];
        this.sendUpdate(`Executing node: ${node}`);
        finalState = state;
    }
    this.sendUpdate("Research process complete.");
    return finalState?.draftReport || "No report generated.";
  }
}
