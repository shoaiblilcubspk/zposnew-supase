import { Keyboard, Search, ShoppingBag, RefreshCw, FileText, Trash2, CreditCard, Check, X, Layers } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const terminalShortcuts = [
    { key: 'F3 or /', label: "Focus Search", desc: "Instantly focuses the product search bar to start scanning or typing.", icon: Search },
    { key: 'F2', label: "Open Checkout", desc: "Open the checkout and settlement screen when items are in the cart.", icon: CreditCard },
    { key: 'F4', label: "Hold Order / Save Draft", desc: "Saves the current cart session as a draft to retrieve it later.", icon: FileText },
    { key: 'F5', label: "New Cart Tab", desc: "Creates a new active cart tab for multitasking multiple clients.", icon: Layers },
    { key: 'F6', label: "Toggle Return Mode", desc: "Switches the POS between standard sales mode and customer return mode.", icon: RefreshCw },
    { key: 'F7', label: "Open Draft Archives", desc: "Opens the list of saved/suspended drafts to resume checkout.", icon: ShoppingBag },
    { key: 'Ctrl + Del', label: "Clear Entire Cart", desc: "Wipes out all items currently inside the active cart session.", icon: Trash2 },
  ];

  const checkoutShortcuts = [
    { key: '1', label: "Select Cash", desc: "Select Cash as the payment method for the current sale.", icon: CreditCard },
    { key: '2', label: "Select Card", desc: "Select Card payment method for digital terminal swipe.", icon: CreditCard },
    { key: '3', label: "Select Online", desc: "Select Online payment method.", icon: CreditCard },
    { key: '4', label: "Select Credit", desc: "Select Credit payment method (if enabled & customer selected).", icon: CreditCard },
    { key: '5', label: "Select Split Payment", desc: "Switch to split/mixed payment modes (e.g. Cash + Card).", icon: CreditCard },
    { key: 'E', label: "Exact Amount Match", desc: "Auto-fill the received amount to match the final net total.", icon: Check },
    { key: 'Enter', label: "Process & Save Sale", desc: "Complete payment verification and record sale to database.", icon: Check },
    { key: 'Esc', label: "Cancel / Close", desc: "Dismiss checkout pop-up and return back to POS cart view.", icon: X },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={"Keyboard Shortcuts Guide"}
      subtitle={"Master these keys for lightning fast checkout speeds"}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end w-full">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-md text-[13px] font-medium bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
          >
            {"Close Guide"}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* POS Terminal Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-white/[0.08]">
              <Keyboard className="w-4 h-4 text-primary" />
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-neutral-900 dark:text-white">
                {"POS Terminal"}
              </h3>
            </div>
            <div className="space-y-2">
              {terminalShortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <div 
                    key={shortcut.key} 
                    className="p-2.5 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] flex items-start gap-2.5"
                  >
                    <div className="p-1.5 rounded bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/[0.08] text-neutral-500 mt-0.5 shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-neutral-900 dark:text-neutral-200">
                          {shortcut.label}
                        </span>
                        <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-neutral-300 dark:border-white/20 bg-neutral-100 dark:bg-neutral-800 text-[11px] font-mono text-neutral-700 dark:text-neutral-300 shrink-0">
                          {shortcut.key}
                        </kbd>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-normal">
                        {shortcut.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkout Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-white/[0.08]">
              <CreditCard className="w-4 h-4 text-primary" />
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-neutral-900 dark:text-white">
                {"Checkout & Settlement"}
              </h3>
            </div>
            <div className="space-y-2">
              {checkoutShortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <div 
                    key={shortcut.key} 
                    className="p-2.5 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] flex items-start gap-2.5"
                  >
                    <div className="p-1.5 rounded bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/[0.08] text-neutral-500 mt-0.5 shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-neutral-900 dark:text-neutral-200">
                          {shortcut.label}
                        </span>
                        <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-neutral-300 dark:border-white/20 bg-neutral-100 dark:bg-neutral-800 text-[11px] font-mono text-neutral-700 dark:text-neutral-300 shrink-0">
                          {shortcut.key}
                        </kbd>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-normal">
                        {shortcut.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </Modal>
  );
}
