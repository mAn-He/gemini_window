import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ArxivQueryRun } from "@langchain/community/tools/arxiv";
import { BaseTool, DynamicTool } from "@langchain/core/tools";
import DeepResearchService from "../../src/main/services/DeepResearchService";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class ToolBelt {
    private tools: BaseTool[];

    // Private constructor to enforce initialization via the static create method
    private constructor(
        tavilyApiKey: string,
        geminiApiKey: string,
        researchService: typeof DeepResearchService
    ) {
        // --- Specialized Research Tools ---
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

        // --- Code Execution Tool ---
        const executeCommand = new DynamicTool({
            name: "execute_command",
            description: "Executes a shell command and returns the output.",
            schema: z.object({
                command: z.string().describe("The shell command to execute.")
            }),
            func: async ({ command }) => {
                console.log(`[ToolBelt] Executing command: ${command}`);
                try {
                    const { stdout, stderr } = await execAsync(command);
                    return JSON.stringify({ stdout, stderr });
                } catch (error: any) {
                    // If exec fails, it throws an error which contains stdout and stderr
                    return JSON.stringify({
                        error: error.message,
                        stdout: error.stdout,
                        stderr: error.stderr,
                    });
                }
            },
        });

        this.tools = [executeCommand, googleScholarSearch, fetchPaperContent];
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
