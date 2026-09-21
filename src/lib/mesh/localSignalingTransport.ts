/**
 * Local Offline Mesh Signaling Transport
 * Uses BroadcastChannel for same-machine tabs & windows.
 * LAN/WAN peer discovery & signaling handled by WebRTC Mesh + Supabase Realtime.
 * No dependency on external HTTP/SSE endpoints — works 100% offline in Tauri.
 */

import { DeviceProfile } from './deviceIdentity';
import { PeerPresenceInfo, SignalingEnvelope } from './signalingTypes';

export class LocalSignalingTransport {
  private broadcastChannel: BroadcastChannel | null = null;
  private currentDevice: DeviceProfile | null = null;
  private onPresenceCb: ((peer: PeerPresenceInfo) => void) | null = null;
  private onLeaveCb: ((deviceId: string) => void) | null = null;
  private onSignalCb: ((envelope: SignalingEnvelope) => void) | null = null;
  private presenceTimer: any = null;

  init(
    currentDevice: DeviceProfile,
    onPresence: (peer: PeerPresenceInfo) => void,
    onLeave: (deviceId: string) => void,
    onSignal: (envelope: SignalingEnvelope) => void
  ): void {
    this.currentDevice = currentDevice;
    this.onPresenceCb = onPresence;
    this.onLeaveCb = onLeave;
    this.onSignalCb = onSignal;

    // BroadcastChannel for same-machine tabs & windows (works in Tauri WebView)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('zpos_mesh_signaling');
        this.broadcastChannel.onmessage = (ev) => {
          const msg = ev.data;
          if (!msg || msg.senderDeviceId === this.currentDevice?.deviceId) return;

          if (msg.kind === 'presence' && msg.data) {
            this.onPresenceCb?.(msg.data);
          } else if (msg.kind === 'leave' && msg.deviceId) {
            this.onLeaveCb?.(msg.deviceId);
          } else if (msg.kind === 'signal' && msg.data) {
            const envelope = msg.data as SignalingEnvelope;
            if (
              envelope.targetDeviceId === '*' ||
              envelope.targetDeviceId === this.currentDevice?.deviceId
            ) {
              this.onSignalCb?.(envelope);
            }
          }
        };
      } catch (err) {
        console.warn('[LocalTransport] BroadcastChannel init notice:', err);
      }
    }

    // Announce local terminal presence continuously via BroadcastChannel
    const sendPresence = () => {
      this.broadcastPresence({
        deviceId: currentDevice.deviceId,
        name: currentDevice.name,
        role: currentDevice.role,
        publicKey: currentDevice.publicKey,
        joinedAt: Date.now(),
      });
    };
    sendPresence();
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    this.presenceTimer = setInterval(sendPresence, 5000);
  }

  broadcastPresence(info: PeerPresenceInfo): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          kind: 'presence',
          senderDeviceId: info.deviceId,
          data: info,
        });
      } catch {}
    }
  }

  sendSignal(envelope: SignalingEnvelope): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          kind: 'signal',
          senderDeviceId: envelope.senderDeviceId,
          data: envelope,
        });
      } catch {}
    }
  }

  close(): void {
    if (this.broadcastChannel) {
      if (this.currentDevice) {
        try {
          this.broadcastChannel.postMessage({
            kind: 'leave',
            senderDeviceId: this.currentDevice.deviceId,
            deviceId: this.currentDevice.deviceId,
          });
        } catch {}
      }
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }
}