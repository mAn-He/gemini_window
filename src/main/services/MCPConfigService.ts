import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  description?: string;
  disabled?: boolean; // optional: skip connecting on startup
}

interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export class MCPConfigService {
  private static instance: MCPConfigService;
  private configPath: string;
  private config: MCPConfig | null = null;

  private constructor() {
    // Claude Desktop style config path
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'mcp_config.json');
  }

  public static getInstance(): MCPConfigService {
    if (!MCPConfigService.instance) {
      MCPConfigService.instance = new MCPConfigService();
    }
    return MCPConfigService.instance;
  }

  /**
   * Load MCP configuration from file
   */
  public async loadConfig(): Promise<MCPConfig> {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(configData);
        console.log('✅ MCP config loaded:', Object.keys(this.config.mcpServers).length, 'servers');
        return this.config;
      } else {
        // Create default config file
        this.config = { mcpServers: {} };
        await this.saveConfig();
        console.log('📝 Created default MCP config file');
        return this.config;
      }
    } catch (error) {
      console.error('❌ Error loading MCP config:', error);
      this.config = { mcpServers: {} };
      return this.config;
    }
  }

  /**
   * Save MCP configuration to file
   */
  public async saveConfig(): Promise<void> {
    if (!this.config) return;

    try {
      const configData = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.configPath, configData, 'utf-8');
      console.log('💾 MCP config saved');
    } catch (error) {
      console.error('❌ Error saving MCP config:', error);
      throw error;
    }
  }

  /**
   * Add a new MCP server to config
   */
  public async addServer(name: string, serverConfig: MCPServerConfig): Promise<void> {
    if (!this.config) {
      await this.loadConfig();
    }

    this.config!.mcpServers[name] = serverConfig;
    await this.saveConfig();
  }

  /**
   * Remove MCP server from config
   */
  public async removeServer(name: string): Promise<void> {
    if (!this.config) {
      await this.loadConfig();
    }

    delete this.config!.mcpServers[name];
    await this.saveConfig();
  }

  /**
   * Get all configured servers
   */
  public async getServers(): Promise<Record<string, MCPServerConfig>> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!.mcpServers;
  }

  /**
   * Get config file path for UI display
   */
  public getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Import config from JSON string
   */
  public async importConfig(jsonConfig: string): Promise<void> {
    try {
      const newConfig = JSON.parse(jsonConfig) as MCPConfig;
      
      // Validate config structure
      if (!newConfig.mcpServers || typeof newConfig.mcpServers !== 'object') {
        throw new Error('Invalid config format: missing mcpServers object');
      }

      // Validate each server config
      for (const [name, serverConfig] of Object.entries(newConfig.mcpServers)) {
        if (!serverConfig.command || !Array.isArray(serverConfig.args)) {
          throw new Error(`Invalid server config for "${name}": missing command or args`);
        }
      }

      this.config = newConfig;
      await this.saveConfig();
      console.log('📥 MCP config imported successfully');
    } catch (error) {
      console.error('❌ Error importing MCP config:', error);
      throw error;
    }
  }

  /**
   * Export current config as JSON string
   */
  public async exportConfig(): Promise<string> {
    if (!this.config) {
      await this.loadConfig();
    }
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Watch config file for changes (optional)
   */
  public watchConfig(callback: (config: MCPConfig) => void): void {
    if (fs.existsSync(this.configPath)) {
      fs.watchFile(this.configPath, async () => {
        try {
          const newConfig = await this.loadConfig();
          callback(newConfig);
        } catch (error) {
          console.error('Error reloading config:', error);
        }
      });
    }
  }
}

export default MCPConfigService; 