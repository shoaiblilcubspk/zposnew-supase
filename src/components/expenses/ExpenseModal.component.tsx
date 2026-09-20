import { useInventoryStore, useSettingsStore, useUsersStore } from '../../stores';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CreditCard, ShoppingBag, Save, Building2 } from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES } from '../../types';
import { Modal } from '../../shared/ui/Modal';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { cn } from '../../lib/utils';
import { sonner } from '../../lib/sonner';
import { Button, ToggleSwitch, Select } from '../../shared/ui';
import { buildExpensePayload } from './expenseModalUtils';
import { paymentModesService } from '../../lib/services/paymentsService';
import { useActionGuard } from '../../hooks/useActionGuard';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id' | 'createdAt'> & { supplierId?: string }) => Promise<void>;
  expense?: Expense | null;
}

export function ExpenseModal({ isOpen, onClose, onSave, expense }: ExpenseModalProps) {
  const appSettings = useSettingsStore(s => s.settings);
  const appCurrentUser = useUsersStore(s => s.currentUser);
  const appSuppliers = useInventoryStore(s => s.suppliers);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    date: '',
    paymentMethod: 'cash',
    storeType: 'retail' as 'retail' | 'wholesale' | undefined,
    notes: ''
  });
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [walletModes, setWalletModes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    paymentModesService.getAll().then(list => setWalletModes(list.map((m: any) => ({ id: m.id, name: m.name }))))
      .catch(() => setWalletModes([{ id: 'cash', name: 'Cash' }, { id: 'card', name: 'Card' }, { id: 'online', name: 'Online Wallet' }]));
  }, []);

  useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category,
        date: format(new Date(expense.date), 'yyyy-MM-dd'),
        paymentMethod: expense.paymentMethod,
        storeType: expense.storeType,
        notes: expense.notes || ''
      });
      setSelectedSupplierId('');
    } else {
      setFormData({
        description: '',
        amount: '',
        category: EXPENSE_CATEGORIES[0],
        date: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: 'cash',
        storeType: appSettings.wholesaleEnabled ? undefined : (appSettings.retailEnabled ? 'retail' : undefined),
        notes: ''
      });
      setSelectedSupplierId('');
    }
  }, [expense, isOpen]);

  const { isProcessing: isSubmitting, guardedAction: handleSubmit } = useActionGuard(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        sonner.error('Amount must be greater than zero.');
        return;
      }

      await onSave(buildExpensePayload(formData, isManualOverride, appCurrentUser, selectedSupplierId) as any);
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  });

  const footer = (
    <div className="flex items-center justify-end gap-2 sm:gap-3 w-full">
      <Button
        variant="ghost"
        size="md"
        onClick={onClose}
        className="border border-rose-200 dark:border-rose-900/30 text-[#ff4b6e] hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
      >
        Discard
      </Button>
      <Button
        size="md"
        type="submit"
        form="expense-form"
        loading={isSubmitting}
        icon={<Save className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />}
        className="flex-1 sm:flex-none sm:min-w-[240px]"
      >
        {expense ? "Save Changes" : "Register Expense"}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expense ? "Edit Expense" : "Register New Expense"}
      maxWidth="lg"
      footer={footer}
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Core Information */}
        <div className="space-y-4">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2.5">
            <span className="w-4 h-0.5 bg-emerald-500 rounded"></span>
            Transaction Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5">Description *</label>
              <input
                type="text"
                required
                className="w-full h-9 px-3 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                placeholder="What was this expense for?"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5">Amount *</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  className="w-full h-9 pl-3 pr-9 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono font-bold tabular-nums text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setFormData({ ...formData, amount: val });
                    }
                  }}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-300 font-mono font-bold text-[12px]">{appSettings.currency}</span>
              </div>
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5">Expense Date *</label>
              <input
                type="date"
                required
                className="w-full h-9 px-3 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="space-y-4">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2.5">
            <span className="w-4 h-0.5 bg-emerald-500 rounded"></span>
            Classification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5">Category *</label>
              <Select
                required
                className="!h-9 !text-[13px] !rounded !bg-white dark:!bg-surface !border-neutral-300 dark:!border-white/[0.12] text-neutral-900 dark:text-white"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="dark:bg-surface text-neutral-900 dark:text-white">
                    {cat}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5">Payment Method *</label>
              <Select
                required
                className="!h-9 !text-[13px] !rounded !bg-white dark:!bg-surface !border-neutral-300 dark:!border-white/[0.12] text-neutral-900 dark:text-white"
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
              >
                {walletModes.map(m => (
                  <option key={m.id} value={m.id} className="dark:bg-surface text-neutral-900 dark:text-white">{m.name}</option>
                ))}
              </Select>
            </div>
            {formData.category === 'Supplies' && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5">Supplier</label>
                <SearchableSelect
                  options={appSuppliers.map(s => ({ id: s.id, label: s.name }))}
                  value={selectedSupplierId}
                  onChange={setSelectedSupplierId}
                  placeholder="Link to supplier (optional)"
                  icon={Building2}
                />
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Links this expense to the supplier and raises their payable.</p>
              </div>
            )}
          </div>
        </div>

        {/* Intelligence */}
        <div className="space-y-4">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2.5">
            <span className="w-4 h-0.5 bg-emerald-500 rounded"></span>
            Operational Intelligence
          </h3>

          <div className="space-y-4">
            {(appSettings.wholesaleEnabled) && (
              <div>
                <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5">Channel Selection</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: undefined, label: "General", icon: ShoppingBag, enabled: true },
                    { id: 'retail', label: "Retail", icon: CreditCard, enabled: appSettings.retailEnabled },
                    { id: 'wholesale', label: "Wholesale", icon: ShoppingBag, enabled: appSettings.wholesaleEnabled }
                  ].filter(c => c.enabled !== false).map((c) => (
                    <button
                      key={c.id ?? 'general'}
                      type="button"
                      onClick={() => setFormData({ ...formData, storeType: c.id as any })}
                      className={cn(
                        "h-9 flex items-center justify-center gap-1.5 px-3 rounded text-[12.5px] font-medium border transition-colors",
                        formData.storeType === c.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'border-neutral-300 dark:border-white/[0.12] bg-white dark:bg-surface text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                      )}
                    >
                      <c.icon className="h-4 w-4" />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5">Administrative Notes</label>
              <textarea
                className="w-full px-3 py-2 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors min-h-[72px] resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Manual Override Toggle */}
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-md">
              <div>
                <p className="text-[12.5px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Manual Override</p>
                <p className="text-[11.5px] text-amber-700 dark:text-amber-400 font-medium">Admin amount correction — logged</p>
              </div>
              <ToggleSwitch
                checked={isManualOverride}
                onChange={setIsManualOverride}
                color="bg-amber-500"
                className="!shrink-0"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
