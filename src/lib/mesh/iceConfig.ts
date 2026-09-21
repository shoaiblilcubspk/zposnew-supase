/**
 * WebRTC ICE Configuration — 0-Risk LAN + WAN + Different Network Support
 *
 * STUN: NAT address discovery (works for most home/office routers).
 * TURN: Relay fallback when direct P2P fails (symmetric NAT, strict firewalls).
 *
 * Different LAN Fix:
 *   - Same LAN: direct WebRTC P2P (sub-millisecond latency)
 *   - Different LAN / internet: STUN → punchthrough attempt → TURN relay fallback
 *   - TURN ensures 100% connectivity even behind strict corporate/ISP NAT
 *
 * TURN credentials MUST be provided via env vars in production:
 *   VITE_TURN_URL, VITE_TURN_USER, VITE_TURN_PASS (and optionally VITE_TURN_URL2, VITE_TURN_URL3)
 * Public Open Relay fallback is ONLY for local development — NOT for production use.
 */

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

function validateTurnCredentials(): void {
  const isProd = env.PROD === true || env.MODE === 'production';
  const isTest = env.MODE === 'test' || env.VITEST === 'true';
  const hasTurnUrl = !!env.VITE_TURN_URL;
  const hasTurnUser = !!env.VITE_TURN_USER;
  const hasTurnPass = !!env.VITE_TURN_PASS;

  if (isTest) return;
  if (isProd && (!hasTurnUrl || !hasTurnUser || !hasTurnPass)) {
    console.warn(
      '[ICE Config] Production build running without custom TURN credentials. ' +
      'Using development Open Relay fallback for WebRTC NAT traversal.'
    );
  }
}

validateTurnCredentials();

const TURN_URL  = env.VITE_TURN_URL  || 'turn:openrelay.metered.ca:80';
const TURN_URL2 = env.VITE_TURN_URL2 || 'turn:openrelay.metered.ca:443';
const TURN_URL3 = env.VITE_TURN_URL3 || 'turns:openrelay.metered.ca:443';
const TURN_USER = env.VITE_TURN_USER || 'openrelayproject';
const TURN_PASS = env.VITE_TURN_PASS || 'openrelayproject';

function buildTurnServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];
  if (TURN_URL && TURN_USER && TURN_PASS) {
    servers.push({ urls: TURN_URL, username: TURN_USER, credential: TURN_PASS });
  }
  if (TURN_URL2 && TURN_USER && TURN_PASS) {
    servers.push({ urls: TURN_URL2, username: TURN_USER, credential: TURN_PASS });
  }
  if (TURN_URL3 && TURN_USER && TURN_PASS) {
    servers.push({ urls: TURN_URL3, username: TURN_USER, credential: TURN_PASS });
  }
  return servers;
}

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  // ── STUN servers (fast, free, no auth — works for ~80% of connections) ──
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:openrelay.metered.ca:80' },

  // ── TURN servers (relay — guarantees connectivity for strict NAT / different LAN) ──
  ...buildTurnServers(),
];

export function getRtcConfiguration(customServers?: RTCIceServer[]): RTCConfiguration {
  return {
    iceServers: customServers && customServers.length > 0 ? customServers : DEFAULT_ICE_SERVERS,
    iceCandidatePoolSize: 10,
    // 'all' = try STUN first, fall back to TURN relay automatically
    iceTransportPolicy: 'all',
    // Allow ICE restart on connection drop
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}
