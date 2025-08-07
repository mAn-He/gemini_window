
// src/services/DatabaseService.js
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import SettingsService, { AppSettings } from './SettingsService'; // Import SettingsService

class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;
  private dbPath: string;

  private constructor() {
    // This part will be changed to be dynamic
    this.dbPath = ''; // Initialized dynamically
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async init(): Promise<void> {
    if (this.db) {
      console.log('Database already initialized.');
      return;
    }

    // Load settings to determine the database path
    const settings = await SettingsService.getSettings();
    const storageDir = settings.storagePath;

    // Ensure the directory exists
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    this.dbPath = path.join(storageDir, 'cognition-core.db');
    console.log(`Database will be stored at: ${this.dbPath}`);

    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      console.log('Database connection opened.');
      await this.createTables();
      console.log('Database tables verified/created.');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const createContentTable = `
      CREATE TABLE IF NOT EXISTS classified_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        topic TEXT NOT NULL,
        keywords TEXT, -- JSON array
        content TEXT NOT NULL,
        url TEXT,
        category TEXT NOT NULL,
        sentiment TEXT,
        has_images BOOLEAN,
        model_used TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createProjectsTable = `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    const createCanvasProjectsTable = `
      CREATE TABLE IF NOT EXISTS canvas_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createMCPServersTable = `
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        command TEXT NOT NULL,
        args TEXT,
        env TEXT,
        status TEXT DEFAULT 'disconnected',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.db.exec(createContentTable);
    await this.db.exec(createProjectsTable);
    await this.db.exec(createCanvasProjectsTable);
    await this.db.exec(createMCPServersTable);
  }

  // Add methods to interact with the database, e.g., addProject, getProjects, etc.
  public getDatabase(): Database {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  public async addProject(name: string, description: string): Promise<number | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.run(
      'INSERT INTO projects (name, description) VALUES (?, ?)',
      [name, description]
    );
    return result.lastID;
  }
}

export default DatabaseService;
