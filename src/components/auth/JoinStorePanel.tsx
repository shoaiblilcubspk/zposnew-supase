/**
 * "Join store" via device pairing removed (Supabase-only cloud-direct).
 * New devices sign in with a staff account instead. Stub preserves the caller contract.
 */
import React from 'react';

interface JoinStorePanelProps {
  onSuccess?: () => void;
}

export function JoinStorePanel({ onSuccess: _onSuccess }: JoinStorePanelProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-neutral-300">
      <h3 className="text-[14px] font-semibold tracking-tight">Sign in to join</h3>
      <p className="mt-1.5 text-[13px] text-neutral-400">
        Devices now sync through the cloud automatically. Sign in with your staff username and
        password — no pairing code needed.
      </p>
    </div>
  );
}
