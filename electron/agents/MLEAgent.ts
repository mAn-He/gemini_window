import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export class MLEAgent {
  private model: ChatGoogleGenerativeAI;

  constructor(geminiApiKey: string) {
    this.model = new ChatGoogleGenerativeAI({
      apiKey: geminiApiKey,
      modelName: 'gemini-2.5-pro',
      temperature: 0, // Coding tasks require precision
    });
  }

  public async run(userInput: string): Promise<string> {
    const systemPrompt = `You are a Machine Learning Engineer (MLE) agent.
You are an expert in coding, debugging, and analyzing file structures.
You have access to a set of secure, local tools for file system operations.
When asked to perform a task, provide a clear, concise, and accurate response.
If you need to write code, provide the code in a markdown block.`;

    const prompt = ChatPromptTemplate.fromMessages([
      new SystemMessage(systemPrompt),
      new HumanMessage(userInput),
    ]);

    const chain = prompt.pipe(this.model);
    const response = await chain.invoke({});

    return response.content.toString();
  }
}
