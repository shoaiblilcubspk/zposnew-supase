import { contextBridge, ipcRenderer } from 'electron';

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
try {
  (globalThis as any).ELECTRON_DISABLE_SECURITY_WARNINGS = true;
} catch {
  // ignore
}

const electronAPI = {
  sqlite: {
    open: (dbName: string) => ipcRenderer.invoke('sqlite:open', dbName),
    close: () => ipcRenderer.invoke('sqlite:close'),
    execute: (sql: string, params?: any[]) => ipcRenderer.invoke('sqlite:execute', sql, params),
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('sqlite:query', sql, params),
    queryOne: (sql: string, params?: any[]) => ipcRenderer.invoke('sqlite:queryOne', sql, params),
    transaction: (sqlStatements: string[]) => ipcRenderer.invoke('sqlite:transaction', sqlStatements),
    transactionWithParams: (stmts: {sql: string; params?: any[]}[]) => ipcRenderer.invoke('sqlite:transactionWithParams', stmts),
    executeWithParams: (sql: string, params?: any[]) => ipcRenderer.invoke('sqlite:execute', sql, params),
  },
  fs: {
    writeFile: (path: string, data: string) => ipcRenderer.invoke('fs:writeFile', path, data),
    readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
    mkdir: (path: string, recursive?: boolean) => ipcRenderer.invoke('fs:mkdir', path, recursive),
    readdir: (path: string) => ipcRenderer.invoke('fs:readdir', path),
    unlink: (path: string) => ipcRenderer.invoke('fs:unlink', path),
    stat: (path: string) => ipcRenderer.invoke('fs:stat', path),
    getDocumentsPath: () => ipcRenderer.invoke('fs:getDocumentsPath'),
  },
  print: {
    printRaw: (printerName: string, data: number[]) => ipcRenderer.invoke('print:printRaw', printerName, data),
    getPrinters: () => ipcRenderer.invoke('print:getPrinters'),
  },
  app: {
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
  dialog: {
    showSaveDialog: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('dialog:showSaveDialog', options),
    showOpenDialog: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: typeof electronAPI & {
      sqlite: {
        open: (dbName: string) => Promise<void>;
        close: () => Promise<void>;
        execute: (sql: string, params?: any[]) => Promise<{ rowsAffected: number; lastInsertId: any }>;
        query: (sql: string, params?: any[]) => Promise<any[]>;
        queryOne: (sql: string, params?: any[]) => Promise<any>;
        transaction: (sqlStatements: string[]) => Promise<void>;
        transactionWithParams: (stmts: { sql: string; params?: any[] }[]) => Promise<void>;
      };
    };
  }
}