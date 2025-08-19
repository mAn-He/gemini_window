import {
  VectorStoreIndex,
  Gemini,
  serviceContextFromDefaults,
  SimpleDirectoryReader,
} from "llamaindex";
import path from "path";

export class RAGService {
  private static instance: RAGService;
  private gemini: Gemini;

  private constructor(apiKey: string) {
    this.gemini = new Gemini({
      apiKey,
      model: "gemini-2.5-pro",
    });
  }

  public static getInstance(apiKey: string): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService(apiKey);
    }
    return RAGService.instance;
  }

  public async createAndQuery(filePath: string, query: string): Promise<string> {
    console.log(`[RAGService] Starting RAG query for file: ${filePath}`);

    try {
      // 1. Use SimpleDirectoryReader to load documents. This automatically handles
      // different file types like .pdf, .md, .txt, etc.
      const reader = new SimpleDirectoryReader();
      // It expects a directory, so we pass the directory of the file
      // and then filter to load only the specific file.
      const documents = await reader.loadData({
          directoryPath: path.dirname(filePath),
          fs: {
              ...require('fs/promises'),
              readdir: async (dirPath) => {
                  if (dirPath === path.dirname(filePath)) {
                      return [path.basename(filePath)]; // Only "read" the target file
                  }
                  return [];
              }
          }
      });
      console.log(`[RAGService] Document loaded successfully using SimpleDirectoryReader.`);

      // 2. Create a service context with the Gemini model
      const serviceContext = serviceContextFromDefaults({
        llm: this.gemini,
      });
      console.log(`[RAGService] Service context created.`);

      // 3. Create an in-memory vector store index from the loaded documents
      const index = await VectorStoreIndex.fromDocuments(documents, {
        serviceContext,
      });
      console.log(`[RAGService] In-memory index created.`);

      // 4. Create a query engine
      const queryEngine = index.asQueryEngine();
      console.log(`[RAGService] Query engine created.`);

      // 5. Execute the query
      const response = await queryEngine.query({ query });
      console.log(`[RAGService] Query executed successfully.`);

      return response.toString();
    } catch (error) {
      console.error("[RAGService] Error during RAG pipeline execution:", error);
      throw new Error("Failed to process document and execute query.");
    }
  }
}
