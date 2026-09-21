/**
 * SQLite Driver Factory
 * Detects running environment (Tauri Desktop / Capacitor Mobile / Browser Dev)
 * and returns the appropriate ISqliteDriver implementation.
 */

import { ISqliteDriver } from './types';
import { WasmSqliteDriver } from './drivers/wasmDriver';
import { TauriSqliteDriver } from './drivers/tauriDriver';
import { CapacitorSqliteDriver } from './drivers/capacitorDriver';

declare global {
  interface Window {
    __TAURI__?: any;
    __TAURI_INTERNALS__?: any;
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }
}

let driverInstance: ISqliteDriver | null = null;

export function detectPlatform(): 'tauri' | 'capacitor' | 'wasm' {
  if (typeof window === 'undefined') {
    return 'wasm';
  }

  // 1. Check for Tauri Desktop
  if (window.__TAURI__ !== undefined || window.__TAURI_INTERNALS__ !== undefined) {
    return 'tauri';
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
    case 'tauri':
      return new TauriSqliteDriver();
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
