import { ipcMain, BrowserWindow, dialog, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class PrintHandler {
  public register(mainWindow: BrowserWindow): void {
    // Direct Print
    ipcMain.handle('print:direct', async (_event, options) => {
      try {
        const win = BrowserWindow.getFocusedWindow() || mainWindow;
        if (!win) return { success: false, error: 'Fenêtre non disponible.' };

        return await new Promise((resolve) => {
          win.webContents.print(
            {
              silent: options?.silent ?? false,
              printBackground: options?.printBackground ?? true,
              deviceName: options?.deviceName || ''
            },
            (success, failureReason) => {
              if (success) {
                resolve({ success: true });
              } else {
                resolve({ success: false, error: failureReason });
              }
            }
          );
        });
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    });

    // Print to PDF
    ipcMain.handle('print:toPDF', async (_event, options) => {
      try {
        const win = BrowserWindow.getFocusedWindow() || mainWindow;
        if (!win) return { success: false, error: 'Fenêtre non disponible.' };

        const pdfBuffer = await win.webContents.printToPDF({
          landscape: options?.landscape ?? false,
          printBackground: options?.printBackground ?? true
        });

        if (options?.filePath) {
          fs.writeFileSync(options.filePath, pdfBuffer);
          return { success: true, filePath: options.filePath };
        }

        return {
          success: true,
          data: pdfBuffer.toString('base64')
        };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    });

    // Batch Export Convocations to a selected folder
    ipcMain.handle('print:batchExportConvocations', async (_event, convocations: Array<{ teacherName: string; filename: string; base64Pdf: string }>) => {
      try {
        const win = BrowserWindow.getFocusedWindow() || mainWindow;
        const dialogRes = await dialog.showOpenDialog(win, {
          title: 'Sélectionnez le dossier de destination pour les convocations PDF',
          properties: ['openDirectory', 'createDirectory']
        });

        if (dialogRes.canceled || dialogRes.filePaths.length === 0) {
          return { success: false, savedCount: 0, error: 'Opération annulée par l\'utilisateur.' };
        }

        const targetDir = dialogRes.filePaths[0];
        let savedCount = 0;

        for (const conv of convocations) {
          try {
            // Clean filename
            const cleanName = (conv.filename || `Convocation_${conv.teacherName}.pdf`).replace(/[/\\?%*:|"<>]/g, '_');
            const targetFilePath = path.join(targetDir, cleanName);
            
            // Remove header if data URI
            const base64Data = conv.base64Pdf.replace(/^data:application\/pdf;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            fs.writeFileSync(targetFilePath, buffer);
            savedCount++;
          } catch (itemErr) {
            console.error(`Erreur d'écriture pour ${conv.teacherName}:`, itemErr);
          }
        }

        // Open target directory in explorer
        shell.openPath(targetDir);

        return {
          success: true,
          savedCount,
          targetDir
        };
      } catch (e: any) {
        return { success: false, savedCount: 0, error: e.message };
      }
    });
  }
}
