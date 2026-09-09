import { app, BrowserWindow, shell, ipcMain, Menu, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { WindowStateManager } from './windowState';
import { StorageHandler } from './ipc/storageHandler';
import { FileHandler } from './ipc/fileHandler';
import { PrintHandler } from './ipc/printHandler';
import { AppHandler } from './ipc/appHandler';

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// App configuration
app.name = 'ExamGuard';
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let fileToOpenOnStart: string | null = null;

// Parse command line arguments for file association (Windows)
function getFilePathFromArgs(argv: string[]): string | null {
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg && !arg.startsWith('--') && !arg.startsWith('-')) {
      if (arg.endsWith('.examguard') || arg.endsWith('.json')) {
        if (fs.existsSync(arg)) {
          return arg;
        }
      }
    }
  }
  return null;
}

fileToOpenOnStart = getFilePathFromArgs(process.argv);

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const newFile = getFilePathFromArgs(commandLine);
      if (newFile) {
        sendFileToRenderer(newFile);
      }
    }
  });

  // App lifecycle
  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

function sendFileToRenderer(filePath: string) {
  if (!mainWindow) return;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    mainWindow.webContents.send('app:openFile', filePath, content);
  } catch (err) {
    console.error('Failed to read file for renderer:', err);
  }
}

function getIconPath(): string {
  const possiblePaths = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../build/icon.png'),
    path.join(process.resourcesPath, 'build/icon.ico'),
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(__dirname, 'icon.ico')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return '';
}

function createWindow() {
  const windowState = new WindowStateManager();
  const state = windowState.getState();

  mainWindow = new BrowserWindow({
    title: 'ExamGuard — Surveillance des Examens',
    x: state.x,
    y: state.y,
    width: state.width || 1440,
    height: state.height || 900,
    minWidth: 1100,
    minHeight: 700,
    icon: getIconPath() || undefined,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    }
  });

  windowState.track(mainWindow);

  // Disable top native menu
  try {
    Menu.setApplicationMenu(null);
    mainWindow.setMenu(null);
    mainWindow.setMenuBarVisibility(false);
  } catch (e: any) {
    console.error('Error disabling native menu:', e?.message);
  }

  let isShown = false;
  const showWindow = () => {
    if (isShown || !mainWindow) return;
    isShown = true;
    if (state.isMaximized) {
      mainWindow.maximize();
    }
    mainWindow.show();

    if (fileToOpenOnStart) {
      setTimeout(() => {
        if (fileToOpenOnStart) sendFileToRenderer(fileToOpenOnStart);
      }, 500);
    }
  };

  // Ready to show
  mainWindow.once('ready-to-show', showWindow);

  // Safety fallback: if ready-to-show doesn't fire within 1 second, show anyway
  setTimeout(() => {
    if (!isShown && mainWindow) {
      showWindow();
    }
  }, 1000);

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load UI:', errorCode, errorDescription);
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Register IPC handlers
  try {
    new StorageHandler().register();
    new FileHandler().register(mainWindow);
    new PrintHandler().register(mainWindow);
    new AppHandler().register(mainWindow);
  } catch (e: any) {
    console.error('Error registering IPC handlers:', e);
  }

  // Load UI
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (isDev && devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
