import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { dialogEvents } from '../../lib/dialog';
import { AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

interface DialogState {
  id: string;
  type: 'confirm' | 'delete' | 'input' | 'loading';
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  inputType?: 'text' | 'email' | 'password' | 'number';
  resolve: (value: any) => void;
}

export const DialogProvider: React.FC = () => {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dialog && isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      const otherOpenModals = document.querySelectorAll('[data-modal="true"]');
      if (otherOpenModals.length === 0) {
        document.body.style.overflow = '';
      }
    }
    return () => {
      const otherOpenModals = document.querySelectorAll('[data-modal="true"]');
      if (otherOpenModals.length === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [dialog, isVisible]);

  useEffect(() => {
    const handleShow = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setDialog(detail);
      setInputValue('');
      setIsVisible(true);

      // Auto-focus input if it's an input dialog
      if (detail.type === 'input') {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setDialog(prev => prev ? { ...prev, ...detail } : null);
    };

    const handleClose = () => {
      setIsVisible(false);
      setTimeout(() => setDialog(null), 200); // Wait for animation
    };

    dialogEvents.addEventListener('show-dialog', handleShow);
    dialogEvents.addEventListener('update-dialog', handleUpdate);
    dialogEvents.addEventListener('close-dialog', handleClose);

    return () => {
      dialogEvents.removeEventListener('show-dialog', handleShow);
      dialogEvents.removeEventListener('update-dialog', handleUpdate);
      dialogEvents.removeEventListener('close-dialog', handleClose);
    };
  }, []);

  const handleConfirm = () => {
    if (!dialog) return;
    if (dialog.type === 'input') {
      dialog.resolve(inputValue);
    } else {
      dialog.resolve(true);
    }
    handleCloseInternal();
  };

  const handleCancel = () => {
    if (!dialog) return;
    dialog.resolve(dialog.type === 'input' ? null : false);
    handleCloseInternal();
  };

  const handleCloseInternal = () => {
    setIsVisible(false);
    setTimeout(() => setDialog(null), 200);
  };

  if (!dialog) return null;

  return createPortal(
    <div data-modal="true" className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 dark:bg-black/80"
        onClick={dialog.type !== 'loading' ? handleCancel : undefined}
      />

      {/* Dialog Card */}
      <div className={`relative w-full max-w-[380px] max-h-[85dvh] sm:max-h-[90dvh] bg-white dark:bg-surface rounded-lg shadow-2xl border border-neutral-200 dark:border-white/[0.08] overflow-hidden transform transition-all duration-150 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}>
        <div className="p-5 flex flex-col items-center text-center overflow-y-auto overscroll-contain">
          {/* Icon Header */}
          <div className={`w-10 h-10 rounded-md flex items-center justify-center mb-3.5 ${dialog.type === 'delete' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
              dialog.type === 'loading' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                'bg-neutral-100 dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/[0.08]'
            }`}>
            {dialog.type === 'delete' ? <AlertTriangle size={20} /> :
              dialog.type === 'loading' ? <Loader2 size={20} className="animate-spin" /> :
                <HelpCircle size={20} />}
          </div>

          <h3 className={`text-[15px] font-semibold mb-1.5 ${dialog.type === 'delete' ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'
            }`}>
            {dialog.title}
          </h3>

          {dialog.text && (
            <p
              className="text-[13px] text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4"
              dangerouslySetInnerHTML={{ __html: dialog.text }}
            />
          )}

          {dialog.type === 'input' && (
            <div className="w-full mb-4">
              <input
                ref={inputRef}
                type={dialog.inputType || 'text'}
                placeholder={dialog.placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md text-[13px] font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 transition-colors"
              />
            </div>
          )}

          {dialog.type !== 'loading' && (
            <div className="flex gap-2 w-full pt-1">
              {dialog.cancelText && (
                <button
                  onClick={handleCancel}
                  className="flex-1 h-8 px-3 bg-white dark:bg-surface hover:bg-neutral-50 dark:hover:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 rounded-md text-[13px] font-medium transition-colors"
                >
                  {dialog.cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`flex-1 h-8 px-3 text-white rounded-md text-[13px] font-medium transition-colors ${dialog.type === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
              >
                {dialog.confirmText || 'Confirm'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
