import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "max" | "full";
  footer?: React.ReactNode;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  showClose?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

const maxWidthClasses = {
  sm: 'sm:max-w-[480px]',
  md: 'sm:max-w-[640px]',
  lg: 'sm:max-w-[800px]',
  xl: 'sm:max-w-[1000px]',
  max: 'sm:max-w-screen-xl',
  full: 'sm:max-w-[95vw]'
};

export function Modal({ 
  isOpen, 
  open,
  onClose, 
  title, 
  subtitle, 
  maxWidth = "md", 
  footer, 
  children,
  headerActions,
  showClose = true,
  className,
  headerClassName,
  bodyClassName
}: ModalProps) {
  const activeOpen = Boolean(isOpen ?? open);
  const [render, setRender] = useState(activeOpen);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeOpen) {
      setRender(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => {
        setRender(false);
        const otherOpenModals = Array.from(document.querySelectorAll('[data-modal="true"]'))
          .filter(el => el !== containerRef.current);
        if (otherOpenModals.length === 0) {
          document.body.style.overflow = '';
        }
      }, 250);
      return () => clearTimeout(timer);
    }
    
    return () => {
      const otherOpenModals = Array.from(document.querySelectorAll('[data-modal="true"]'))
        .filter(el => el !== containerRef.current);
      if (otherOpenModals.length === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [activeOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [activeOpen, onClose]);

  if (!render) return null;

  const modalContent = (
    <div ref={containerRef} data-modal="true" className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom)+var(--bottom-nav-clearance))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-150 ${activeOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {/* Dialog */}
      <div 
        className={cn(
          "relative flex flex-col w-full sm:w-[90vw] bg-white dark:bg-[#121215] border border-neutral-200 dark:border-white/10",
          "rounded-lg shadow-2xl overflow-hidden",
          maxWidthClasses[maxWidth],
            "max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)-var(--bottom-nav-clearance))] md:max-h-[calc(90dvh-env(safe-area-inset-top))]",
          "transition-all duration-150 ease-out",
          activeOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-98 opacity-0',
          className
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className={cn(
            "flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#121215]",
            headerClassName
          )}>
            <div className="flex flex-col min-w-0">
              {title && <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white truncate">{title}</h2>}
              {subtitle && <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {headerActions}
              {showClose && (
                <button 
                  onClick={onClose}
                  title="Close (Esc)"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.08] transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-white/[0.1]"
                >
                  <X className="w-4 h-4 stroke-[2.2]" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className={cn(
          "flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-5 sm:p-6 text-default custom-scrollbar",
          bodyClassName
        )}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-[#151518] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

