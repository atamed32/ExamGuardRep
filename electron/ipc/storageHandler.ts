import { ipcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class StorageHandler {
  private filePath: string;
  private cache: Record<string, string> = {};
  private isLoaded = false;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'examguard-storage.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.cache = JSON.parse(raw);
      } else {
        this.cache = {};
      }
      this.isLoaded = true;
    } catch (e) {
      console.error('Failed to load storage from disk:', e);
      this.cache = {};
      this.isLoaded = true;
    }
  }

  private saveToDisk(): void {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.cache, null, 2), 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (e) {
      console.error('Failed to save storage to disk:', e);
    }
  }

  public register(): void {
    ipcMain.handle('storage:getItem', async (_event, key: string) => {
      if (!this.isLoaded) this.loadFromDisk();
      return this.cache[key] ?? null;
    });

    ipcMain.handle('storage:setItem', async (_event, key: string, value: string) => {
      if (!this.isLoaded) this.loadFromDisk();
      this.cache[key] = value;
      this.saveToDisk();
      return true;
    });

    ipcMain.handle('storage:removeItem', async (_event, key: string) => {
      if (!this.isLoaded) this.loadFromDisk();
      delete this.cache[key];
      this.saveToDisk();
      return true;
    });

    ipcMain.handle('storage:clear', async () => {
      this.cache = {};
      this.saveToDisk();
      return true;
    });

    ipcMain.handle('storage:getAll', async () => {
      if (!this.isLoaded) this.loadFromDisk();
      return { ...this.cache };
    });
  }
}
