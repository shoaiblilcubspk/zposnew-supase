/**
 * "Join existing shop" via device pairing has been removed (Supabase-only cloud-direct).
 * New devices simply sign in with a staff account. This stub keeps the caller contract.
 */
import React from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function JoinShopModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[min(420px,92vw)] rounded-xl border border-white/[0.08] bg-neutral-900 p-5 text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-semibold tracking-tight">Sign in to your shop</h3>
        <p className="mt-2 text-[13px] text-neutral-400">
          Joining is now automatic through the cloud. Just sign in with your staff username and
          password on the login screen — no device pairing required.
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
