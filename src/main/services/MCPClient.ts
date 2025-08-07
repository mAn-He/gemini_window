/**
 * =====================================================================================
 * MCPClient.ts
 * 역할: MCP (Model Context Protocol) 클라이언트 구현
 * 책임: MCP 서버와의 통신, 도구 호출, 컨텍스트 관리
 * =====================================================================================
 */

import { EventEmitter } from 'events';
import * as net from 'net';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

// MCP 프로토콜 타입 정의
export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  description?: string;
  version?: string;
}

export interface MCPClientOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class MCPClient extends EventEmitter {
  private servers: Map<string, MCPServerConnection> = new Map();
  private messageId = 0;
  private options: MCPClientOptions;

  constructor(options: MCPClientOptions = {}) {
    super();
    this.options = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  /**
   * MCP 서버에 연결
   */
  async connectToServer(config: MCPServerConfig): Promise<void> {
    console.log(`[MCP] Connecting to server: ${config.name}`);

    try {
      const connection = new MCPServerConnection(config, this.options);
      await connection.connect();
      
      this.servers.set(config.name, connection);
      
      // 서버 초기화
      await this.initializeServer(config.name);
      
      console.log(`[MCP] Successfully connected to server: ${config.name}`);
      this.emit('serverConnected', config.name);

    } catch (error) {
      console.error(`[MCP] Failed to connect to server ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * 서버 초기화 (capabilities 교환 등)
   */
  private async initializeServer(serverName: string): Promise<void> {
    const connection = this.servers.get(serverName);
    if (!connection) throw new Error(`Server ${serverName} not found`);

    // Initialize 요청
    const initResponse = await connection.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      clientInfo: {
        name: 'Gemini Desktop',
        version: '1.0.0',
      },
    });

    console.log(`[MCP] Server ${serverName} capabilities:`, initResponse.result);

    // Initialized 알림
    await connection.sendNotification('initialized', {});

    // 사용 가능한 도구 목록 요청
    const toolsResponse = await connection.sendRequest('tools/list', {});
    connection.setTools(toolsResponse.result?.tools || []);

    // 사용 가능한 리소스 목록 요청
    try {
      const resourcesResponse = await connection.sendRequest('resources/list', {});
      connection.setResources(resourcesResponse.result?.resources || []);
    } catch (error) {
      // 리소스를 지원하지 않는 서버일 수 있음
      console.log(`[MCP] Server ${serverName} does not support resources`);
    }
  }

  /**
   * 서버 연결 해제
   */
  async disconnectFromServer(serverName: string): Promise<void> {
    const connection = this.servers.get(serverName);
    if (connection) {
      await connection.disconnect();
      this.servers.delete(serverName);
      console.log(`[MCP] Disconnected from server: ${serverName}`);
      this.emit('serverDisconnected', serverName);
    }
  }

  /**
   * 도구 호출
   */
  async callTool(
    serverName: string, 
    toolName: string, 
    arguments_: Record<string, any>
  ): Promise<any> {
    const connection = this.servers.get(serverName);
    if (!connection) {
      throw new Error(`Server ${serverName} not connected`);
    }

    console.log(`[MCP] Calling tool ${toolName} on server ${serverName}:`, arguments_);

    const response = await connection.sendRequest('tools/call', {
      name: toolName,
      arguments: arguments_,
    });

    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * 리소스 읽기
   */
  async readResource(serverName: string, uri: string): Promise<any> {
    const connection = this.servers.get(serverName);
    if (!connection) {
      throw new Error(`Server ${serverName} not connected`);
    }

    console.log(`[MCP] Reading resource ${uri} from server ${serverName}`);

    const response = await connection.sendRequest('resources/read', {
      uri: uri,
    });

    if (response.error) {
      throw new Error(`Resource read failed: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * 연결된 서버 목록 조회
   */
  getConnectedServers(): string[] {
    return Array.from(this.servers.keys());
  }

  /**
   * 서버의 사용 가능한 도구 목록 조회
   */
  getServerTools(serverName: string): MCPTool[] {
    const connection = this.servers.get(serverName);
    return connection?.getTools() || [];
  }

  /**
   * 서버의 사용 가능한 리소스 목록 조회
   */
  getServerResources(serverName: string): MCPResource[] {
    const connection = this.servers.get(serverName);
    return connection?.getResources() || [];
  }

  /**
   * 모든 서버의 도구 목록 조회
   */
  getAllTools(): Record<string, MCPTool[]> {
    const result: Record<string, MCPTool[]> = {};
    for (const [serverName, connection] of this.servers) {
      result[serverName] = connection.getTools();
    }
    return result;
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    console.log('[MCP] Cleaning up MCP client...');
    
    const disconnectPromises = Array.from(this.servers.keys()).map(
      serverName => this.disconnectFromServer(serverName)
    );
    
    await Promise.all(disconnectPromises);
    console.log('[MCP] MCP client cleanup completed');
  }
}

/**
 * 개별 MCP 서버 연결 관리
 */
class MCPServerConnection {
  private config: MCPServerConfig;
  private options: MCPClientOptions;
  private process: ChildProcess | null = null;
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];
  private pendingRequests: Map<string | number, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(config: MCPServerConfig, options: MCPClientOptions) {
    this.config = config;
    this.options = options;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // MCP 서버 프로세스 시작
      this.process = spawn(this.config.command, this.config.args || [], {
        cwd: this.config.cwd,
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 에러 처리
      this.process.on('error', (error) => {
        console.error(`[MCP] Server process error for ${this.config.name}:`, error);
        reject(error);
      });

      this.process.on('exit', (code, signal) => {
        console.log(`[MCP] Server ${this.config.name} exited with code ${code}, signal ${signal}`);
        this.cleanup();
      });

      // stdout에서 JSON-RPC 메시지 파싱
      let buffer = '';
      this.process.stdout?.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // 완전한 JSON 메시지 파싱
        let lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 마지막 불완전한 라인 보관
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const message: MCPMessage = JSON.parse(line.trim());
              this.handleMessage(message);
            } catch (error) {
              console.error(`[MCP] Failed to parse message from ${this.config.name}:`, line);
            }
          }
        }
      });

      // stderr 로깅
      this.process.stderr?.on('data', (chunk) => {
        console.error(`[MCP] Server ${this.config.name} stderr:`, chunk.toString());
      });

      // 연결 성공으로 간주 (프로세스가 시작되면)
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          resolve();
        } else {
          reject(new Error('Server process failed to start'));
        }
      }, 1000);
    });
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      
      // 강제 종료 타이머
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
    this.cleanup();
  }

  private cleanup(): void {
    // 대기 중인 모든 요청 거부
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  async sendRequest(method: string, params?: any): Promise<MCPMessage> {
    return new Promise((resolve, reject) => {
      if (!this.process || this.process.killed) {
        reject(new Error('Server not connected'));
        return;
      }

      const id = this.getMessageId();
      const message: MCPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      // 타임아웃 설정
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.options.timeout);

      // 요청 등록
      this.pendingRequests.set(id, { resolve, reject, timeout });

      // 메시지 전송
      const messageStr = JSON.stringify(message) + '\n';
      this.process.stdin?.write(messageStr);
    });
  }

  async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.process || this.process.killed) {
      throw new Error('Server not connected');
    }

    const message: MCPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };

    const messageStr = JSON.stringify(message) + '\n';
    this.process.stdin?.write(messageStr);
  }

  private handleMessage(message: MCPMessage): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      // 응답 메시지 처리
      const request = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      clearTimeout(request.timeout);
      request.resolve(message);
    } else {
      // 알림 메시지 처리
      console.log(`[MCP] Notification from ${this.config.name}:`, message);
    }
  }

  private getMessageId(): number {
    return Date.now() + Math.random();
  }

  setTools(tools: MCPTool[]): void {
    this.tools = tools;
  }

  setResources(resources: MCPResource[]): void {
    this.resources = resources;
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  getResources(): MCPResource[] {
    return this.resources;
  }
}

export default MCPClient; 