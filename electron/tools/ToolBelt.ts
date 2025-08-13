import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ArxivQueryRun } from "@langchain/community/tools/arxiv";
import { WebBrowser } from "langchain/tools/webbrowser";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseTool } from "@langchain/core/tools";

export class ToolBelt {
    private tools: BaseTool[];

    constructor(tavilyApiKey: string, geminiApiKey: string) {
        const tavilySearch = new TavilySearchResults({
            maxResults: 5,
            apiKey: tavilyApiKey,
        });
        tavilySearch.name = "tavily_search_results_json"; // Ensure the name matches what the agent expects

        const arxivSearch = new ArxivQueryRun();
        arxivSearch.name = "arxiv_search";

        // The WebBrowser tool requires a model to summarize content.
        const model = new ChatGoogleGenerativeAI({
            modelName: "gemini-2.5-pro",
            apiKey: geminiApiKey,
            temperature: 0,
        });
        const browser = new WebBrowser({ model, embeddings: undefined });
        // Rename for clarity if needed, but DeepResearchAgent expects 'read_webpage_content'
        // Let's assume the default name is sufficient or create a custom tool if needed.
        // For now, let's create a custom wrapper to ensure the name is correct.

        const readWebpageTool = {
            name: "read_webpage_content",
            description: "Reads the content of a webpage from a given URL.",
            schema: browser.schema,
            call: (input: string | { url: string, [key: string]: any }) => {
                const url = typeof input === 'string' ? input : input.url;
                return browser.invoke(url);
            }
        } as BaseTool;


        this.tools = [tavilySearch, arxivSearch, readWebpageTool];
    }

    public getTools(): BaseTool[] {
        return this.tools;
    }
}
