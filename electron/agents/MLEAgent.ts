import { StateGraph, END, ToolNode } from '@langchain/langgraph';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { BaseMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { ToolBelt } from '../tools/ToolBelt';
import { RunnableLambda } from '@langchain/core/runnables';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';

const MAX_ITERATIONS = 5;

// Schemas for structured output
const PlanSchema = z.object({
  plan: z.array(z.string()).describe("A detailed, step-by-step plan to address the user's coding request."),
});

const CodeSchema = z.object({
  code: z.string().describe("The complete, runnable code to implement the plan."),
  testCommand: z.string().describe("The shell command required to test the generated code."),
});

const CritiqueSchema = z.object({
    feedback: z.string().describe("Constructive feedback on the code based on the test results, identifying the root cause of the error."),
});


// Define the state for the MLE-Star agent
interface MLEAgentState {
  userInput: string;
  plan: string;
  code: string;
  testResults: string;
  feedback: string;
  messages: BaseMessage[];
  iterationCount: number;
}

export class MLEAgent {
  private graph: StateGraph<MLEAgentState>;
  private model: BaseLanguageModel;
  private toolbelt: ToolBelt;

  constructor(model: BaseLanguageModel, toolBelt: ToolBelt) {
    this.model = model;
    this.toolbelt = toolBelt;
    this.initializeWorkflow();
  }

  private initializeWorkflow() {
    const workflow = new StateGraph<MLEAgentState>({
      channels: {
        userInput: { value: (x, y) => y ?? x, default: () => "" },
        plan: { value: (x, y) => y ?? x, default: () => "" },
        code: { value: (x, y) => y ?? x, default: () => "" },
        testResults: { value: (x, y) => y ?? x, default: () => "" },
        feedback: { value: (x, y) => y ?? x, default: () => "" },
        messages: { value: (x, y) => (x ?? []).concat(y), default: () => [] },
        iterationCount: { value: (x, y) => (x ?? 0) + 1, default: () => 0 },
      },
    });

    // --- Add Nodes ---
    workflow.addNode('plan_node', new RunnableLambda({ func: this.planNode.bind(this) }));
    workflow.addNode('code_node', new RunnableLambda({ func: this.codeNode.bind(this) }));
    const testToolNode = new ToolNode(this.toolbelt.getTools().filter(t => t.name === 'execute_command'));
    workflow.addNode('test_node', testToolNode);
    workflow.addNode('critique_and_refine_node', new RunnableLambda({ func: this.critiqueAndRefineNode.bind(this) }));

    // --- Define Edges ---
    workflow.setEntryPoint('plan_node');
    workflow.addEdge('plan_node', 'code_node');
    workflow.addEdge('code_node', 'test_node');
    workflow.addConditionalEdges('test_node', this.shouldRefine.bind(this), {
        refine: 'critique_and_refine_node',
        end: END,
    });
    workflow.addEdge('critique_and_refine_node', 'code_node');

    this.graph = workflow.compile();
  }

  // --- Node Implementations ---

  private async planNode(state: MLEAgentState): Promise<Partial<MLEAgentState>> {
    console.log(`---PLANNING (Iteration ${state.iterationCount})---`);
    const parser = StructuredOutputParser.fromZodSchema(PlanSchema);
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are an expert MLE planner. Your task is to devise a clear, step-by-step plan to solve the user's request.
        {format_instructions}`],
        ["human", "User Request: {userInput}"],
    ]);
    const chain = prompt.pipe(this.model.withStructuredOutput(PlanSchema));
    const { plan } = await chain.invoke({ userInput: state.userInput, format_instructions: parser.getFormatInstructions() });

    return { plan: plan.join('\n') };
  }

  private async codeNode(state: MLEAgentState): Promise<Partial<MLEAgentState>> {
    console.log(`---CODING (Iteration ${state.iterationCount})---`);
    const parser = StructuredOutputParser.fromZodSchema(CodeSchema);
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are an expert MLE coder. Your task is to write the code based on the provided plan.
        You must also provide a shell command to test the code.
        {format_instructions}

        Plan:
        {plan}`],
        ["human", "User Request: {userInput}\n\n{feedback}"],
    ]);
    const chain = prompt.pipe(this.model.withStructuredOutput(CodeSchema));
    const { code, testCommand } = await chain.invoke({
        plan: state.plan,
        userInput: state.userInput,
        feedback: state.feedback ? `Feedback from previous attempt: ${state.feedback}` : '',
        format_instructions: parser.getFormatInstructions(),
    });

    const toolMessage = new ToolMessage({
        tool_call_id: 'test_command_execution',
        content: testCommand,
    });

    return { code, messages: [new AIMessage({ content: "Generated code and test command." }), toolMessage] };
  }

  private shouldRefine(state: MLEAgentState): 'refine' | 'end' {
    if (state.iterationCount >= MAX_ITERATIONS) {
        console.log("---MAX ITERATIONS REACHED---");
        return 'end';
    }

    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage._getType() !== 'tool') {
        return 'end'; // Should not happen
    }

    const testOutput = JSON.parse(lastMessage.content as string);
    if (testOutput.stderr) {
        console.log("---TESTS FAILED, REFINING---");
        return 'refine';
    }

    console.log("---TESTS PASSED---");
    return 'end';
  }

  private async critiqueAndRefineNode(state: MLEAgentState): Promise<Partial<MLEAgentState>> {
    console.log(`---CRITIQUING & REFINING (Iteration ${state.iterationCount})---`);
    const lastMessage = state.messages[state.messages.length - 1] as ToolMessage;
    const testOutput = JSON.parse(lastMessage.content as string);

    const parser = StructuredOutputParser.fromZodSchema(CritiqueSchema);
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are an expert debugger. The code failed the test. Analyze the error and provide concise feedback to the coder.
        Explain the likely root cause of the error and suggest a fix.
        {format_instructions}`],
        ["human", `Code:\n{code}\n\nTest Command: \n{testCommand}\n\nStderr:\n{stderr}`],
    ]);
    const chain = prompt.pipe(this.model.withStructuredOutput(CritiqueSchema));
    const { feedback } = await chain.invoke({
        code: state.code,
        testCommand: "N/A", // The agent doesn't need to know the command again
        stderr: testOutput.stderr,
        format_instructions: parser.getFormatInstructions(),
    });

    return { feedback, testResults: testOutput.stderr };
  }

  public async run(userInput: string): Promise<string> {
    const finalState = await this.graph.invoke({ userInput });
    return finalState.code || "No code generated.";
  }
}
