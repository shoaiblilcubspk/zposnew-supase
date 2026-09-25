/**
 * SQLite Driver Factory
 * Detects running environment (Electron Desktop / Capacitor Mobile / Browser Dev)
 * and returns the appropriate ISqliteDriver implementation.
 */

import { ISqliteDriver } from './types';
import { WasmSqliteDriver } from './drivers/wasmDriver';
import { ElectronSqliteDriver } from './drivers/electronDriver';
import { CapacitorSqliteDriver } from './drivers/capacitorDriver';

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
    electronAPI?: any;
  }
}

let driverInstance: ISqliteDriver | null = null;

export function detectPlatform(): 'electron' | 'capacitor' | 'wasm' {
  if (typeof window === 'undefined') {
    return 'wasm';
  }

  // 1. Check for Electron Desktop
  if (window.electronAPI !== undefined) {
    return 'electron';
  }

  // 2. Check for Capacitor Mobile
  if (typeof window.Capacitor?.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
    return 'capacitor';
  }

  // 3. Fallback to WASM for Browser Dev Environment
  return 'wasm';
}

export function createDriver(): ISqliteDriver {
  const platform = detectPlatform();

  switch (platform) {
    case 'electron':
      return new ElectronSqliteDriver();
    case 'capacitor':
      return new CapacitorSqliteDriver();
    case 'wasm':
    default:
      return new WasmSqliteDriver();
  }
}

export function getDriver(): ISqliteDriver {
  if (!driverInstance) {
    driverInstance = createDriver();
  }
  return driverInstance;
}

export function resetDriverForTesting(mockDriver?: ISqliteDriver): void {
  driverInstance = mockDriver || null;
}

export function resetDbForTesting(): void {
  driverInstance = null;
}
