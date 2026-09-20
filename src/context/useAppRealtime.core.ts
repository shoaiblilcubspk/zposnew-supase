/**
 * useAppRealtime (Deprecated - Phase 22 Local-First Migration)
 * Supabase Postgres table changes are replaced by WebRTC P2P DataChannels.
 * Supabase Realtime is strictly dedicated to ephemeral signaling in signalingChannel.ts.
 */

export function useAppRealtime(
  _subscriptionsInitialized: React.MutableRefObject<boolean>,
  _reconnectTrigger: number,
  _setReconnectTrigger: React.Dispatch<React.SetStateAction<number>>
) {
  // Pure local-first P2P mesh architecture — no postgres change subscriptions
}
