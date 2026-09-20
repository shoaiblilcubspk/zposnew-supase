/**
 * Ephemeral 6-Digit Pairing PIN Signaling Service
 * Enables devices without webcams to pair with the Primary Terminal using a 6-digit numeric PIN.
 * Uses lightweight Supabase Realtime broadcast channels with instant cleanup.
 */

import { supabase } from '../supabase';

export interface SecondaryDeviceInfo {
  deviceId: string;
  name: string;
  role?: 'primary' | 'terminal';
  publicKey: string;
}

export interface PairingSessionResponse {
  tokenString: string;
  shopProfile?: { name: string; currency: string };
  initialUsers?: any[];
}

/**
 * Primary terminal publishes the pairing token on an ephemeral channel indexed by pin6.
 */
export function publishPairingPinSession(
  pin6: string,
  tokenString: string,
  bootstrap?: {
    shopProfile?: { name: string; currency: string };
    initialUsers?: any[];
  },
  onSecondaryJoined?: (device?: SecondaryDeviceInfo) => void
): () => void {
  const cleanPin = pin6.replace(/\D/g, '');
  const channelTopic = `pairing-pin:${cleanPin}`;

  const channel = supabase.channel(channelTopic, {
    config: { broadcast: { self: false, ack: false } },
  });

  channel
    .on('broadcast', { event: 'request_token' }, () => {
      // Send token and bootstrap data back to the requesting terminal
      channel.send({
        type: 'broadcast',
        event: 'offer_token',
        payload: {
          tokenString,
          shopProfile: bootstrap?.shopProfile,
          initialUsers: bootstrap?.initialUsers,
        },
      }).catch(() => {});
    })
    .on('broadcast', { event: 'joined' }, ({ payload }) => {
      onSecondaryJoined?.(payload?.device);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Secondary terminal resolves the 6-digit PIN by requesting the pairing token over broadcast.
 */
export async function resolvePairingPin(
  pin6: string,
  timeoutMs = 10000,
  deviceInfo?: SecondaryDeviceInfo
): Promise<PairingSessionResponse> {
  const cleanPin = pin6.replace(/\D/g, '');
  if (cleanPin.length !== 6) {
    throw new Error('Please enter a valid 6-digit pairing code (e.g. 123-456).');
  }

  const channelTopic = `pairing-pin:${cleanPin}`;
  const channel = supabase.channel(channelTopic, {
    config: { broadcast: { self: false, ack: false } },
  });

  return new Promise<PairingSessionResponse>((resolve, reject) => {
    let timer: any = null;
    let resolved = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };

    channel
      .on('broadcast', { event: 'offer_token' }, ({ payload }) => {
        if (resolved) return;
        if (payload?.tokenString) {
          resolved = true;
          channel.send({
            type: 'broadcast',
            event: 'joined',
            payload: { device: deviceInfo },
          }).catch(() => {});
          cleanup();
          resolve({
            tokenString: payload.tokenString,
            shopProfile: payload.shopProfile,
            initialUsers: payload.initialUsers,
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'request_token',
            payload: {},
          }).catch(() => {});

          setTimeout(() => {
            if (!resolved) {
              channel.send({
                type: 'broadcast',
                event: 'request_token',
                payload: {},
              }).catch(() => {});
            }
          }, 1500);
        }
      });

    timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(
          new Error(
            `Pairing PIN "${cleanPin}" not found or expired. Ensure Primary Terminal has the Pair screen open.`
          )
        );
      }
    }, timeoutMs);
  });
}
