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

export function serializeMessage(msg: MeshMessage): WireFrame[] {
  const serialized = JSON.stringify(msg.payload ?? null);
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

    let record = this.chunksMap.get(frame.msgId);
    if (!record) {
      record = { total: frame.total, chunks: new Map(), receivedAt: Date.now() };
      this.chunksMap.set(frame.msgId, record);
    }

    record.chunks.set(frame.index, frame.data);

    if (record.chunks.size === record.total) {
      this.chunksMap.delete(frame.msgId);
      const orderedChunks: string[] = [];
      for (let i = 0; i < record.total; i++) {
        orderedChunks.push(record.chunks.get(i) || '');
      }
      try {
        const fullStr = orderedChunks.join('');
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
