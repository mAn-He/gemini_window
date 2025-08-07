import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import DatabaseService from './services/DatabaseService'
import { MultimodalAIService } from './services/MultimodalAIService';
import SettingsService, { AppSettings } from './services/SettingsService';
import { DeepResearchAgent } from './services/DeepResearchAgent'
import MCPClient from './services/MCPClient';
import MCPConfigService from './services/MCPConfigService';
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Global instances
let deepResearchAgent: DeepResearchAgent | null = null;
let aiService: MultimodalAIService | null = null;
let mcpClient: MCPClient | null = null;

// MCP 서버 자동 초기화 함수
async function initializeMCPServers() {
  try {
    const configService = MCPConfigService.getInstance();
    const config = await configService.loadConfig();
    
    console.log('🔌 Loading MCP servers from config...');
    
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      try {
        console.log(`🔧 Connecting to ${serverName}...`);
        
        // MCPClient에 서버 연결
        await mcpClient?.connectToServer({
          name: serverName,
          command: serverConfig.command,
          args: serverConfig.args,
          env: serverConfig.env || {},
          description: serverConfig.description || `Auto-loaded MCP server: ${serverName}`
        });

        // 데이터베이스에 서버 정보 저장
        const db = DatabaseService.getInstance().getDatabase();
        await db.run(
          'INSERT OR REPLACE INTO mcp_servers (name, description, command, args, env, status) VALUES (?, ?, ?, ?, ?, ?)',
          [
            serverName,
            serverConfig.description || `Auto-loaded from config: ${serverName}`,
            serverConfig.command,
            JSON.stringify(serverConfig.args),
            JSON.stringify(serverConfig.env || {}),
            'connected'
          ]
        );

        console.log(`✅ Successfully connected to ${serverName}`);
      } catch (error) {
        console.error(`❌ Failed to connect to ${serverName}:`, error);
        
        // 연결 실패 시에도 데이터베이스에 기록 (상태를 error로)
        try {
          const db = DatabaseService.getInstance().getDatabase();
          await db.run(
            'INSERT OR REPLACE INTO mcp_servers (name, description, command, args, env, status) VALUES (?, ?, ?, ?, ?, ?)',
            [
              serverName,
              serverConfig.description || `Auto-loaded from config: ${serverName}`,
              serverConfig.command,
              JSON.stringify(serverConfig.args),
              JSON.stringify(serverConfig.env || {}),
              'error'
            ]
          );
        } catch (dbError) {
          console.error('Failed to save server info to database:', dbError);
        }
      }
    }

    console.log('🎉 MCP server initialization completed');
  } catch (error) {
    console.error('❌ Error initializing MCP servers:', error);
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    // ...(process.platform === 'linux' ? { icon } : {}), // <-- Temporarily disable
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  try {
    await DatabaseService.getInstance().init();
    
    // Initialize AI Service
    aiService = new MultimodalAIService();
    console.log('✅ MultimodalAIService initialized');
    
    // Initialize Deep Research Agent
    deepResearchAgent = new DeepResearchAgent();
    console.log('✅ DeepResearchAgent initialized');

    // Initialize MCP Client
    mcpClient = new MCPClient();
    console.log('✅ MCPClient initialized');

    // Initialize MCP Config Service and auto-connect servers
    await initializeMCPServers();
  } catch (error) {
    console.error('Failed to initialize services on startup:', error);
    // Optionally, show an error dialog to the user
  }
  
  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    // 개발 환경에서만 F12 키로 개발자 도구 토글
    if (is.dev) {
      window.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') {
          if (window.webContents.isDevToolsOpened()) {
            window.webContents.closeDevTools();
          } else {
            window.webContents.openDevTools();
          }
        }
      });
    }
    // optimizer.watch(window) // This line causes issues, so we comment it out.
  })

  // IPC handlers
  ipcMain.handle('send-message', async (event, message: string, modelName: string) => {
    console.log('Message received from UI:', message);
    try {
      if (!aiService) {
        throw new Error('AI Service not initialized');
      }
      // Pass the message to the AI service
      const aiResponse = await aiService.generateText(message, modelName);
      return aiResponse;
    } catch (error) {
      console.error("Error communicating with AI Service:", error);
      return "Sorry, there was an error processing your request.";
    }
  });

  ipcMain.handle('get-settings', async () => {
    return await SettingsService.getSettings();
  });

  ipcMain.handle('save-settings', async (event, settings: AppSettings) => {
    await SettingsService.saveSettings(settings);
    // You might want to re-initialize services that depend on settings, like the database.
    // For now, we'll rely on an app restart.
  });

  ipcMain.handle('open-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx', 'pptx'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
      ]
    });
    if (!canceled && filePaths.length > 0) {
      return filePaths[0];
    }
    return null;
  });

  ipcMain.handle('process-file', async (event, filePath: string, prompt: string) => {
    try {
      if (!aiService) {
        throw new Error('AI Service not initialized');
      }
      return await aiService.processFile(filePath, prompt);
    } catch (error) {
      console.error('Error processing file:', error);
      return 'Sorry, there was an error processing the file.';
    }
  });

  // Deep Research Agent IPC handlers
  ipcMain.handle('deep-research', async (event, prompt: string, modelName: string) => {
    try {
      if (!deepResearchAgent) {
        console.warn('DeepResearchAgent not available, falling back to legacy method');
        if (!aiService) {
          throw new Error('AI Service not initialized');
        }
        return await aiService.generateTextWithDeepResearch(prompt, modelName);
      }

      // Use the new LangChain-based Deep Research Agent
      console.log(`🚀 Starting LangChain Deep Research for: "${prompt}"`);
      const result = await deepResearchAgent.run(prompt);
      
      return {
        answer: result.synthesis || "Deep research completed but no synthesis available.",
        refinedQuery: result.clarifiedQuery || prompt
      };
    } catch (error) {
      console.error('Error in deep-research IPC handler:', error);
      return {
        answer: 'Failed to execute deep research.',
        refinedQuery: prompt
      };
    }
  });

  // Deep Research Agent continuation IPC handler (for user interactions)
  ipcMain.handle('deep-research-continue', async (event, userInput: string, previousState: any) => {
    try {
      if (!deepResearchAgent) {
        throw new Error('DeepResearchAgent not available');
      }

      console.log(`🔄 Continuing Deep Research with user input: "${userInput}"`);
      const result = await deepResearchAgent.run(userInput, previousState);
      
      return {
        answer: result.synthesis || "",
        refinedQuery: result.clarifiedQuery || userInput,
        state: result // Return full state for potential continuation
      };
    } catch (error) {
      console.error('Error in deep-research-continue IPC handler:', error);
      return {
        answer: 'Failed to continue deep research.',
        refinedQuery: userInput,
        state: null
      };
    }
  });

  // Canvas IPC handlers
  ipcMain.handle('load-canvas-project', async (event, projectId: string) => {
    try {
      // Load canvas project from database or file system
      const db = DatabaseService.getInstance().getDatabase();
      const project = await db.get('SELECT * FROM canvas_projects WHERE id = ?', [projectId]);
      return project ? JSON.parse(project.data) : null;
    } catch (error) {
      console.error('Error loading canvas project:', error);
      return null;
    }
  });

  ipcMain.handle('save-canvas-project', async (event, project: any) => {
    try {
      const db = DatabaseService.getInstance().getDatabase();
      await db.run(
        'INSERT OR REPLACE INTO canvas_projects (id, name, data, updated_at) VALUES (?, ?, ?, ?)',
        [project.id, project.name, JSON.stringify(project), new Date().toISOString()]
      );
      return true;
    } catch (error) {
      console.error('Error saving canvas project:', error);
      return false;
    }
  });

  ipcMain.handle('update-canvas-node', async (event, nodeId: string, nodeData: any) => {
    try {
      // Update specific node data (for real-time collaboration)
      // This could be expanded for multi-user scenarios
      return true;
    } catch (error) {
      console.error('Error updating canvas node:', error);
      return false;
    }
  });

  // MCP IPC handlers
  ipcMain.handle('get-mcp-servers', async () => {
    try {
      const db = DatabaseService.getInstance().getDatabase();
      const servers = await db.all('SELECT * FROM mcp_servers');
      return servers.map(server => ({
        ...server,
        env: server.env ? JSON.parse(server.env) : {},
        args: server.args ? JSON.parse(server.args) : []
      }));
    } catch (error) {
      console.error('Error getting MCP servers:', error);
      return [];
    }
  });

  ipcMain.handle('add-mcp-server', async (event, serverConfig: any) => {
    try {
      const db = DatabaseService.getInstance().getDatabase();
      await db.run(
        'INSERT INTO mcp_servers (name, description, command, args, env, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          serverConfig.name,
          serverConfig.description,
          serverConfig.command,
          JSON.stringify(serverConfig.args || []),
          JSON.stringify(serverConfig.env || {}),
          'disconnected'
        ]
      );
      return true;
    } catch (error) {
      console.error('Error adding MCP server:', error);
      return false;
    }
  });

  ipcMain.handle('connect-mcp-server', async (event, serverName: string) => {
    try {
      if (!mcpClient) {
        throw new Error('MCP Client not initialized');
      }

      const db = DatabaseService.getInstance().getDatabase();
      const server = await db.get('SELECT * FROM mcp_servers WHERE name = ?', [serverName]);
      
      if (!server) {
        throw new Error(`Server ${serverName} not found`);
      }

      const serverConfig = {
        name: server.name,
        command: server.command,
        args: server.args ? JSON.parse(server.args) : [],
        env: server.env ? JSON.parse(server.env) : {},
        description: server.description
      };

      await mcpClient.connectToServer(serverConfig);
      
      // Update status in database
      await db.run('UPDATE mcp_servers SET status = ? WHERE name = ?', ['connected', serverName]);
      
      return true;
    } catch (error) {
      console.error(`Error connecting to MCP server ${serverName}:`, error);
      throw error;
    }
  });

  ipcMain.handle('disconnect-mcp-server', async (event, serverName: string) => {
    try {
      if (!mcpClient) {
        throw new Error('MCP Client not initialized');
      }

      await mcpClient.disconnectFromServer(serverName);
      
      // Update status in database
      const db = DatabaseService.getInstance().getDatabase();
      await db.run('UPDATE mcp_servers SET status = ? WHERE name = ?', ['disconnected', serverName]);
      
      return true;
    } catch (error) {
      console.error(`Error disconnecting MCP server ${serverName}:`, error);
      return false;
    }
  });

  ipcMain.handle('delete-mcp-server', async (event, serverName: string) => {
    try {
      if (mcpClient) {
        try {
          await mcpClient.disconnectFromServer(serverName);
        } catch (error) {
          // Ignore disconnection errors when deleting
        }
      }

      const db = DatabaseService.getInstance().getDatabase();
      await db.run('DELETE FROM mcp_servers WHERE name = ?', [serverName]);
      
      return true;
    } catch (error) {
      console.error(`Error deleting MCP server ${serverName}:`, error);
      return false;
    }
  });

  ipcMain.handle('call-mcp-tool', async (event, serverName: string, toolName: string, args: any) => {
    try {
      if (!mcpClient) {
        throw new Error('MCP Client not initialized');
      }

      const result = await mcpClient.callTool(serverName, toolName, args);
      return result;
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName} on ${serverName}:`, error);
      throw error;
    }
  });

  // MCP Config IPC handlers
  ipcMain.handle('get-mcp-config-path', async () => {
    const configService = MCPConfigService.getInstance();
    return configService.getConfigPath();
  });

  ipcMain.handle('import-mcp-config', async (event, jsonConfig: string) => {
    try {
      const configService = MCPConfigService.getInstance();
      await configService.importConfig(jsonConfig);
      
      // Restart MCP connections with new config
      await initializeMCPServers();
      
      return true;
    } catch (error) {
      console.error('Error importing MCP config:', error);
      throw error;
    }
  });

  ipcMain.handle('export-mcp-config', async () => {
    try {
      const configService = MCPConfigService.getInstance();
      return await configService.exportConfig();
    } catch (error) {
      console.error('Error exporting MCP config:', error);
      throw error;
    }
  });

  ipcMain.handle('add-mcp-server-to-config', async (event, serverName: string, serverConfig: any) => {
    try {
      const configService = MCPConfigService.getInstance();
      await configService.addServer(serverName, {
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env,
        description: serverConfig.description
      });
      
      // Auto-connect the new server
      if (mcpClient) {
        await mcpClient.connectToServer({
          name: serverName,
          ...serverConfig
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error adding server to config:', error);
      throw error;
    }
  });

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  // Clean up resources
  if (deepResearchAgent) {
    await deepResearchAgent.cleanup();
  }
  if (mcpClient) {
    await mcpClient.cleanup();
  }
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here. 