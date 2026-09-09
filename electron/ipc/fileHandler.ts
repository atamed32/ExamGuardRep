import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class FileHandler {
  public register(mainWindow: BrowserWindow): void {
    // Open File Dialog
    ipcMain.handle('dialog:showOpenDialog', async (_event, options) => {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      const dialogOpts = {
        title: options?.title || 'Ouvrir un fichier',
        defaultPath: options?.defaultPath,
        filters: options?.filters || [
          { name: 'Projets ExamGuard (*.examguard, *.json)', extensions: ['examguard', 'json'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: options?.properties || ['openFile']
      };
      if (win && !win.isDestroyed()) {
        return await dialog.showOpenDialog(win, dialogOpts);
      }
      return await dialog.showOpenDialog(dialogOpts);
    });

    // Save File Dialog
    ipcMain.handle('dialog:showSaveDialog', async (_event, options) => {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      const dialogOpts = {
        title: options?.title || 'Enregistrer sous',
        defaultPath: options?.defaultPath,
        filters: options?.filters || [
          { name: 'Projet ExamGuard (*.examguard)', extensions: ['examguard'] },
          { name: 'Fichier JSON (*.json)', extensions: ['json'] },
          { name: 'Document PDF (*.pdf)', extensions: ['pdf'] },
          { name: 'Feuille de calcul CSV (*.csv)', extensions: ['csv'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ]
      };
      if (win && !win.isDestroyed()) {
        return await dialog.showSaveDialog(win, dialogOpts);
      }
      return await dialog.showSaveDialog(dialogOpts);
    });

    // Message Box Dialog
    ipcMain.handle('dialog:showMessageBox', async (_event, options) => {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      const dialogOpts = {
        type: options?.type || 'info',
        title: options?.title || 'ExamGuard',
        message: options?.message || '',
        detail: options?.detail || '',
        buttons: options?.buttons || ['OK'],
        defaultId: options?.defaultId || 0,
        cancelId: options?.cancelId
      };
      if (win && !win.isDestroyed()) {
        return await dialog.showMessageBox(win, dialogOpts);
      }
      return await dialog.showMessageBox(dialogOpts);
    });

    // Read File
    ipcMain.handle('file:readFile', async (_event, filePath: string) => {
      try {
        if (!fs.existsSync(filePath)) {
          return { success: false, error: 'Fichier introuvable.' };
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return { success: true, data };
      } catch (e: any) {
        return { success: false, error: e.message || 'Erreur de lecture du fichier.' };
      }
    });

    // Write File
    ipcMain.handle('file:writeFile', async (_event, filePath: string, data: string) => {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, data, 'utf8');
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message || 'Erreur d\'écriture du fichier.' };
      }
    });

    // Open Path with system default application
    ipcMain.handle('file:openPath', async (_event, filePath: string) => {
      try {
        const result = await shell.openPath(filePath);
        if (result) {
          return { success: false, error: result };
        }
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    });

    // Show in Windows Explorer folder
    ipcMain.handle('file:showItemInFolder', async (_event, filePath: string) => {
      shell.showItemInFolder(filePath);
    });
  }
}
