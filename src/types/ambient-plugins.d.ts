/**
 * Ambient type declarations for native runtime platform plugins (Tauri and Capacitor)
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

declare module '@tauri-apps/api/core' {
  export function invoke<T = any>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}
