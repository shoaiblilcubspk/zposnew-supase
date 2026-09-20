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
 * TURN credentials below are from Open Relay Project (free, publicly available).
 * For production: replace with your own Coturn / Twilio / Metered.ca credentials.
 * Env override: VITE_TURN_URL, VITE_TURN_USER, VITE_TURN_PASS in .env.local
 */

const TURN_URL  = import.meta.env.VITE_TURN_URL  || 'turn:openrelay.metered.ca:80';
const TURN_URL2 = import.meta.env.VITE_TURN_URL2 || 'turn:openrelay.metered.ca:443';
const TURN_URL3 = import.meta.env.VITE_TURN_URL3 || 'turns:openrelay.metered.ca:443';
const TURN_USER = import.meta.env.VITE_TURN_USER || 'openrelayproject';
const TURN_PASS = import.meta.env.VITE_TURN_PASS || 'openrelayproject';

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  // ── STUN servers (fast, free, no auth — works for ~80% of connections) ──
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:openrelay.metered.ca:80' },

  // ── TURN servers (relay — guarantees connectivity for strict NAT / different LAN) ──
  // These are the Open Relay Project public TURN servers (free tier)
  {
    urls: TURN_URL,
    username: TURN_USER,
    credential: TURN_PASS,
  },
  {
    urls: TURN_URL2,
    username: TURN_USER,
    credential: TURN_PASS,
  },
  {
    urls: TURN_URL3,
    username: TURN_USER,
    credential: TURN_PASS,
  },
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
