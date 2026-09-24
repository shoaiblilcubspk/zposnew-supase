import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import Database from 'better-sqlite3';
import { platform } from 'os';

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const isDev = process.env.NODE_ENV === 'development';
const isMac = platform() === 'darwin';

// Disable GPU completely to prevent crashes on macOS
if (isDev || isMac) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('disable-software-rasterizer');
}

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;
const dbName = 'zaynahs_pos.sqlite';

function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return join(userDataPath, dbName);
}

function getDocumentsPath(): string {
  return app.getPath('documents');
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Zaynahs POS',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: join(__dirname, 'icons', isMac ? 'icon.icns' : 'icon.ico'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // DevTools can be opened anytime via F12 or Cmd+Option+I
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initDatabase(): Promise<void> {
  const dbPath = getDbPath();
  const dbDir = join(dbPath, '..');
  
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('cache_size = -64000');
  db.pragma('busy_timeout = 10000');
  
  console.log('[Electron] Database initialized at:', dbPath);
}

function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[Electron] Database closed');
  }
}

function assertDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

ipcMain.handle('sqlite:open', async (_event, _dbName: string) => {
  await initDatabase();
});

ipcMain.handle('sqlite:close', async () => {
  closeDatabase();
});

ipcMain.handle('sqlite:execute', async (_event, sql: string, params?: any[]) => {
  const database = assertDb();
  const stmt = database.prepare(sql);
  const result = params ? stmt.run(...params) : stmt.run();
  return {
    rowsAffected: result.changes,
    lastInsertId: result.lastInsertRowid,
  };
});

ipcMain.handle('sqlite:query', async (_event, sql: string, params?: any[]) => {
  const database = assertDb();
  const stmt = database.prepare(sql);
  return params ? stmt.all(...params) : stmt.all();
});

ipcMain.handle('sqlite:queryOne', async (_event, sql: string, params?: any[]) => {
  const database = assertDb();
  const stmt = database.prepare(sql);
  return params ? stmt.get(...params) : stmt.get();
});

ipcMain.handle('sqlite:transaction', async (_event, sqlStatements: string[]) => {
  const database = assertDb();
  const transaction = database.transaction((statements: string[]) => {
    for (const sql of statements) {
      const trimmed = sql.trim();
      if (!trimmed) continue;
      try {
        database.exec(trimmed);
      } catch (err: any) {
        const msg = typeof err === 'string' ? err : (err?.message || String(err || ''));
        // Skip benign schema errors (migration re-runs, already-applied columns)
        if (/duplicate column name|already exists|no such column|no such table/i.test(msg)) {
          console.warn('[Electron] Skipped DDL statement (already applied):', msg.split('\n')[0]);
          continue;
        }
        // Skip UNIQUE constraint on idempotent re-inserts (snapshot re-apply)
        if (/UNIQUE constraint failed|NOT NULL constraint failed/i.test(msg)) {
          console.warn('[Electron] Skipped duplicate/constraint insert:', msg.split('\n')[0]);
          continue;
        }
        throw err;
      }
    }
  });
  transaction(sqlStatements);
});

/**
 * Parameterized transaction — PREFERRED for all business data (products, sales, inventory etc.)
 * Accepts [{sql, params}] — uses better-sqlite3 native param binding (no string interpolation).
 * This is safe against injection, handles large text / special chars / nulls correctly.
 */
ipcMain.handle('sqlite:transactionWithParams', async (_event, stmts: { sql: string; params?: any[] }[]) => {
  const database = assertDb();
  const transaction = database.transaction((statements: { sql: string; params?: any[] }[]) => {
    for (const { sql, params } of statements) {
      if (!sql?.trim()) continue;
      const stmt = database.prepare(sql);
      if (params && params.length > 0) {
        stmt.run(...params);
      } else {
        stmt.run();
      }
    }
  });
  transaction(stmts);
});


ipcMain.handle('fs:writeFile', async (_event, path: string, data: string) => {
  const fs = await import('fs/promises');
  await fs.writeFile(path, data, 'utf-8');
});

ipcMain.handle('fs:readFile', async (_event, path: string) => {
  const fs = await import('fs/promises');
  return fs.readFile(path, 'utf-8');
});

ipcMain.handle('fs:mkdir', async (_event, path: string, recursive = true) => {
  const fs = await import('fs/promises');
  await fs.mkdir(path, { recursive });
});

ipcMain.handle('fs:readdir', async (_event, path: string) => {
  const fs = await import('fs/promises');
  return fs.readdir(path);
});

ipcMain.handle('fs:unlink', async (_event, path: string) => {
  const fs = await import('fs/promises');
  await fs.unlink(path);
});

ipcMain.handle('fs:stat', async (_event, path: string) => {
  const fs = await import('fs/promises');
  const stats = await fs.stat(path);
  return {
    size: stats.size,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
  };
});

ipcMain.handle('fs:getDocumentsPath', async () => {
  return getDocumentsPath();
});

ipcMain.handle('print:printRaw', async (_event, printerName: string, data: number[]) => {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    
    const buffer = Buffer.from(data);
    const tempPath = join(app.getPath('temp'), `zpos-print-${Date.now()}.bin`);
    const fs = await import('fs/promises');
    await fs.writeFile(tempPath, buffer);
    
    if (platform() === 'win32') {
      await execFileAsync('cmd.exe', ['/c', `copy /b "${tempPath}" "\\\\.\\${printerName}"`]);
    } else {
      await execFileAsync('lp', ['-d', printerName, '-o', 'raw', tempPath]);
    }
    
    await fs.unlink(tempPath);
    return true;
  } catch (err) {
    console.error('[Electron] Print failed:', err);
    return false;
  }
});

ipcMain.handle('print:getPrinters', async () => {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    
    if (platform() === 'win32') {
      const { stdout } = await execFileAsync('wmic', ['printer', 'get', 'name']);
      return stdout.split('\n').map(s => s.trim()).filter(s => s && s !== 'Name');
    } else {
      const { stdout } = await execFileAsync('lpstat', ['-a']);
      return stdout.split('\n').map(line => line.split(' ')[0]).filter(Boolean);
    }
  } catch {
    return [];
  }
});

ipcMain.handle('app:getPlatform', async () => {
  return platform();
});

ipcMain.handle('app:getVersion', async () => {
  return app.getVersion();
});

ipcMain.handle('dialog:showSaveDialog', async (_event, options) => {
  if (!mainWindow) return { canceled: true };
  return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('dialog:showOpenDialog', async (_event, options) => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url);
});

app.whenReady().then(async () => {
  await initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    closeDatabase();
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});

process.on('uncaughtException', (err) => {
  console.error('[Electron] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Electron] Unhandled rejection:', reason);
});