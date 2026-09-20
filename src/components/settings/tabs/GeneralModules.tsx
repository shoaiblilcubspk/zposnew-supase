import {
  Sliders,
  Store,
  ShoppingBag,
  Keyboard,
  Volume2,
  VolumeX,
  PlusCircle,
  AlertCircle,
  Layout,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Code2,
} from 'lucide-react';
import { Button, ToggleSwitch, Select } from '../../../shared/ui';
import { useSettingsStore } from '../../../stores';
import type { SettingsTabProps } from './types';

export function GeneralModules({
  formData,
  setFormData,
  handleChange,
  handleInstantUpdate,
  t,
  play,
}: SettingsTabProps) {
  return (
    <div className="lg:col-span-4 space-y-4">
      {/* User Experience Theme */}
      <div className="p-4 sm:p-5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-200 dark:border-white/[0.08]">
          <Layout className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          <div>
            <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">Experience</h3>
            <p className="text-[11px] text-neutral-500 font-mono tracking-tight">Personalize your workspace</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">App Theme</label>
            <div className="grid grid-cols-3 gap-1 bg-neutral-100 dark:bg-white/[0.06] p-1 rounded border border-neutral-200 dark:border-white/[0.08]">
              {(['light', 'dark', 'auto'] as const).map((tVal) => (
                <button
                  key={tVal}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, theme: tVal }));
                    handleInstantUpdate('theme', tVal);
                  }}
                  className={`h-7 rounded text-[12px] font-medium transition-colors ${
                    formData.theme === tVal
                      ? 'bg-white dark:bg-white/[0.1] text-neutral-900 dark:text-white shadow-none border border-neutral-200 dark:border-white/[0.1]'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {tVal === 'light' ? "Light" : (tVal === 'dark' ? "Dark" : "Auto")}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Icons Style</label>
              <span className="text-[10px] font-mono text-neutral-400">
                {(formData.iconStyle || '3d') === '3d' ? '3D Tactile' : 'Vector Code'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-neutral-100 dark:bg-white/[0.06] p-1 rounded border border-neutral-200 dark:border-white/[0.08]">
              {(['3d', 'system'] as const).map((sVal) => {
                const isSelected = (formData.iconStyle || '3d') === sVal;
                return (
                  <button
                    key={sVal}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, iconStyle: sVal }));
                      useSettingsStore.getState().setSettings({ iconStyle: sVal });
                      handleInstantUpdate('iconStyle', sVal);
                      try { localStorage.setItem('pos_icon_style', sVal); } catch {}
                    }}
                    className={`h-7 rounded text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-white dark:bg-white/[0.1] text-neutral-900 dark:text-white shadow-none border border-neutral-200 dark:border-white/[0.1]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {sVal === '3d' ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>3D Custom</span>
                      </>
                    ) : (
                      <>
                        <Code2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>System Icons</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Interface Mode</label>
            <Select
              name="interfaceMode"
              value={formData.interfaceMode || 'touch'}
              onChange={(e) => {
                handleChange(e);
                handleInstantUpdate('interfaceMode', e.target.value);
              }}
            >
              <option value="touch">Touch Friendly (POS Optimized)</option>
              <option value="traditional">Traditional (Keyboard Focused)</option>
            </Select>
          </div>
        </div>
      </div>

      {/* System Modules Toggles */}
      <div className="p-4 sm:p-5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-200 dark:border-white/[0.08]">
          <Sliders className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          <div>
            <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">System Modules</h3>
            <p className="text-[11px] text-neutral-500 font-mono tracking-tight">Enable or disable advanced features</p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Retail Mode Toggle */}
          <label className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <Store className="w-4 h-4 text-neutral-500" />
              <div>
                <span className="text-[13px] font-medium text-neutral-900 dark:text-white block leading-tight">Retail Sales</span>
                <span className="text-[11px] text-neutral-500 font-mono block">B2C direct sales</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              color="bg-violet-500"
              checked={formData.retailEnabled}
              onChange={(v) => handleInstantUpdate('retailEnabled', v)}
            />
          </label>

          {/* Wholesale Mode Toggle */}
          <label className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-neutral-500" />
              <div>
                <span className="text-[13px] font-medium text-neutral-900 dark:text-white block leading-tight">Wholesale Mode</span>
                <span className="text-[11px] text-neutral-500 font-mono block">Allow wholesale price tiers</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              checked={formData.wholesaleEnabled}
              onChange={(v) => handleInstantUpdate('wholesaleEnabled', v)}
            />
          </label>

          {/* Touch Keyboard Toggle */}
          <label className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <Keyboard className="w-4 h-4 text-neutral-500" />
              <div>
                <span className="text-[13px] font-medium text-neutral-900 dark:text-white block leading-tight">Touch Keyboard</span>
                <span className="text-[11px] text-neutral-500 font-mono block">On-screen layout inputs</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              checked={formData.touchKeyboardEnabled}
              onChange={(v) => {
                setFormData(p => ({ ...p, touchKeyboardEnabled: v }));
                handleInstantUpdate('touchKeyboardEnabled', v);
              }}
            />
          </label>

          {/* Sound Feedback Toggle */}
          <label className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
            <div className="flex items-center gap-2.5">
              {formData.soundEnabled
                ? <Volume2 className="w-4 h-4 text-primary" />
                : <VolumeX className="w-4 h-4 text-neutral-400" />
              }
              <div>
                <span className="text-[13px] font-medium text-neutral-900 dark:text-white block leading-tight">Sound Feedback</span>
                <span className="text-[11px] text-neutral-500 font-mono block">Keyboard UI feedback sounds</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              checked={formData.soundEnabled}
              onChange={(v) => {
                setFormData(p => ({ ...p, soundEnabled: v }));
                handleInstantUpdate('soundEnabled', v);
                if (v) setTimeout(() => play('success'), 100);
              }}
            />
          </label>

          {/* Delivery Charges Toggle */}
          <label className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <PlusCircle className="w-4 h-4 text-neutral-500" />
              <div>
                <span className="text-[13px] font-medium text-neutral-900 dark:text-white block leading-tight">Enable DC Charges</span>
                <span className="text-[11px] text-neutral-500 font-mono block">Extra packaging & delivery fees</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              checked={formData.enableExtraCharges}
              onChange={(v) => handleInstantUpdate('enableExtraCharges', v)}
            />
          </label>

          {/* Allow Negative Stock Toggle — §4.2 MASTER */}
          <label className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-neutral-500" />
              <div>
                <span className="text-[13px] font-medium text-neutral-900 dark:text-white block leading-tight">Allow Negative Stock</span>
                <span className="text-[11px] text-neutral-500 font-mono block">Let sales proceed when stock is zero</span>
              </div>
            </div>
            <ToggleSwitch
              size="sm"
              checked={formData.allowNegativeStock ?? false}
              onChange={(v) => handleInstantUpdate('allowNegativeStock', v)}
            />
          </label>

          {/* RBAC: Refund Approval Threshold */}
          <div className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-neutral-500" />
              <div className="min-w-0">
                <span className="text-[13px] font-medium text-neutral-900 dark:text-white block leading-tight">Refund Approval Threshold</span>
                <span className="text-[11px] text-neutral-500 font-mono block">Refunds above this need admin approval (0 = off)</span>
              </div>
            </div>
            <input
              type="number"
              min={0}
              value={formData.refundApprovalThreshold ?? 5000}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                setFormData((p: any) => ({ ...p, refundApprovalThreshold: val }));
                handleInstantUpdate('refundApprovalThreshold', val);
              }}
              className="w-24 h-7 shrink-0 px-2 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-app text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white text-right focus:outline-none focus:border-primary"
            />
          </div>

          {/* Credit Sales System */}
          <label className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-neutral-500" />
              <div>
                <span className="text-[13px] font-medium text-neutral-900 dark:text-white block leading-tight">Enable Credit Sales</span>
                <span className="text-[11px] text-neutral-500 font-mono block">Allow udhar / credit sales globally</span>
              </div>
            </div>
            <ToggleSwitch size="sm" checked={formData.enableCreditSales ?? true} onChange={(v) => handleInstantUpdate('enableCreditSales', v)} />
          </label>

          {(formData.enableCreditSales ?? true) && (
            <label className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-neutral-500" />
                <div>
                  <span className="text-[13px] font-medium text-neutral-900 dark:text-white block leading-tight">Cashier Can Give Credit</span>
                  <span className="text-[11px] text-neutral-500 font-mono block">If off, only Admin/Manager can create credit sales</span>
                </div>
              </div>
              <ToggleSwitch size="sm" checked={formData.cashierCanCredit ?? true} onChange={(v) => handleInstantUpdate('cashierCanCredit', v)} />
            </label>
          )}

        </div>
      </div>
    </div>
  );
}
