/**
 * Local Offline Mesh Signaling Transport
 * Combines BroadcastChannel (same machine) & LAN SSE Relay (/api/mesh/) for 100% offline P2P sync.
 */

import { DeviceProfile } from './deviceIdentity';
import { PeerPresenceInfo, SignalingEnvelope } from './signalingTypes';

export class LocalSignalingTransport {
  private broadcastChannel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
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

    // 1. BroadcastChannel for same-machine tabs & windows
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

    // 2. Local LAN SSE Relay (/api/mesh/events)
    if (typeof EventSource !== 'undefined') {
      try {
        const sseUrl = `/api/mesh/events?deviceId=${encodeURIComponent(currentDevice.deviceId)}`;
        this.eventSource = new EventSource(sseUrl);

        this.eventSource.addEventListener('presence', (ev: MessageEvent) => {
          try {
            const peer = JSON.parse(ev.data) as PeerPresenceInfo;
            if (peer.deviceId && peer.deviceId !== this.currentDevice?.deviceId) {
              this.onPresenceCb?.(peer);
            }
          } catch {}
        });

        this.eventSource.addEventListener('peer-leave', (ev: MessageEvent) => {
          try {
            const { deviceId } = JSON.parse(ev.data);
            if (deviceId) this.onLeaveCb?.(deviceId);
          } catch {}
        });

        this.eventSource.addEventListener('signal', (ev: MessageEvent) => {
          try {
            const envelope = JSON.parse(ev.data) as SignalingEnvelope;
            if (
              envelope.targetDeviceId === '*' ||
              envelope.targetDeviceId === this.currentDevice?.deviceId
            ) {
              this.onSignalCb?.(envelope);
            }
          } catch {}
        });

        this.eventSource.onerror = () => {
          // Expected when running without local node server or offline
        };
      } catch (err) {
        console.warn('[LocalTransport] EventSource init notice:', err);
      }
    }

    // Announce local terminal presence continuously
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

    try {
      fetch('/api/mesh/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      }).catch(() => {});
    } catch {}
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

    try {
      fetch('/api/mesh/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      }).catch(() => {});
    } catch {}
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
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
