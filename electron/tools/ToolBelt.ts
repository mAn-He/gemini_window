import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ArxivQueryRun } from "@langchain/community/tools/arxiv";
import { WebBrowser } from "langchain/tools/webbrowser";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseTool, DynamicTool } from "@langchain/core/tools";
import DeepResearchService from "../../src/main/services/DeepResearchService";
import { z } from "zod";

export class ToolBelt {
    private tools: BaseTool[];

    // Private constructor to enforce initialization via the static create method
    private constructor(
        tavilyApiKey: string,
        geminiApiKey: string,
        researchService: typeof DeepResearchService
    ) {
        // --- Existing General Tools ---
        const tavilySearch = new TavilySearchResults({
            maxResults: 5,
            apiKey: tavilyApiKey,
        });
        tavilySearch.name = "tavily_search_results_json";
        tavilySearch.description = "A general web search tool to get a JSON object of search results.";

        const arxivSearch = new ArxivQueryRun();
        arxivSearch.name = "arxiv_search";
        arxivSearch.description = "Searches arxiv.org for academic papers.";

        // --- New, Specialized Research Tools ---
        const googleScholarSearch = new DynamicTool({
            name: "google_scholar_search",
            description: "Searches Google Scholar for academic papers and returns a list of top results.",
            schema: z.object({
                query: z.string().describe("The search query for Google Scholar.")
            }),
            func: async ({ query }) => {
                const results = await researchService.searchGoogleScholar(query);
                return JSON.stringify(results, null, 2);
            },
        });

        const fetchPaperContent = new DynamicTool({
            name: "fetch_paper_content",
            description: "Fetches the detailed content of a specific academic paper from its URL.",
            schema: z.object({
                link: z.string().url().describe("The URL of the paper to fetch.")
            }),
            func: async ({ link }) => {
                const paperInfo = { link, title: 'N/A', snippet: 'N/A' }; // Minimal info needed for the service
                const result = await researchService.getDetailedPaperContent(paperInfo);
                return result.fullContent || "No content could be extracted.";
            },
        });

        this.tools = [googleScholarSearch, fetchPaperContent, tavilySearch, arxivSearch];
    }

    /**
     * Asynchronously creates and initializes a ToolBelt instance.
     * This is the official way to instantiate this class.
     */
    public static async create(tavilyApiKey: string, geminiApiKey: string): Promise<ToolBelt> {
        // Asynchronously initialize the research service
        await DeepResearchService.initialize();
        console.log("DeepResearchService initialized for ToolBelt.");

        // Create and return the new ToolBelt instance
        return new ToolBelt(tavilyApiKey, geminiApiKey, DeepResearchService);
    }

    public getTools(): BaseTool[] {
        return this.tools;
    }
}
