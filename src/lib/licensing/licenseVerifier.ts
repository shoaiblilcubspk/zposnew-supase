/**
 * Offline Cryptographic License Verification Engine for Zaynahs POS
 * Validates ZPOS-XXXX-XXXX-XXXX-XXXX license keys deterministically.
 */

// Secret master salt used for signing and verifying genuine retail licenses
export const MASTER_LICENSE_SALT = 'ZAYNAHS_POS_SECURE_RETAIL_OFFLINE_SALT_V1_2026';

/**
 * Deterministic fast 64-bit hybrid hash function that works in all runtimes
 * without requiring external node crypto packages in browser/electron environments.
 */
function computeSignature(payload: string, salt: string): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x5bd1e995;
  const combined = `${payload}:${salt}:LIC`;

  for (let i = 0; i < combined.length; i++) {
    const code = combined.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ code, 0x01000193);
    hash2 = Math.imul(hash2 ^ code, 0x5bd1e995);
    hash1 ^= hash1 >>> 13;
    hash2 ^= hash2 >>> 15;
  }

  const h1 = ((hash1 >>> 0) % 0xffffff).toString(36).toUpperCase().padStart(4, 'X').slice(-4);
  const h2 = ((hash2 >>> 0) % 0xffffff).toString(36).toUpperCase().padStart(4, 'Z').slice(-4);
  return `${h1}-${h2}`;
}

export interface LicenseValidationResult {
  valid: boolean;
  key: string;
  error?: string;
  serial?: string;
}

/**
 * Format: ZPOS-XXXX-XXXX-YYYY-YYYY
 * where XXXX-XXXX is the serial payload and YYYY-YYYY is the cryptographic signature.
 */
export function verifyLicenseKey(rawKey: string): LicenseValidationResult {
  const cleanKey = (rawKey || '').trim().toUpperCase().replace(/\s+/g, '');

  const regex = /^ZPOS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!regex.test(cleanKey)) {
    return {
      valid: false,
      key: cleanKey,
      error: 'Invalid license format. Format must be ZPOS-XXXX-XXXX-XXXX-XXXX',
    };
  }

  const parts = cleanKey.split('-');
  const prefix = parts[0];
  const serialPart = `${parts[1]}-${parts[2]}`;
  const sigPart = `${parts[3]}-${parts[4]}`;

  if (prefix !== 'ZPOS') {
    return {
      valid: false,
      key: cleanKey,
      error: 'Invalid key prefix.',
    };
  }

  const expectedSig = computeSignature(serialPart, MASTER_LICENSE_SALT);

  if (sigPart !== expectedSig) {
    return {
      valid: false,
      key: cleanKey,
      error: 'Counterfeit or invalid license key. Please contact software administrator.',
    };
  }

  return {
    valid: true,
    key: cleanKey,
    serial: serialPart,
  };
}

/**
 * Generates a valid license key for a given random 8-character serial payload.
 */
export function generateLicenseKey(customSerial?: string): string {
  let serial = customSerial;
  if (!serial || serial.length < 8) {
    const rnd = Math.random().toString(36).substring(2, 10).toUpperCase().padEnd(8, '9');
    serial = `${rnd.slice(0, 4)}-${rnd.slice(4, 8)}`;
  } else {
    serial = serial.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    serial = `${serial.slice(0, 4)}-${serial.slice(4, 8)}`;
  }

  const sig = computeSignature(serial, MASTER_LICENSE_SALT);
  return `ZPOS-${serial}-${sig}`;
}
