import { app, BrowserWindow, screen } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1440,
  height: 900,
  isMaximized: false
};

export class WindowStateManager {
  private stateFilePath: string;
  private state: WindowState;

  constructor(filename = 'window-state.json') {
    this.stateFilePath = path.join(app.getPath('userData'), filename);
    this.state = this.loadState();
  }

  private loadState(): WindowState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf8');
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_STATE,
          ...parsed
        };
      }
    } catch (e) {
      console.warn('Failed to load window state, using default:', e);
    }
    return { ...DEFAULT_STATE };
  }

  public getState(): WindowState {
    return this.state;
  }

  public track(window: BrowserWindow): void {
    const saveState = () => {
      try {
        if (!window.isDestroyed()) {
          this.state.isMaximized = window.isMaximized();
          if (!this.state.isMaximized && !window.isMinimized()) {
            const bounds = window.getBounds();
            this.state.x = bounds.x;
            this.state.y = bounds.y;
            this.state.width = bounds.width;
            this.state.height = bounds.height;
          }
          fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf8');
        }
      } catch (e) {
        console.warn('Failed to save window state:', e);
      }
    };

    window.on('resize', saveState);
    window.on('move', saveState);
    window.on('close', saveState);
  }
}
