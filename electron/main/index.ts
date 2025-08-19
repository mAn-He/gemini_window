import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { SupervisorAgent } from '../agents/SupervisorAgent';
import { CanvasService } from '../services/CanvasService'; // Assuming this service will be created
import { RAGService } from '../services/RAGService';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: BrowserWindow | null = null;
let mcpServerProcess: ChildProcess | null = null;

// --- MCP Server Management ---
function startMcpServer() {
  if (mcpServerProcess) return;

  console.log('Attempting to start MCP Server...');

  const packageName = '@modelcontextprotocol/server-filesystem';
  let mcpScriptPath: string;

  try {
    // Use require.resolve to reliably find the package's main script
    mcpScriptPath = require.resolve(packageName);
    console.log('Found MCP Script Path:', mcpScriptPath);
  } catch (error) {
    console.error(`Failed to locate MCP Server package: ${packageName}. Please ensure it is installed.`, error);
    // Optionally, notify the renderer process of the failure
    win?.webContents.send('mcp-status', { status: 'error', message: 'MCP server package not found.' });
    return;
  }

  const workspacePath = app.getPath('documents');

  try {
    mcpServerProcess = spawn('node', [mcpScriptPath], {
      stdio: 'pipe',
      detached: false, // Tied to the app's lifecycle
      cwd: workspacePath,
      shell: false, // More secure and consistent
    });

    if (!mcpServerProcess) {
        throw new Error("Failed to spawn MCP process.");
    }

    mcpServerProcess.stdout?.on('data', (data) => {
        const message = data.toString();
        console.log(`[MCP Server]: ${message}`);
        win?.webContents.send('mcp-status', { status: 'running', message });
    });

    mcpServerProcess.stderr?.on('data', (data) => {
        const message = data.toString();
        console.error(`[MCP Server Error]: ${message}`);
        win?.webContents.send('mcp-status', { status: 'error', message });
    });

    mcpServerProcess.on('close', (code) => {
        console.log(`MCP Server exited with code ${code}`);
        win?.webContents.send('mcp-status', { status: 'stopped', message: `Exited with code ${code}` });
        mcpServerProcess = null;
    });

  } catch (error) {
    console.error('Failed to start MCP Server:', error);
    win?.webContents.send('mcp-status', { status: 'error', message: 'Failed to spawn MCP process.' });
  }
}

function killMcpServer() {
    if (mcpServerProcess) {
        console.log('Terminating MCP Server...');
        mcpServerProcess.kill();
        mcpServerProcess = null;
    }
}

// --- Agent and Service Initialization ---
// It's better to initialize these on-demand via IPC calls
// to avoid high startup costs.
let canvasService: CanvasService | null = null;
function getCanvasService() {
    if (!canvasService) {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) throw new Error("GEMINI_API_KEY environment variable is not set.");
        canvasService = new CanvasService(geminiApiKey);
    }
    return canvasService;
}


// --- Window Creation ---
async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'), // Correct path to preload script
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the index.html of the app.
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Open the DevTools.
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  win.on('closed', () => {
    win = null;
  });
}

// --- App Lifecycle ---
app.whenReady().then(() => {
    createWindow();
    startMcpServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
    killMcpServer();
});


// --- IPC Handlers ---
ipcMain.handle('run-supervisor', async (event, query: string) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const tavilyApiKey = process.env.TAVILY_API_KEY;

    if (!geminiApiKey || !tavilyApiKey) {
        return { error: "API keys for Gemini or Tavily are not set in environment variables." };
    }

    const supervisor = await SupervisorAgent.create(geminiApiKey, tavilyApiKey);

    // Define a callback to send updates to the renderer
    const updateCallback = (update: any) => {
        event.sender.send('agent-update', update);
    };

    try {
        const result = await supervisor.run(query, updateCallback);
        return { response: result };
    } catch (error: any) {
        console.error("Supervisor agent failed:", error);
        return { error: error.message || "An unknown error occurred in the supervisor agent." };
    }
});

ipcMain.handle('run-canvas-ai', async (event, userPrompt: string, canvasState: any) => {
    try {
        const service = getCanvasService();
        const result = await service.generateCanvasUpdate(userPrompt, canvasState);
        // The service itself sends the update via the callback passed to it.
        // We can use the main window's webContents to send the final result or confirmation.
        win?.webContents.send('canvas:update', result);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Canvas AI service failed:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('run-rag-query', async (event, filePath: string, query: string) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
        return { error: "GEMINI_API_KEY is not set." };
    }

    try {
        const ragService = RAGService.getInstance(geminiApiKey);
        const result = await ragService.createAndQuery(filePath, query);
        return { response: result };
    } catch (error: any) {
        console.error("RAG service failed:", error);
        return { error: error.message || "An unknown error occurred in the RAG service." };
    }
});
