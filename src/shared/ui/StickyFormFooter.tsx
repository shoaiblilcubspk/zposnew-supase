import React from 'react';
import { Save, RefreshCw } from 'lucide-react';

interface StickyFormFooterProps {
  show?: boolean;
  isSaving: boolean;
  onDiscard: () => void;
  onSave?: () => void;
  saveLabel?: string;
  discardLabel?: string;
  formId?: string;
  disabled?: boolean;
  unsaved?: boolean;
  statusBadge?: React.ReactNode;
}

export function StickyFormFooter({
  show = true,
  isSaving,
  onDiscard,
  onSave,
  saveLabel,
  discardLabel,
  formId,
  disabled = false,
  unsaved = false,
  statusBadge
}: StickyFormFooterProps) {
  if (!show) return null;

  return (
    <div className="relative mt-6 pt-4 border-t border-neutral-200 dark:border-white/[0.08] lg:mt-0 lg:pt-0 lg:fixed lg:bottom-0 lg:left-0 lg:right-0 bg-transparent lg:bg-white lg:dark:bg-surface lg:py-2.5 z-30 shadow-none">
      <div className="max-w-7xl mx-auto px-1 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Status / Unsaved Warning */}
        <div className="flex items-center gap-2">
          {unsaved && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {"Unsaved Changes"}
              </span>
            </div>
          )}
          {statusBadge && <div className="shrink-0">{statusBadge}</div>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto justify-end">
          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 sm:flex-none h-8 px-4 rounded border border-neutral-200 dark:border-white/[0.08] text-[13px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-50 dark:hover:bg-white/[0.04] transition-colors bg-white dark:bg-transparent text-center"
          >
            {discardLabel || "Discard"}
          </button>
          
          <button
            form={formId}
            type={formId ? 'submit' : 'button'}
            onClick={onSave}
            disabled={isSaving || disabled}
            className={`
              flex-1 sm:flex-none h-8 flex items-center justify-center gap-1.5 px-4 rounded bg-primary text-white text-[13px] font-medium shadow-none hover:bg-primary/90 transition-colors
              ${isSaving || disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{"Saving..."}</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{saveLabel || "Save Changes"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
