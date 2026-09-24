/**
 * .zpos archive envelope (v2) — encrypts the domain export (exportEngineV2 files map) with
 * AES-256-GCM. Key derived from the password via PBKDF2 (reused deriveKey). Random salt + IV.
 * Wrong password or tampering fails cleanly (GCM auth tag). This encrypts the SELECTED-domain
 * JSON export from the live cloud-mirror — NOT a whole-DB binary (that legacy path is retired).
 */

import { deriveKey } from './backupEngine';

export interface ZposEnvelope {
  format: 'ZPOS_V2';
  createdAt: string;
  salt: string; // hex
  iv: string;   // hex
  ciphertext: string; // base64 of AES-GCM(files JSON)
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function toHex(b: Uint8Array): string { return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join(''); }
function fromHex(h: string): Uint8Array { const o = new Uint8Array(h.length / 2); for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; }
function toB64(b: Uint8Array): string { if (typeof Buffer !== 'undefined') return Buffer.from(b).toString('base64'); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s); }
function fromB64(s: string): Uint8Array { if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(s, 'base64')); const bin = atob(s); const o = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; }

/** Encrypt an export files-map into a .zpos envelope (JSON string). */
export async function encryptArchive(files: Record<string, string>, password: string): Promise<string> {
  if (!password || password.length < 4) throw new Error('Backup password must be at least 4 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = enc.encode(JSON.stringify(files));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as any }, key, plaintext as any));
  const env: ZposEnvelope = {
    format: 'ZPOS_V2', createdAt: new Date().toISOString(),
    salt: toHex(salt), iv: toHex(iv), ciphertext: toB64(cipher),
  };
  return JSON.stringify(env);
}

/** Decrypt a .zpos envelope back into the export files-map. Wrong password/tamper -> throws. */
export async function decryptArchive(envelopeJson: string, password: string): Promise<Record<string, string>> {
  let env: ZposEnvelope;
  try { env = JSON.parse(envelopeJson); } catch { throw new Error('Not a valid .zpos file.'); }
  if (env.format !== 'ZPOS_V2') throw new Error('Unsupported backup format.');
  const key = await deriveKey(password, fromHex(env.salt));
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromHex(env.iv) as any }, key, fromB64(env.ciphertext) as any);
  } catch {
    throw new Error('Wrong password or the backup file is corrupted/tampered.');
  }
  return JSON.parse(dec.decode(plain));
}

export function isZposEnvelope(text: string): boolean {
  try { return JSON.parse(text)?.format === 'ZPOS_V2'; } catch { return false; }
}
