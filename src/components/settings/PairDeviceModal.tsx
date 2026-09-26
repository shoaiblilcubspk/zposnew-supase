/**
 * Device pairing removed — Supabase-only cloud-direct architecture.
 * Devices no longer pair peer-to-peer; every terminal simply signs in with a staff account
 * and syncs through Supabase. This stub keeps the component contract for callers.
 */
import React from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PairDeviceModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom)+var(--bottom-nav-clearance))] md:pb-4" onClick={onClose}>
      <div
        className="w-[min(420px,92vw)] rounded-xl border border-white/[0.08] bg-neutral-900 p-5 text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-semibold tracking-tight">Cloud Sync</h3>
        <p className="mt-2 text-[13px] text-neutral-400">
          Device pairing is no longer needed. Each device syncs automatically through the cloud —
          just sign in with a staff account.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-8 rounded-lg bg-white/[0.06] px-3 text-[13px] hover:bg-white/[0.1]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
