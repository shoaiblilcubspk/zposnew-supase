import { getSignalingChannel, SignalingChannel } from './signalingChannel';
import { getDeviceProfile, DeviceProfile } from './deviceIdentity';
import { isDeviceAuthorized } from './pairingManager';
import { PeerSession, PeerConnectionStatus, createPeerSession, drainPendingCandidates, closePeerSession, setupDataChannel } from './peerSession';
import { MeshMessage, MeshMessageType, WireFrame, serializeMessage, MessageReassembler } from './meshProtocol';
import { SignalingEnvelope, PeerPresenceInfo } from './signalingTypes';

export class P2PMeshManager {
  private signaling: SignalingChannel;
  private currentDevice: DeviceProfile | null = null;
  private sessions: Map<string, PeerSession> = new Map();
  private reassemblers: Map<string, MessageReassembler> = new Map();
  private messageListeners: Set<(senderId: string, message: MeshMessage) => void> = new Set();
  private statusListeners: Set<(deviceId: string, status: PeerConnectionStatus) => void> = new Set();
  private unsubscribeSignaling: (() => void) | null = null;
  private heartbeatTimer: any = null;
  private isStarted = false;

  constructor() {
    this.signaling = getSignalingChannel();
  }

  async start(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;
    this.currentDevice = await getDeviceProfile();

    this.unsubscribeSignaling = this.signaling.subscribe({
      onPeerJoin: (peer) => this.handlePeerJoin(peer),
      onPeerLeave: (deviceId) => this.handlePeerLeave(deviceId),
      onPeersUpdate: (peers) => this.handlePeersUpdate(peers),
      onSignal: (env) => this.handleSignalEnvelope(env),
    });

    this.heartbeatTimer = setInterval(() => this.runHeartbeat(), 5000);
  }

  stop(): void {
    this.isStarted = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.unsubscribeSignaling) this.unsubscribeSignaling();
    for (const [id, session] of this.sessions) {
      closePeerSession(session);
      this.notifyStatus(id, 'disconnected');
    }
    this.sessions.clear();
    this.reassemblers.clear();
  }

  getConnectedPeers(): string[] {
    return Array.from(this.sessions.entries())
      .filter(([, s]) => s.status === 'connected' && s.dc?.readyState === 'open')
      .map(([id]) => id);
  }

  getAvailablePeers(): string[] {
    const dcPeers = this.getConnectedPeers();
    const sigPeers = this.signaling.peers
      .map((p) => p.deviceId)
      .filter((id) => id && id !== this.currentDevice?.deviceId);
    return Array.from(new Set([...dcPeers, ...sigPeers]));
  }

  getConnectionStatus(deviceId: string): PeerConnectionStatus {
    const session = this.sessions.get(deviceId);
    if (session?.status === 'connected' && session.dc?.readyState === 'open') return 'connected';
    if (session?.status === 'connecting') return 'connecting';
    if (this.signaling.peers.some((p) => p.deviceId === deviceId)) return 'connecting';
    return 'disconnected';
  }

  onMessage(callback: (senderId: string, message: MeshMessage) => void): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  onPeerStatusChange(callback: (deviceId: string, status: PeerConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  sendToPeer(targetDeviceId: string, type: MeshMessageType, payload: any): boolean {
    const session = this.sessions.get(targetDeviceId);
    if (session?.status === 'connected' && session.dc?.readyState === 'open') {
      const msg: MeshMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        senderDeviceId: this.currentDevice?.deviceId || '',
        targetDeviceId,
        payload,
        timestamp: Date.now(),
      };
      const frames = serializeMessage(msg);
      for (const frame of frames) {
        session.dc.send(JSON.stringify(frame));
      }
      return true;
    }

    // High-Reliability Fallback: Instant relay over Local LAN SSE / Supabase
    this.signaling.sendSignal(targetDeviceId, 'DATA_MESSAGE', { type, payload }).catch(() => {});
    return true;
  }

  broadcastMessage(type: MeshMessageType, payload: any): void {
    for (const peerId of this.getAvailablePeers()) {
      this.sendToPeer(peerId, type, payload);
    }
  }

  private async handlePeersUpdate(peers: PeerPresenceInfo[]): Promise<void> {
    for (const peer of peers) {
      await this.handlePeerJoin(peer);
    }
  }

  private async handlePeerJoin(peer: PeerPresenceInfo): Promise<void> {
    if (!this.currentDevice || peer.deviceId === this.currentDevice.deviceId) return;
    const authorized = await isDeviceAuthorized(peer.deviceId);
    if (!authorized) return;

    const shouldInitiate = this.currentDevice.deviceId > peer.deviceId;
    const existing = this.sessions.get(peer.deviceId);
    const isStale = existing?.status === 'connecting' && Date.now() - existing.lastSeen > 8000;
    if (!existing || existing.status === 'disconnected' || isStale) {
      if (shouldInitiate) {
        await this.initiateConnection(peer.deviceId);
      }
    }
  }

  private handlePeerLeave(deviceId: string): void {
    this.disconnectPeer(deviceId);
  }

  private async initiateConnection(peerId: string): Promise<void> {
    const session = this.initSession(peerId);
    session.status = 'connecting';
    this.notifyStatus(peerId, 'connecting');
    const dc = session.pc.createDataChannel('pos-sync-channel', { ordered: true });
    this.attachDataChannel(peerId, dc);
    const offer = await session.pc.createOffer();
    await session.pc.setLocalDescription(offer);
    await this.signaling.sendSignal(peerId, 'OFFER', offer);
  }

  private earlyCandidates: Map<string, any[]> = new Map();

  disconnectPeer(deviceId: string): void {
    const session = this.sessions.get(deviceId);
    if (session) {
      closePeerSession(session);
      this.sessions.delete(deviceId);
      this.reassemblers.delete(deviceId);
      this.earlyCandidates.delete(deviceId);
      this.notifyStatus(deviceId, 'disconnected');
    }
  }

  private async handleSignalEnvelope(env: SignalingEnvelope): Promise<void> {
    if (!this.currentDevice || env.senderDeviceId === this.currentDevice.deviceId) return;
    const authorized = await isDeviceAuthorized(env.senderDeviceId);
    if (!authorized) return;

    if (env.type === 'DATA_MESSAGE') {
      const { type, payload } = env.payload || {};
      if (type) {
        const msg: MeshMessage = {
          id: `msg_${env.timestamp}_${Math.random().toString(36).slice(2, 8)}`,
          type,
          senderDeviceId: env.senderDeviceId,
          targetDeviceId: env.targetDeviceId,
          payload,
          timestamp: env.timestamp,
        };
        this.messageListeners.forEach((fn) => fn(env.senderDeviceId, msg));
      }
      return;
    }

    if (env.type === 'OFFER') {
      const session = this.initSession(env.senderDeviceId);
      session.status = 'connecting';
      this.notifyStatus(env.senderDeviceId, 'connecting');
      await session.pc.setRemoteDescription(new RTCSessionDescription(env.payload));
      await drainPendingCandidates(session);
      const answer = await session.pc.createAnswer();
      await session.pc.setLocalDescription(answer);
      await this.signaling.sendSignal(env.senderDeviceId, 'ANSWER', answer);
    } else if (env.type === 'ANSWER') {
      const session = this.sessions.get(env.senderDeviceId);
      if (session) {
        await session.pc.setRemoteDescription(new RTCSessionDescription(env.payload));
        await drainPendingCandidates(session);
      }
    } else if (env.type === 'ICE_CANDIDATE') {
      const session = this.sessions.get(env.senderDeviceId);
      if (session?.pc.remoteDescription) {
        try { await session.pc.addIceCandidate(new RTCIceCandidate(env.payload)); } catch {}
      } else if (session) {
        session.pendingCandidates.push(env.payload);
      } else {
        const list = this.earlyCandidates.get(env.senderDeviceId) || [];
        list.push(env.payload);
        this.earlyCandidates.set(env.senderDeviceId, list);
      }
    }
  }

  private initSession(peerId: string): PeerSession {
    const existing = this.sessions.get(peerId);
    if (existing) closePeerSession(existing);

    const session = createPeerSession(
      peerId,
      (candidate) => this.signaling.sendSignal(peerId, 'ICE_CANDIDATE', candidate.toJSON()),
      (dc) => this.attachDataChannel(peerId, dc),
      (status) => this.notifyStatus(peerId, status)
    );

    // Drain early buffered candidates
    const early = this.earlyCandidates.get(peerId);
    if (early && early.length > 0) {
      session.pendingCandidates.push(...early);
      this.earlyCandidates.delete(peerId);
    }

    this.sessions.set(peerId, session);
    return session;
  }

  private attachDataChannel(peerId: string, dc: RTCDataChannel): void {
    const session = this.sessions.get(peerId);
    if (!session) return;
    setupDataChannel(
      session,
      dc,
      () => this.notifyStatus(peerId, 'connected'),
      () => this.notifyStatus(peerId, 'disconnected'),
      (data) => {
        try {
          const frame = JSON.parse(data) as WireFrame;
          let r = this.reassemblers.get(peerId);
          if (!r) {
            r = new MessageReassembler();
            this.reassemblers.set(peerId, r);
          }
          const msg = r.addFrame(frame);
          if (msg) {
            if (msg.type === 'PING') this.sendToPeer(peerId, 'PONG', null);
            else this.messageListeners.forEach((fn) => fn(peerId, msg));
          }
        } catch (err) {
          console.error('P2P parse error:', err);
        }
      }
    );
  }

  private notifyStatus(peerId: string, status: PeerConnectionStatus): void {
    this.statusListeners.forEach((fn) => fn(peerId, status));
  }

  private runHeartbeat(): void {
    const now = Date.now();
    for (const [peerId, session] of this.sessions.entries()) {
      if (session.status === 'connected') {
        if (now - session.lastSeen > 15000) {
          closePeerSession(session);
          this.sessions.delete(peerId);
          this.notifyStatus(peerId, 'disconnected');
        } else {
          this.sendToPeer(peerId, 'PING', null);
        }
      } else if (session.status === 'connecting' && now - session.lastSeen > 10000) {
        closePeerSession(session);
        this.sessions.delete(peerId);
        this.notifyStatus(peerId, 'disconnected');
      }
    }
  }
}

let meshInstance: P2PMeshManager | null = null;
export function getP2PMesh(): P2PMeshManager {
  return (meshInstance ??= new P2PMeshManager());
}
