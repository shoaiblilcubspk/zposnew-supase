/**
 * P2P Binary Image Transfer
 * Chunked WebRTC streaming, reassembly, and checksum validation for product media.
 */

import { getP2PMesh } from '../mesh/p2pMesh';
import { getDeviceId } from '../mesh/deviceIdentity';
import {
  ImageTransferPacket,
  ImageRequestPacket,
  ImageChunkPacket,
  ImageAckPacket,
} from './imageTypes';
import {
  computeSha256,
  getImageData,
  saveImage,
  hasImage,
} from './localImageStore';

const CHUNK_SIZE = 16 * 1024; // 16KB chunks

interface IncomingTransfer {
  hash: string;
  totalChunks: number;
  totalSize: number;
  receivedChunks: Map<number, Uint8Array>;
  startedAt: number;
}

const activeTransfers = new Map<string, IncomingTransfer>();
let isInitialized = false;

// Helper: uint8Array to base64
function uint8ToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: base64 to uint8Array
function base64ToUint8(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function requestImageFromPeers(hash: string): Promise<void> {
  if (await hasImage(hash)) return;
  const localDeviceId = await getDeviceId();

  const packet: ImageRequestPacket = {
    type: 'IMAGE_REQUEST',
    hash,
    requesterDeviceId: localDeviceId,
  };

  try { getP2PMesh().broadcastMessage('ASSET_REQUEST', packet); } catch {}
}

export async function sendImageToPeer(hash: string): Promise<boolean> {
  const data = await getImageData(hash);
  if (!data) return false;

  const totalSize = data.length;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkBytes = data.slice(start, end);
    const chunkBase64 = uint8ToBase64(chunkBytes);

    const packet: ImageChunkPacket = {
      type: 'IMAGE_CHUNK',
      hash,
      chunkIndex: i,
      totalChunks,
      totalSize,
      data: chunkBase64,
    };

    try { getP2PMesh().broadcastMessage('ASSET_CHUNK', packet); } catch {}
  }

  return true;
}

export async function handleImagePacket(packet: ImageTransferPacket): Promise<void> {
  const localDeviceId = await getDeviceId();

  if (packet.type === 'IMAGE_REQUEST') {
    // A peer needs an image we might possess
    if (await hasImage(packet.hash)) {
      await sendImageToPeer(packet.hash);
    }
    return;
  }

  if (packet.type === 'IMAGE_CHUNK') {
    let transfer = activeTransfers.get(packet.hash);
    if (!transfer) {
      transfer = {
        hash: packet.hash,
        totalChunks: packet.totalChunks,
        totalSize: packet.totalSize,
        receivedChunks: new Map(),
        startedAt: Date.now(),
      };
      activeTransfers.set(packet.hash, transfer);
    }

    const chunkBytes = base64ToUint8(packet.data);
    transfer.receivedChunks.set(packet.chunkIndex, chunkBytes);

    // If all chunks received, reassemble and verify checksum
    if (transfer.receivedChunks.size === transfer.totalChunks) {
      const fullBuffer = new Uint8Array(transfer.totalSize);
      let offset = 0;
      for (let i = 0; i < transfer.totalChunks; i++) {
        const chunk = transfer.receivedChunks.get(i);
        if (chunk) {
          fullBuffer.set(chunk, offset);
          offset += chunk.length;
        }
      }

      // Verify SHA-256 integrity
      const calculatedHash = await computeSha256(fullBuffer);
      if (calculatedHash === packet.hash) {
        await saveImage(fullBuffer, 'image/webp');
        activeTransfers.delete(packet.hash);

        const ack: ImageAckPacket = {
          type: 'IMAGE_ACK',
          hash: packet.hash,
          status: 'OK',
          deviceId: localDeviceId,
        };
    try { getP2PMesh().broadcastMessage('ASSET_ACK', ack); } catch {}
  } else {
    // Discard corrupted transfer
    activeTransfers.delete(packet.hash);
    const nack: ImageAckPacket = {
      type: 'IMAGE_ACK',
      hash: packet.hash,
      status: 'CHECKSUM_FAILED',
      deviceId: localDeviceId,
    };
    try { getP2PMesh().broadcastMessage('ASSET_ACK', nack); } catch {}
      }
    }
    return;
  }

  if (packet.type === 'IMAGE_ACK') {
    if (packet.status === 'CHECKSUM_FAILED') {
      console.warn(`[ImageSync] Peer ${packet.deviceId} reported checksum failure for ${packet.hash}, will retry`);
    }
  }
}

export function initP2PImageSync(): void {
  if (isInitialized) return;
  isInitialized = true;

  getP2PMesh().onMessage((_senderId, msg) => {
    if (msg.type === 'ASSET_REQUEST' || msg.type === 'ASSET_CHUNK' || msg.type === 'ASSET_ACK') {
      handleImagePacket(msg.payload).catch(err => console.error('[ImageSync] Packet handling error:', err));
    }
  });
}
