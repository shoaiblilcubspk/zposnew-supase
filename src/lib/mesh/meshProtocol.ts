/**
 * WebRTC P2P DataChannel Framing & Protocol Definitions
 */

export type MeshMessageType =
  | 'PING'
  | 'PONG'
  | 'EVENT_SYNC_REQUEST'
  | 'EVENT_BATCH'
  | 'EVENT_ACK'
  | 'SNAPSHOT_REQUEST'
  | 'SNAPSHOT_RESPONSE'
  | 'RECONCILE_REQUEST'
  | 'RECONCILE_PAYLOAD'
  | 'ASSET_REQUEST'
  | 'ASSET_CHUNK'
  | 'ASSET_ACK'
  | 'CUSTOM';

export interface MeshMessage<T = any> {
  id: string;
  type: MeshMessageType;
  senderDeviceId: string;
  targetDeviceId?: string;
  payload: T;
  timestamp: number;
}

export interface WireFrame {
  msgId: string;
  type: MeshMessageType;
  sender: string;
  target?: string;
  index: number;
  total: number;
  data: string; // JSON chunk string
}

const CHUNK_SIZE = 16 * 1024; // 16 KB safe chunk size for DataChannels
const MAX_MESSAGE_SIZE = 50 * 1024 * 1024; // 50 MB max message size
const MAX_PENDING_MESSAGES = 1000; // Max incomplete messages to buffer

export function serializeMessage(msg: MeshMessage): WireFrame[] {
  const serialized = JSON.stringify(msg.payload ?? null);
  if (serialized.length > MAX_MESSAGE_SIZE) {
    throw new Error(`Message size ${serialized.length} exceeds MAX_MESSAGE_SIZE ${MAX_MESSAGE_SIZE}`);
  }
  const totalChunks = Math.ceil(serialized.length / CHUNK_SIZE) || 1;
  const frames: WireFrame[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunk = serialized.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    frames.push({
      msgId: msg.id,
      type: msg.type,
      sender: msg.senderDeviceId,
      target: msg.targetDeviceId,
      index: i,
      total: totalChunks,
      data: chunk,
    });
  }

  return frames;
}

export class MessageReassembler {
  private chunksMap: Map<string, { total: number; chunks: Map<number, string>; receivedAt: number }> = new Map();

  addFrame(frame: WireFrame): MeshMessage | null {
    // Reject oversized frames
    if (frame.data.length > CHUNK_SIZE * 2) {
      console.warn('[MeshProtocol] Frame data exceeds expected chunk size, discarding');
      return null;
    }

    if (frame.total === 1) {
      try {
        const payload = JSON.parse(frame.data);
        return {
          id: frame.msgId,
          type: frame.type,
          senderDeviceId: frame.sender,
          targetDeviceId: frame.target,
          payload,
          timestamp: Date.now(),
        };
      } catch {
        return null;
      }
    }

    // Enforce max pending messages to prevent memory exhaustion
    if (this.chunksMap.size >= MAX_PENDING_MESSAGES) {
      this.cleanStale();
      if (this.chunksMap.size >= MAX_PENDING_MESSAGES) {
        // Still full after cleanup - drop oldest
        const oldestKey = this.chunksMap.keys().next().value;
        if (oldestKey) this.chunksMap.delete(oldestKey);
      }
    }

    let record = this.chunksMap.get(frame.msgId);
    if (!record) {
      record = { total: frame.total, chunks: new Map(), receivedAt: Date.now() };
      this.chunksMap.set(frame.msgId, record);
    }

    // Validate total matches expected
    if (frame.total !== record.total) {
      console.warn('[MeshProtocol] Frame total mismatch, discarding message');
      this.chunksMap.delete(frame.msgId);
      return null;
    }

    record.chunks.set(frame.index, frame.data);

    if (record.chunks.size === record.total) {
      this.chunksMap.delete(frame.msgId);
      const orderedChunks: string[] = [];
      for (let i = 0; i < record.total; i++) {
        const chunk = record.chunks.get(i);
        if (chunk === undefined) {
          console.warn('[MeshProtocol] Missing chunk in reassembled message');
          return null;
        }
        orderedChunks.push(chunk);
      }
      try {
        const fullStr = orderedChunks.join('');
        if (fullStr.length > MAX_MESSAGE_SIZE) {
          console.warn('[MeshProtocol] Reassembled message exceeds max size');
          return null;
        }
        const payload = JSON.parse(fullStr);
        return {
          id: frame.msgId,
          type: frame.type,
          senderDeviceId: frame.sender,
          targetDeviceId: frame.target,
          payload,
          timestamp: Date.now(),
        };
      } catch {
        return null;
      }
    }

    // Cleanup stale incomplete messages older than 30s
    this.cleanStale();
    return null;
  }

  private cleanStale(): void {
    const now = Date.now();
    for (const [id, rec] of this.chunksMap.entries()) {
      if (now - rec.receivedAt > 30000) {
        this.chunksMap.delete(id);
      }
    }
  }
}
