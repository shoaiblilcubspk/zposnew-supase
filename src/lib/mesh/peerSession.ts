/**
 * WebRTC Peer Session Lifecycle & State Management
 */

import { getRtcConfiguration } from './iceConfig';

export type PeerConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface PeerSession {
  deviceId: string;
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  status: PeerConnectionStatus;
  lastSeen: number;
  pendingCandidates: RTCIceCandidateInit[];
}

export function createPeerSession(
  peerId: string,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onDataChannel: (dc: RTCDataChannel) => void,
  onConnectionChange: (status: PeerConnectionStatus) => void
): PeerSession {
  const pc = new RTCPeerConnection(getRtcConfiguration());
  const session: PeerSession = {
    deviceId: peerId,
    pc,
    dc: null,
    status: 'connecting',
    lastSeen: Date.now(),
    pendingCandidates: [],
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  pc.ondatachannel = (event) => {
    onDataChannel(event.channel);
  };

  pc.onconnectionstatechange = () => {
    if (
      pc.connectionState === 'disconnected' ||
      pc.connectionState === 'failed' ||
      pc.connectionState === 'closed'
    ) {
      session.status = 'disconnected';
      onConnectionChange('disconnected');
    }
  };

  return session;
}

export async function drainPendingCandidates(session: PeerSession): Promise<void> {
  while (session.pendingCandidates.length > 0) {
    const c = session.pendingCandidates.shift()!;
    try {
      await session.pc.addIceCandidate(new RTCIceCandidate(c));
    } catch (e) {
      console.warn('Error adding buffered ICE candidate:', e);
    }
  }
}

export function closePeerSession(session: PeerSession): void {
  try {
    if (session.dc) {
      session.dc.close();
    }
    session.pc.close();
  } catch {}
  session.status = 'disconnected';
}

export function setupDataChannel(
  session: PeerSession,
  dc: RTCDataChannel,
  onOpen: () => void,
  onClose: () => void,
  onFrame: (frameText: string) => void
): void {
  session.dc = dc;
  dc.onopen = () => {
    session.status = 'connected';
    onOpen();
  };
  dc.onclose = () => {
    session.status = 'disconnected';
    onClose();
  };
  dc.onmessage = (event) => {
    session.lastSeen = Date.now();
    onFrame(event.data);
  };
}
