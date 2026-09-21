/**
 * Hybrid Mesh Signaling Client
 * Combines Local LAN SSE / BroadcastChannel (zero-cloud offline) + Supabase Realtime (WAN).
 * Zero business data or SQL tables accessed.
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { getDeviceProfile, DeviceProfile } from './deviceIdentity';
import { signData, verifySignature } from '../crypto/deviceKeypair';
import { LocalSignalingTransport } from './localSignalingTransport';
import {
  SignalMessageType,
  SignalingEnvelope,
  PeerPresenceInfo,
  SignalingListeners,
} from './signalingTypes';

export class SignalingChannel {
  private channel: RealtimeChannel | null = null;
  private localTransport = new LocalSignalingTransport();
  private shopId: string | null = null;
  private currentDevice: DeviceProfile | null = null;
  private listeners: Set<SignalingListeners> = new Set();
  private onlinePeers: Map<string, PeerPresenceInfo> = new Map();
  private processedSignals: Set<string> = new Set();
  private announceTimer: any = null;
  private _isConnected = false;

  get isConnected(): boolean {
    return this._isConnected || this.localTransport !== null;
  }

  get peers(): PeerPresenceInfo[] {
    return Array.from(this.onlinePeers.values());
  }

  async connect(shopId: string): Promise<void> {
    this.shopId = shopId;
    this.currentDevice = await getDeviceProfile();

    // 1. Initialize offline local transport (BroadcastChannel + Local LAN SSE Relay)
    this.localTransport.init(
      this.currentDevice,
      (peer) => this.handlePeerJoin(peer),
      (deviceId) => this.handlePeerLeave(deviceId),
      (envelope) => this.handleIncomingSignal(envelope)
    );

    // 2. Connect Supabase Realtime for WAN / Internet mesh (fails gracefully if offline)
    if (this.channel) {
      await this.disconnectSupabase();
    }

    try {
      const channelTopic = `mesh-signaling:${shopId}`;
      this.channel = supabase.channel(channelTopic, {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: this.currentDevice.deviceId },
        },
      });

      this.channel
        .on('presence', { event: 'sync' }, () => {
          const state = this.channel?.presenceState() || {};
          for (const [key, presences] of Object.entries(state)) {
            if (key === this.currentDevice?.deviceId) continue;
            if (Array.isArray(presences) && presences.length > 0) {
              const peerData = presences[0] as unknown as PeerPresenceInfo;
              if (peerData?.deviceId) this.handlePeerJoin(peerData);
            }
          }
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          if (Array.isArray(newPresences)) {
            for (const p of newPresences) {
              const peer = p as unknown as PeerPresenceInfo;
              if (peer?.deviceId && peer.deviceId !== this.currentDevice?.deviceId) {
                this.handlePeerJoin(peer);
              }
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          if (Array.isArray(leftPresences)) {
            for (const p of leftPresences) {
              const peer = p as unknown as PeerPresenceInfo;
              if (peer?.deviceId) this.handlePeerLeave(peer.deviceId);
            }
          }
        });

      this.channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        await this.handleIncomingSignal(payload as SignalingEnvelope);
      });

      this.channel.on('broadcast', { event: 'peer_announce' }, ({ payload }) => {
        if (payload?.deviceId && payload.deviceId !== this.currentDevice?.deviceId) {
          this.handlePeerJoin(payload as PeerPresenceInfo);
        }
      });

      this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this._isConnected = true;
          this.broadcastAnnounce();
          try {
            await this.channel?.track({
              deviceId: this.currentDevice!.deviceId,
              name: this.currentDevice!.name,
              role: this.currentDevice!.role,
              publicKey: this.currentDevice!.publicKey,
              joinedAt: Date.now(),
            });
          } catch {}
        } else {
          this._isConnected = false;
        }
      });

      if (this.announceTimer) clearInterval(this.announceTimer);
      this.announceTimer = setInterval(() => this.broadcastAnnounce(), 4000);
    } catch (err) {
      console.warn('[SignalingChannel] Supabase connect offline fallback:', err);
    }
  }

  private handlePeerJoin(peer: PeerPresenceInfo): void {
    if (!peer?.deviceId || peer.deviceId === this.currentDevice?.deviceId) return;
    this.onlinePeers.set(peer.deviceId, peer);
    this.listeners.forEach((l) => l.onPeerJoin?.(peer));
    this.notifyPeersUpdate();
  }

  private handlePeerLeave(deviceId: string): void {
    if (!deviceId) return;
    this.onlinePeers.delete(deviceId);
    this.listeners.forEach((l) => l.onPeerLeave?.(deviceId));
    this.notifyPeersUpdate();
  }

  private async handleIncomingSignal(envelope: SignalingEnvelope): Promise<void> {
    if (!envelope || !envelope.targetDeviceId) return;
    if (
      envelope.targetDeviceId !== this.currentDevice?.deviceId &&
      envelope.targetDeviceId !== '*'
    ) {
      return;
    }

    // Deduplicate signals arriving from multiple transports
    const sigKey = `${envelope.senderDeviceId}:${envelope.type}:${envelope.timestamp}`;
    if (this.processedSignals.has(sigKey)) return;
    this.processedSignals.add(sigKey);
    if (this.processedSignals.size > 200) {
      const first = this.processedSignals.values().next().value;
      if (first) this.processedSignals.delete(first);
    }

    // Ensure sender is registered in online peers
    if (!this.onlinePeers.has(envelope.senderDeviceId)) {
      this.handlePeerJoin({
        deviceId: envelope.senderDeviceId,
        name: `Terminal-${envelope.senderDeviceId.slice(0, 6)}`,
        role: 'terminal',
        publicKey: '',
        joinedAt: envelope.timestamp,
      });
    }

    // Cryptographic signature check if sender publicKey is available
    if (envelope.signature) {
      const sender = this.onlinePeers.get(envelope.senderDeviceId);
      if (sender?.publicKey) {
        const contentToVerify = `${envelope.senderDeviceId}:${envelope.targetDeviceId}:${envelope.type}:${envelope.timestamp}`;
        const isValid = await verifySignature(contentToVerify, envelope.signature, sender.publicKey);
        if (!isValid) {
          console.warn('[Signaling] Rejected signal with invalid signature:', envelope.senderDeviceId);
          return;
        }
      }
    }

    this.listeners.forEach((l) => l.onSignal?.(envelope));
  }

  async sendSignal<T = any>(
    targetDeviceId: string,
    type: SignalMessageType,
    payload: T
  ): Promise<void> {
    if (!this.currentDevice) {
      this.currentDevice = await getDeviceProfile();
    }

    const timestamp = Date.now();
    const contentToSign = `${this.currentDevice.deviceId}:${targetDeviceId}:${type}:${timestamp}`;
    const signature = await signData(contentToSign);

    const envelope: SignalingEnvelope<T> = {
      senderDeviceId: this.currentDevice.deviceId,
      targetDeviceId,
      type,
      payload,
      timestamp,
      signature,
    };

    // 1. Send via local offline transport (BroadcastChannel + Local LAN SSE Relay)
    this.localTransport.sendSignal(envelope);

    // 2. Also send via Supabase Realtime if connected
    if (this.channel && (this._isConnected || (this.channel as any)?.state === 'joined')) {
      try {
        await this.channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: envelope,
        });
      } catch {}
    }
  }

  broadcastAnnounce(): void {
    if (!this.currentDevice) return;
    const peerInfo: PeerPresenceInfo = {
      deviceId: this.currentDevice.deviceId,
      name: this.currentDevice.name,
      role: this.currentDevice.role,
      publicKey: this.currentDevice.publicKey,
      joinedAt: Date.now(),
    };
    this.localTransport.broadcastPresence(peerInfo);
    if (this.channel && (this._isConnected || (this.channel as any)?.state === 'joined')) {
      this.channel.send({
        type: 'broadcast',
        event: 'peer_announce',
        payload: peerInfo,
      }).catch(() => {});
    }
  }

  private async disconnectSupabase(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.untrack();
        await supabase.removeChannel(this.channel);
      } catch {}
      this.channel = null;
      this._isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.announceTimer) {
      clearInterval(this.announceTimer);
      this.announceTimer = null;
    }
    this.localTransport.close();
    await this.disconnectSupabase();
    this.onlinePeers.clear();
    this.notifyPeersUpdate();
  }

  subscribe(listeners: SignalingListeners): () => void {
    this.listeners.add(listeners);
    listeners.onPeersUpdate?.(this.peers);
    return () => {
      this.listeners.delete(listeners);
    };
  }

  private notifyPeersUpdate(): void {
    const list = this.peers;
    this.listeners.forEach((l) => l.onPeersUpdate?.(list));
  }
}

let signalingInstance: SignalingChannel | null = null;

export function getSignalingChannel(): SignalingChannel {
  if (!signalingInstance) {
    signalingInstance = new SignalingChannel();
  }
  return signalingInstance;
}
