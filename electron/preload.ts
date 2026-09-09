import { contextBridge, ipcRenderer } from 'electron';

const desktopAPI = {
  isElectron: true,
  platform: process.platform,

  storage: {
    getItem: (key: string) => ipcRenderer.invoke('storage:getItem', key),
    setItem: (key: string, value: string) => ipcRenderer.invoke('storage:setItem', key, value),
    removeItem: (key: string) => ipcRenderer.invoke('storage:removeItem', key),
    clear: () => ipcRenderer.invoke('storage:clear'),
    getAll: () => ipcRenderer.invoke('storage:getAll')
  },

  files: {
    readFile: (filePath: string) => ipcRenderer.invoke('file:readFile', filePath),
    writeFile: (filePath: string, data: string) => ipcRenderer.invoke('file:writeFile', filePath, data),
    openPath: (filePath: string) => ipcRenderer.invoke('file:openPath', filePath),
    showItemInFolder: (filePath: string) => ipcRenderer.invoke('file:showItemInFolder', filePath)
  },

  dialog: {
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options),
    showMessageBox: (options: any) => ipcRenderer.invoke('dialog:showMessageBox', options)
  },

  print: {
    print: (options?: any) => ipcRenderer.invoke('print:direct', options),
    printToPDF: (options?: any) => ipcRenderer.invoke('print:toPDF', options),
    batchExportConvocations: (convocations: any[]) => ipcRenderer.invoke('print:batchExportConvocations', convocations)
  },

  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close'),
    isMaximized: () => ipcRenderer.invoke('app:isMaximized'),
    onFileOpen: (callback: (filePath: string, content: string) => void) => {
      const handler = (_event: any, filePath: string, content: string) => callback(filePath, content);
      ipcRenderer.on('app:openFile', handler);
      return () => {
        ipcRenderer.removeListener('app:openFile', handler);
      };
    }
  }
};

contextBridge.exposeInMainWorld('desktopAPI', desktopAPI);
