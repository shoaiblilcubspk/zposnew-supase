/**
 * Ambient type declarations for native runtime platform plugins (Electron and Capacitor)
 */

declare module '@capacitor-community/bluetooth-le' {
  export function numbersToDataView(numbers: number[]): DataView;
  export const BleClient: {
    initialize: () => Promise<void>;
    requestLEScan: (options: any, callback: (result: any) => void) => Promise<any>;
    connect: (deviceId: string) => Promise<void>;
    write: (deviceId: string, service: string, characteristic: string, data: DataView) => Promise<void>;
    disconnect: (deviceId: string) => Promise<void>;
  };
}

interface ElectronAPI {
  sqlite: {
    open: (dbName: string) => Promise<void>;
    close: () => Promise<void>;
    execute: (sql: string, params?: any[]) => Promise<{ rowsAffected: number; lastInsertId: number | undefined }>;
    query: (sql: string, params?: any[]) => Promise<any[]>;
    queryOne: (sql: string, params?: any[]) => Promise<any | null>;
    transaction: (sqlStatements: string[]) => Promise<void>;
  };
  fs: {
    writeFile: (path: string, data: string) => Promise<void>;
    readFile: (path: string) => Promise<string>;
    mkdir: (path: string, recursive?: boolean) => Promise<void>;
    readdir: (path: string) => Promise<string[]>;
    unlink: (path: string) => Promise<void>;
    stat: (path: string) => Promise<{ size: number; isFile: boolean; isDirectory: boolean }>;
    getDocumentsPath: () => Promise<string>;
  };
  print: {
    printRaw: (printerName: string, data: number[]) => Promise<boolean>;
    getPrinters: () => Promise<string[]>;
  };
  platform: 'electron' | 'web';
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
