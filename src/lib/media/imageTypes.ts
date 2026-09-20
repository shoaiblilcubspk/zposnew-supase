/**
 * P2P Binary Image Synchronization Types
 */

export interface ImageMetadata {
  hash: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: number;
}

export interface ImageRequestPacket {
  type: 'IMAGE_REQUEST';
  hash: string;
  requesterDeviceId: string;
}

export interface ImageChunkPacket {
  type: 'IMAGE_CHUNK';
  hash: string;
  chunkIndex: number;
  totalChunks: number;
  totalSize: number;
  data: string; // Base64 encoded 16KB chunk
}

export interface ImageAckPacket {
  type: 'IMAGE_ACK';
  hash: string;
  status: 'OK' | 'CHECKSUM_FAILED' | 'ERROR';
  deviceId: string;
}

export type ImageTransferPacket = ImageRequestPacket | ImageChunkPacket | ImageAckPacket;
