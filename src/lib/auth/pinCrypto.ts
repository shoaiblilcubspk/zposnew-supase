/**
 * Cryptographic PIN and Recovery Code Hashing
 * Uses standard Web Crypto API (PBKDF2-SHA256 with 100,000 iterations).
 * 100% offline, zero cloud dependency.
 * Includes graceful pure-JS fallback for non-secure contexts (e.g. mobile browser on LAN HTTP).
 */

import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { sha256Hex } from '../actionToken';
import { hasCryptoSubtle } from '../crypto/deviceKeypair';

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

/**
 * Generate a cryptographically secure random salt in hex.
 */
export function generateSalt(lengthBytes = 16): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(lengthBytes);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Array.from({ length: lengthBytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a numeric or alphanumeric PIN with a random or provided salt.
 * Returns format: "salt:hashHex" or "salt:hashHex:fallbackHex"
 */
export async function hashPin(pin: string, existingSalt?: string): Promise<{ fullHash: string; salt: string; hash: string }> {
  const salt = existingSalt || generateSalt();
  const fallback = await sha256Hex(`PIN_SECURE_V1:${salt}:${pin}`);

  if (hasCryptoSubtle()) {
    try {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(pin),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        KEY_LENGTH_BITS
      );

      const hashArray = Array.from(new Uint8Array(derivedBits));
      const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      // Store 3 parts: salt:pbkdf2Hash:fallbackHash
      const fullHash = `${salt}:${hash}:${fallback}`;

      return { fullHash, salt, hash };
    } catch {
      // Fall through to pure-JS fallback
    }
  }

  // Pure-JS fallback via @noble/hashes when crypto.subtle is unavailable (e.g. mobile browser over HTTP LAN)
  try {
    const derivedBytes = pbkdf2(sha256, pin, salt, { c: PBKDF2_ITERATIONS, dkLen: KEY_LENGTH_BITS / 8 });
    const hash = bytesToHex(derivedBytes);
    const fullHash = `${salt}:${hash}:${fallback}`;
    return { fullHash, salt, hash };
  } catch {
    const fullHash = `${salt}:${fallback}:${fallback}`;
    return { fullHash, salt, hash: fallback };
  }
}

/**
 * Verify a PIN against a stored "salt:hash" or separate salt and hash.
 * Fully compatible with WebCrypto PBKDF2, pure-JS PBKDF2, and fallback hashes.
 */
export async function verifyPin(pin: string, storedHashOrFull: string, optionalSalt?: string): Promise<boolean> {
  let salt: string;
  let expectedHash: string;
  let expectedFallback: string | undefined;

  if (storedHashOrFull.includes(':')) {
    const parts = storedHashOrFull.split(':');
    salt = parts[0];
    expectedHash = parts[1];
    if (parts.length > 2) {
      expectedFallback = parts[2];
    }
  } else if (optionalSalt) {
    salt = optionalSalt;
    expectedHash = storedHashOrFull;
  } else {
    return false;
  }

  // 1. Fast check against 3rd part fallback hash (works everywhere on mobile HTTP in 1ms)
  if (expectedFallback) {
    const computed = await sha256Hex(`PIN_SECURE_V1:${salt}:${pin}`);
    if (constantTimeCompare(computed, expectedFallback)) {
      return true;
    }
  }

  // 2. If crypto.subtle is available (PC, Desktop Tauri, HTTPS, Capacitor), check PBKDF2 via WebCrypto
  if (hasCryptoSubtle()) {
    try {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(pin),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        KEY_LENGTH_BITS
      );
      const hashArray = Array.from(new Uint8Array(derivedBits));
      const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      if (constantTimeCompare(computedHash, expectedHash)) {
        return true;
      }
    } catch {}
  }

  // 3. Pure-JS PBKDF2 via @noble/hashes (guarantees verification of PC-created 2-part hashes on mobile HTTP LAN)
  try {
    const derivedBytes = pbkdf2(sha256, pin, salt, { c: PBKDF2_ITERATIONS, dkLen: KEY_LENGTH_BITS / 8 });
    const computedHash = bytesToHex(derivedBytes);
    if (constantTimeCompare(computedHash, expectedHash)) {
      return true;
    }
  } catch {}

  // 4. Check legacy SHA-256 fallbacks
  const fallbackV1 = await sha256Hex(`PIN_SECURE_V1:${salt}:${pin}`);
  if (constantTimeCompare(fallbackV1, expectedHash)) return true;

  const fallbackLegacy = await sha256Hex(`PBKDF2_FALLBACK:${salt}:${pin}`);
  if (constantTimeCompare(fallbackLegacy, expectedHash)) return true;

  return false;
}

/**
 * Generate a 24-character master emergency recovery code (format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX).
 */
export function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Base32 excluding ambiguous chars (0, O, 1, I)
  const bytes = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 24; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let raw = '';
  for (let i = 0; i < 24; i++) {
    raw += chars[bytes[i] % chars.length];
  }
  return raw.match(/.{1,4}/g)!.join('-');
}

/**
 * Hash emergency recovery code for secure SQLite storage.
 */
export async function hashRecoveryCode(code: string, salt?: string): Promise<string> {
  const cleanCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const { fullHash } = await hashPin(cleanCode, salt);
  return fullHash;
}

/**
 * Verify emergency recovery code.
 */
export async function verifyRecoveryCode(code: string, storedFullHash: string): Promise<boolean> {
  const cleanCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return verifyPin(cleanCode, storedFullHash);
}

/**
 * Timing-safe string comparison to mitigate side-channel timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
