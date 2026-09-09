export interface DesktopStorageAPI {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<boolean>;
  removeItem: (key: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
  getAll: () => Promise<Record<string, string>>;
}

export interface DesktopFilesAPI {
  readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
  openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  showItemInFolder: (filePath: string) => Promise<void>;
}

export interface DesktopDialogAPI {
  showOpenDialog: (options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
  }) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showSaveDialog: (options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{ canceled: boolean; filePath?: string }>;
  showMessageBox: (options: {
    type?: 'none' | 'info' | 'error' | 'question' | 'warning';
    title?: string;
    message: string;
    detail?: string;
    buttons?: string[];
    defaultId?: number;
    cancelId?: number;
  }) => Promise<{ response: number; checkboxChecked: boolean }>;
}

export interface DesktopPrintAPI {
  print: (options?: { silent?: boolean; printBackground?: boolean; deviceName?: string }) => Promise<{ success: boolean; error?: string }>;
  printToPDF: (options?: { landscape?: boolean; marginsType?: number; printBackground?: boolean; filePath?: string }) => Promise<{ success: boolean; data?: string; filePath?: string; error?: string }>;
  batchExportConvocations: (convocations: Array<{ teacherName: string; filename: string; base64Pdf: string }>) => Promise<{ success: boolean; savedCount: number; targetDir?: string; error?: string }>;
}

export interface DesktopAppAPI {
  getVersion: () => Promise<string>;
  getPath: (name: 'home' | 'appData' | 'userData' | 'documents' | 'downloads' | 'desktop') => Promise<string>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onFileOpen: (callback: (filePath: string, content: string) => void) => () => void;
}

export interface DesktopAPI {
  isElectron: boolean;
  platform: string;
  storage: DesktopStorageAPI;
  files: DesktopFilesAPI;
  dialog: DesktopDialogAPI;
  print: DesktopPrintAPI;
  app: DesktopAppAPI;
}

declare global {
  interface Window {
    desktopAPI?: DesktopAPI;
  }
}
