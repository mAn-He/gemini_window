import { BaseLanguageModel } from "@langchain/core/language_models/base";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

type ModelProvider = "gemini";

interface LLMOptions {
  apiKey: string;
  modelName?: string;
  temperature?: number;
}

export class LLMFactory {
  public static create(provider: ModelProvider, options: LLMOptions): BaseLanguageModel {
    switch (provider) {
      case "gemini":
        return new ChatGoogleGenerativeAI({
          apiKey: options.apiKey,
          modelName: options.modelName || "gemini-2.5-pro",
          temperature: options.temperature ?? 0.7,
        });
      // In the future, other providers can be added here
      // case "openai":
      //   return new ChatOpenAI({ ... });
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}
