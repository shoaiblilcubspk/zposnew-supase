/**
 * WebRTC Signaling Protocol Types
 * Strictly used for ephemeral rendezvous and SDP/ICE exchange via Supabase Realtime.
 */

export type SignalMessageType =
  | 'PEER_ANNOUNCE'
  | 'OFFER'
  | 'ANSWER'
  | 'ICE_CANDIDATE'
  | 'HEARTBEAT'
  | 'DATA_MESSAGE';

export interface PeerPresenceInfo {
  deviceId: string;
  name: string;
  role: 'primary' | 'terminal';
  publicKey: string;
  joinedAt: number;
}

export interface SignalingEnvelope<T = any> {
  senderDeviceId: string;
  targetDeviceId: string;
  type: SignalMessageType;
  payload: T;
  timestamp: number;
  signature?: string;
}

export interface SignalingListeners {
  onPeerJoin?: (peer: PeerPresenceInfo) => void;
  onPeerLeave?: (deviceId: string) => void;
  onPeersUpdate?: (peers: PeerPresenceInfo[]) => void;
  onSignal?: (envelope: SignalingEnvelope) => void;
}
