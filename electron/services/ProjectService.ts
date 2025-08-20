import { ChromaClient } from "chromadb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { PromptTemplate } from "@langchain/core/prompts";
import path from "path";
import fs from "fs/promises";
import { app } from "electron";

// Define the structure of a Project
interface Project {
  id: string;
  name: string;
  files: string[]; // Store file paths
}

export class ProjectService {
  private static instance: ProjectService;
  private chromaClient: ChromaClient;
  private embeddings: GoogleGenerativeAIEmbeddings;
  private llm: ChatGoogleGenerativeAI;
  private projects: Record<string, Project> = {}; // In-memory project store
  private projectStorePath: string;


  private constructor(apiKey: string) {
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      modelName: "gemini-2.5-pro",
      maxOutputTokens: 2048,
    });
    this.embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: apiKey,
        modelName: "text-embedding-004", // As requested
        taskType: TaskType.RETRIEVAL_DOCUMENT,
    });
    this.chromaClient = new ChromaClient(); // This will use the default transient ChromaDB
    this.projectStorePath = path.join(app.getPath("userData"), "projects.json");
    this.loadProjects();
  }

  public static getInstance(apiKey: string): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService(apiKey);
    }
    return ProjectService.instance;
  }

  // --- Project Management ---

  private async loadProjects() {
    try {
      const data = await fs.readFile(this.projectStorePath, "utf-8");
      this.projects = JSON.parse(data);
    } catch (error) {
      // If the file doesn't exist or is invalid, start with an empty object
      this.projects = {};
    }
  }

  private async saveProjects() {
    await fs.writeFile(this.projectStorePath, JSON.stringify(this.projects, null, 2));
  }

  public async createProject(name: string): Promise<Project> {
    const id = `proj_${new Date().getTime()}`;
    const newProject: Project = { id, name, files: [] };
    this.projects[id] = newProject;
    await this.saveProjects();
    // Also create a corresponding vector store collection
    await this.chromaClient.createCollection({ name: id });
    return newProject;
  }

  public async getProjects(): Promise<Project[]> {
    return Object.values(this.projects);
  }

  // --- RAG Pipeline ---

  public async addFileToProject(projectId: string, filePath: string): Promise<void> {
    const project = this.projects[projectId];
    if (!project) {
      throw new Error(`Project with ID "${projectId}" not found.`);
    }
    if (project.files.includes(filePath)) {
        console.log(`File ${filePath} already exists in project ${projectId}. Skipping.`);
        return;
    }

    console.log(`Adding file ${filePath} to project ${projectId}`);

    // 1. Load the document based on file type
    const extension = path.extname(filePath).toLowerCase();
    let loader;
    if (extension === ".pdf") {
      loader = new PDFLoader(filePath);
    } else if ([".js", ".ts", ".md", ".txt", ".json"].includes(extension)) {
      loader = new TextLoader(filePath);
    } else {
      throw new Error(`Unsupported file type: ${extension}`);
    }
    const docs = await loader.load();

    // 2. Split the document into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await textSplitter.splitDocuments(docs);

    // 3. Get the ChromaDB collection for the project
    const collection = await this.chromaClient.getCollection({
        name: projectId,
        embeddingFunction: this.embeddings
    });

    // 4. Add chunks to the collection
    await collection.add({
        ids: chunks.map((_, idx) => `${path.basename(filePath)}-${idx}`),
        documents: chunks.map(chunk => chunk.pageContent),
        metadatas: chunks.map(chunk => ({...chunk.metadata, source: path.basename(filePath)})),
    });

    // 5. Update project file list and save
    project.files.push(filePath);
    await this.saveProjects();

    console.log(`Successfully added ${chunks.length} chunks from ${filePath} to project ${projectId}`);
  }

  public async chatInProject(projectId: string, question: string): Promise<string> {
    const project = this.projects[projectId];
    if (!project) {
      throw new Error(`Project with ID "${projectId}" not found.`);
    }

    // 1. Get the collection
    const collection = await this.chromaClient.getCollection({
        name: projectId,
        embeddingFunction: this.embeddings
    });

    // 2. Query for relevant documents
    const results = await collection.query({
      nResults: 5,
      queryTexts: [question],
    });

    const context = results.documents[0].join("\n\n---\n\n");

    // 3. Create a prompt template
    const promptTemplate = PromptTemplate.fromTemplate(
      `You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.
      Context: {context}
      Question: {question}
      Answer:`
    );

    // 4. Invoke the LLM with the prompt
    const chain = promptTemplate.pipe(this.llm);
    const response = await chain.invoke({
        context: context,
        question: question,
    });

    return response.content.toString();
  }
}
