/**
 * Device Pairing & Mesh Record Interfaces
 */

export interface PairingPayload {
  shopId: string;
  adminDeviceId: string;
  adminPublicKey: string;
  nonce: string;
  pin6?: string;
  expiresAt: number;
  signature?: string;
  adminUser?: {
    id: string;
    name: string;
    username: string;
    pin_hash: string;
    role: string;
    active: number;
    email?: string;
  };
}

export interface PairingBootstrapData {
  tokenString: string;
  pin6: string;
  expiresAt: number;
  payload: PairingPayload;
  shopProfile: { name: string; currency: string };
  initialUsers: Array<{
    id: string;
    name: string;
    username: string;
    pin_hash: string;
    role: string;
    email?: string;
    avatar?: string;
    active: number | boolean;
    created_at: number;
    updated_at: number;
  }>;
}

export interface PairedDeviceRecord {
  deviceId: string;
  name: string;
  role: 'primary' | 'terminal';
  publicKey: string;
  lastSeen?: number;
  isRevoked: boolean;
  pairedAt: number;
}
