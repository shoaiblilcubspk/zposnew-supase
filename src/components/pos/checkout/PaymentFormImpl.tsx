import { Check, AlertCircle, FileText, Wallet, PlusCircle, UserCircle, Info } from 'lucide-react';
import { formatCurrency } from '../../../lib/currencies';
import { SearchableSelect, RealIcon, CapsLockIndicator } from '../../../shared/ui';
import { cn } from '../../../lib/utils';
import { useCartStore, useSettingsStore } from '../../../stores';
import { SplitPaymentSection } from './SplitPaymentSection';

type AppSettings = ReturnType<typeof useSettingsStore.getState>['settings'];

interface ExtraCharge {
  name: string;
  amount: string;
}

interface PaymentFormProps {
  appSettings: AppSettings;
  paymentMethod: string;
  handleSelectMethod: (m: string) => void;
  amountPaid: string;
  setAmountPaid: (v: string) => void;
  splitMethodA: 'cash' | 'card' | 'online';
  setSplitMethodA: (v: 'cash' | 'card' | 'online') => void;
  splitMethodB: 'cash' | 'card' | 'online';
  setSplitMethodB: (v: 'cash' | 'card' | 'online') => void;
  splitAmountA: string;
  setSplitAmountA: (v: string) => void;
  splitAmountB: string;
  setSplitAmountB: (v: string) => void;
  finalTotal: number;
  change: number;
  totalQty: number;
  quickAmounts: number[];
  extraCharges: ExtraCharge[];
  setExtraCharges: (v: ExtraCharge[]) => void;
  saleType: 'retail' | 'wholesale';
  setSaleType: (v: any) => void;
  saleTypes: { id: string; label: string; icon: any; enabled: boolean }[];
  payMethods: { id: string; label: string; icon: any }[];
  salesmanId: string;
  setSalesmanId: (v: string) => void;
  appUsers: any[];
  appSalesmen: any[];
  saleNotes: string;
  setSaleNotes: (v: string) => void;
  appActiveSalesTab: string;
  // Customer selector in settlement modal (for inline credit enable)
  appCustomers?: any[];
  appSelectedCustomer?: any;
  handleSelectCustomer?: (id: string) => void;
  isCreditAllowed?: boolean;
}

export function PaymentForm({
  appSettings,
  paymentMethod,
  handleSelectMethod,
  amountPaid,
  setAmountPaid,
  splitMethodA,
  setSplitMethodA,
  splitMethodB,
  setSplitMethodB,
  splitAmountA,
  setSplitAmountA,
  splitAmountB,
  setSplitAmountB,
  finalTotal,
  change,
  totalQty,
  quickAmounts,
  extraCharges,
  setExtraCharges,
  saleType,
  setSaleType,
  saleTypes,
  payMethods,
  salesmanId,
  setSalesmanId,
  appUsers,
  appSalesmen,
  saleNotes,
  setSaleNotes,
  appActiveSalesTab,
  appCustomers = [],
  appSelectedCustomer,
  handleSelectCustomer,
  isCreditAllowed,
}: PaymentFormProps) {
  return (
    <div className="p-4 space-y-3.5 order-1 md:order-2 bg-app">
      {/* Net Payable card — mobile only */}
      <div className="p-3.5 rounded-xl bg-primary text-white border border-primary relative md:hidden mb-1 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider">{"Net Payable"}</p>
            <h3 className="text-2xl font-sans font-bold text-white tabular-nums mt-0.5">{formatCurrency(finalTotal, appSettings.currency)}</h3>
          </div>
          <div className="px-2 py-0.5 rounded-lg bg-white/20 text-[12px] font-sans font-bold text-white tabular-nums">
            {totalQty} QTY
          </div>
        </div>
      </div>

      {/* Sale Type Selector (Mobile) */}
      {saleTypes.length > 0 && (
        <div className="md:hidden grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(saleTypes.length, 3)}, minmax(0, 1fr))` }}>
          {saleTypes.map(st => {
            const Icon = st.icon;
            return (
              <button key={st.id} onClick={() => setSaleType(st.id as any)}
                className={`flex items-center justify-center gap-1.5 h-8 rounded-md border text-[12px] font-medium transition-colors ${saleType === st.id ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-surface text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-white/[0.08]'}`}>
                <Icon className="w-3.5 h-3.5" />
                {st.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Payment Method */}
      <div>
        <p className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
          {"Payment Method"}
        </p>
        <div className="grid gap-2 sm:gap-2.5 gap-y-5 sm:gap-y-5 pt-4 sm:pt-4.5 grid-cols-2 sm:grid-cols-4">
          {payMethods.map(m => {
            const isActive = paymentMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMethod(m.id)}
                className={`group relative flex flex-col items-center justify-end h-[70px] sm:h-[74px] rounded-xl border transition-all px-2 pb-2.5 pt-1 overflow-visible cursor-pointer select-none active:scale-95 ${
                  isActive
                    ? 'bg-primary border-primary text-white font-bold shadow-sm'
                    : 'bg-white dark:bg-surface border-neutral-200 dark:border-white/[0.08] text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-surface-hover'
                }`}
              >
                <div className="absolute -top-3 sm:-top-3.5 left-1/2 -translate-x-1/2 flex items-center justify-center shrink-0 pointer-events-none transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-105 group-active:scale-95">
                  {(m as any).realIcon ? (
                    <>
                      <span className="sm:hidden"><RealIcon name={(m as any).realIcon} size={42} className="filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]" /></span>
                      <span className="hidden sm:inline-block"><RealIcon name={(m as any).realIcon} size={50} className="filter drop-shadow-[0_8px_14px_rgba(0,0,0,0.22)] dark:drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]" /></span>
                    </>
                  ) : (
                    <m.icon className={`w-7 h-7 sm:w-8 sm:h-8 ${isActive ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`} />
                  )}
                </div>
                <span className="text-[12px] sm:text-[12.5px] font-bold tracking-tight leading-tight select-none">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount Input */}
      <div className="min-h-[160px]">
        {paymentMethod === 'split' ? (
          <SplitPaymentSection
            splitMethodA={splitMethodA}
            setSplitMethodA={setSplitMethodA}
            splitMethodB={splitMethodB}
            setSplitMethodB={setSplitMethodB}
            splitAmountA={splitAmountA}
            setSplitAmountA={setSplitAmountA}
            splitAmountB={splitAmountB}
            setSplitAmountB={setSplitAmountB}
            finalTotal={finalTotal}
            currency={appSettings.currency}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{"Received Amount"}</label>
              <button onClick={() => setAmountPaid(finalTotal.toString())} className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded hover:bg-primary/20 transition-colors">{"Exact Amount"}</button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-mono text-neutral-400">{appSettings.currency || 'PKR'}</span>
              <input
                type="text" inputMode="decimal"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full h-10 pl-12 pr-4 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md text-[16px] font-mono font-semibold text-neutral-900 dark:text-white focus:border-primary outline-none transition-colors text-center disabled:opacity-50 disabled:bg-neutral-100 dark:disabled:bg-white/5"
                placeholder="0"
                disabled={paymentMethod !== 'cash'}
              />
            </div>
            <div className="grid grid-cols-4 gap-1.5 min-h-[28px]">
              {paymentMethod === 'cash' && quickAmounts.map((amt, idx) => (
                <button key={`${amt}-${idx}`} onClick={() => setAmountPaid(amt.toString())}
                  className="h-7 bg-white dark:bg-surface text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 text-[12px] font-mono font-medium border border-neutral-200 dark:border-white/[0.08] rounded transition-colors tabular-nums">
                  {appSettings.currency || 'Rs'} {Math.round(amt)}
                </button>
              ))}
            </div>
            {paymentMethod === 'credit' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-md flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-[12px] text-blue-800 dark:text-blue-200 leading-snug">
                  <span className="font-semibold block mb-0.5">Partial Udhar / Half Pay?</span>
                  Pehle yeh bill poora <b>Credit</b> pe save karein. Phir <b>Customers</b> page par ja kar <b>Receive Payment</b> enter karein.
                </p>
              </div>
            )}
            {/* Change / Due Display */}
            <div className={`p-3 rounded-md flex items-center justify-between border ${change >= 0 ? 'bg-primary/5 border-primary/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider mb-0.5">
                  {change >= 0 ? "Change" : "Balance Due"}
                </p>
                <p className="text-lg font-mono font-semibold tabular-nums">
                  {formatCurrency(Math.abs(change), appSettings.currency)}
                </p>
              </div>
              <div className={`w-7 h-7 rounded flex items-center justify-center ${change >= 0 ? 'bg-primary text-white' : 'bg-amber-500/20 text-amber-500'}`}>
                {change >= 0 ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extra Charges */}
      {appSettings.enableExtraCharges && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <PlusCircle className="w-3.5 h-3.5" /> {"Extra Charges"}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {extraCharges.map((charge, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md">
                <span className="flex-1 text-[12px] text-neutral-600 dark:text-neutral-400">Delivery Charges (DC)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={charge.amount}
                  onChange={(e) => {
                    const newCharges = [...extraCharges];
                    newCharges[idx].amount = e.target.value.replace(/[^0-9.]/g, '');
                    setExtraCharges(newCharges);
                  }}
                  placeholder="0"
                  className="w-24 h-7 bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded px-2 text-[12px] font-mono text-right text-neutral-900 dark:text-white outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Selector — enables Credit when selected */}
      {appSettings?.enableCreditSales && handleSelectCustomer && (
        <div className="mb-2">
          <SearchableSelect
            label={appSelectedCustomer?.id ? `CUSTOMER — ${appSelectedCustomer.name}` : 'CUSTOMER (Required for Credit)'}
            options={[{ id: '', label: 'None (No Credit)' }, ...(appCustomers || []).map((c: any) => ({ id: c.id, label: `${c.name}${c.phone ? ` · ${c.phone}` : ''}` }))]}
            value={appSelectedCustomer?.id || ''}
            onChange={handleSelectCustomer}
            icon={UserCircle}
          />
          {!appSelectedCustomer?.id && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 ml-0.5">
              Customer select karo to Credit button appear hoga
            </p>
          )}
        </div>
      )}

      {/* Salesman Selection */}
      <div className="mb-2">
        <SearchableSelect
          label={"SALESMAN (OPTIONAL)"}
          options={[{ id: '', label: 'None' }, ...appUsers.filter(u => u.active).map(u => ({ id: u.id, label: u.name })), ...appSalesmen.filter(s => s.active).map(s => ({ id: s.id, label: s.name }))]}
          value={salesmanId}
          onChange={setSalesmanId}
          icon={UserCircle}
        />
      </div>

      {/* Notes */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Internal Memo</span>
          </div>
          <CapsLockIndicator variant="inline" />
        </div>
        <textarea
          value={saleNotes}
          onChange={e => { const val = e.target.value; setSaleNotes(val); useCartStore.getState().setNotes(val); useCartStore.getState().updateSalesTab({ id: appActiveSalesTab, updates: { notes: val } }); }}
          placeholder="Add notes or memo..."
          className="w-full px-3 py-2 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md text-[13px] text-neutral-900 dark:text-white focus:border-primary outline-none resize-none min-h-[50px] placeholder:text-neutral-400 transition-colors"
        />
      </div>
    </div>
  );
}
