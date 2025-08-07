import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

export type StorageLocation = 'local' | 'onedrive' | 'googledrive';

export interface AppSettings {
  storageLocation: StorageLocation;
  storagePath: string;
}

const defaultSettings: AppSettings = {
  storageLocation: 'local',
  storagePath: 'G:\\내 드라이브\\GEMINI_APP_STORAGE'
};

class SettingsService {
  private settingsFilePath: string;
  private settings: AppSettings | null = null;

  constructor() {
    this.settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
  }

  async loadSettings(): Promise<AppSettings> {
    if (this.settings) {
      return this.settings;
    }

    try {
      await fs.access(this.settingsFilePath);
      const fileContent = await fs.readFile(this.settingsFilePath, 'utf-8');
      this.settings = JSON.parse(fileContent);
      console.log('Settings loaded:', this.settings);
      return this.settings!;
    } catch (error) {
      console.log('Settings file not found. Creating with default settings.');
      this.settings = { ...defaultSettings };
      await this.saveSettings(this.settings);
      return this.settings;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.settings = settings;
    await fs.writeFile(this.settingsFilePath, JSON.stringify(this.settings, null, 2), 'utf-8');
    console.log('Settings saved:', this.settings);
  }

  async getSettings(): Promise<AppSettings> {
    return await this.loadSettings();
  }
}

export default new SettingsService(); 