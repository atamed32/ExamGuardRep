import { ipcMain, app, BrowserWindow } from 'electron';

export class AppHandler {
  public register(mainWindow: BrowserWindow): void {
    ipcMain.handle('app:getVersion', () => app.getVersion());

    ipcMain.handle('app:getPath', (_event, name: 'home' | 'appData' | 'userData' | 'documents' | 'downloads' | 'desktop') => {
      try {
        return app.getPath(name);
      } catch {
        return '';
      }
    });

    ipcMain.handle('app:minimize', () => {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      if (win) win.minimize();
    });

    ipcMain.handle('app:maximize', () => {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      if (win) {
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
      }
    });

    ipcMain.handle('app:close', () => {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      if (win) win.close();
    });

    ipcMain.handle('app:isMaximized', () => {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      return win ? win.isMaximized() : false;
    });
  }
}
