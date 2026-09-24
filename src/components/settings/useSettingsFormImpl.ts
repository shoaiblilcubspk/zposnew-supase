import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '../../stores';
import { useAuth } from '../../context/AuthContext';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { sonner } from '../../lib/sonner';
import { AppSettings } from '../../types';
import { buildInitialFormData, syncFormDataFromSettings } from './settingsFormData';

// Fields that save immediately on change (safe live toggles / device-local prefs).
// These do NOT mark the form dirty — they don't require "Update System" intent.
const INSTANT_SAVE_FIELDS = [
  'theme', 'iconStyle', 'interfaceMode', 'posGridColumns', 'touchKeyboardEnabled',
  'country', 'currency', 'receiptPrinter', 'receiptPaperSize', 'receiptTemplate',
  'receiptShowLogo', 'receiptShowFooter', 'receiptShowTax', 'receiptShowDiscount',
  'receiptShowStoreName', 'receiptShowStoreAddress', 'receiptShowStorePhone',
  'receiptShowStoreEmail', 'receiptShowCustomerName', 'receiptShowCustomerPhone',
  'receiptShowNotes', 'receiptShowBarcode', 'receiptShowDeliveryAddress', 'receiptShowQrCode',
  'receiptFontBold', 'receiptFontWeight', 'receiptFontScale',
];

export function useSettingsForm() {
  const appSettings = useSettingsStore(s => s.settings);
  const { profile } = useAuth();
  const { play } = useSoundFeedback();

  const [isSaving, setIsSaving] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [formData, setFormDataState] = useState<any>(buildInitialFormData(appSettings));

  // isDirty = user has unsaved changes. While true, remote cloud sync must NOT overwrite the form.
  // Resets to false after save (Update System) or discard.
  const isDirty = useRef(false);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Sync form from Zustand store — ONLY when form is NOT being edited by the user.
  // This allows remote device saves to appear automatically on a clean form.
  useEffect(() => {
    if (!isDirty.current) {
      setFormDataState(syncFormDataFromSettings(appSettings));
    }
  }, [appSettings]);

  // Listen for remote settings events — same dirty guard.
  // Prevents logo/name/address from being clobbered while user is actively editing.
  useEffect(() => {
    const onSettingsUpdated = (e: any) => {
      if (!isDirty.current && e?.detail) {
        setFormDataState(syncFormDataFromSettings(e.detail));
      }
    };
    window.addEventListener('settings-updated', onSettingsUpdated as any);
    return () => window.removeEventListener('settings-updated', onSettingsUpdated as any);
  }, []);

  const canEditSettings = true;

  // Marks form dirty — used for fields that require "Update System" to save + cloud sync
  const setFormData = (updater: any) => {
    isDirty.current = true;
    setFormDataState(updater);
  };

  // Direct form state update WITHOUT marking dirty — for instant-save fields that call
  // handleInstantUpdate separately (receipt toggles, paper size, template, font scale, etc.)
  const setFormDataDirect = (updater: any) => {
    setFormDataState(updater);
  };

  // Instant-save for live UI preference fields (receipt toggles, theme, etc.)
  // Safe to save immediately — these are non-destructive and expected to apply live.
  // Does NOT set isDirty because they don't require "Update System" confirmation.
  const handleInstantUpdate = async (name: string, value: any) => {
    if (!canEditSettings) return;

    const saleTypeFields = ['retailEnabled', 'wholesaleEnabled'];
    if (saleTypeFields.includes(name) && value === false) {
      const otherActive = saleTypeFields.filter(f => f !== name && formData[f as keyof typeof formData]);
      if (otherActive.length === 0) {
        sonner.warning('At least one sale type must remain active.');
        return;
      }
    }

    setFormDataState((prev: any) => ({ ...prev, [name]: value }));
    setSyncStatus('saving');
    try {
      const { settingsService } = await import('../../lib/services');
      const updatedSettings = {
        ...appSettings,
        ...formData,
        [name]: value,
        taxRate: parseFloat(String(formData.taxRate || 0)),
        invoiceCounter: parseInt(String(formData.invoiceCounter || 1000)),
        receiptFontScale: parseFloat(String(name === 'receiptFontScale' ? value : (formData.receiptFontScale || 1.0))),
        receiptFontWeight: parseInt(String(name === 'receiptFontWeight' ? value : ((formData as any).receiptFontWeight || 600))),
      } as unknown as AppSettings;
      await settingsService.update(updatedSettings as any);
      useSettingsStore.getState().setSettings(updatedSettings as any);
      setSyncStatus('success');
    } catch (error) {
      console.error('Instant update error:', error);
      setSyncStatus('idle');
      sonner.toast('Failed to apply change', 'error');
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!canEditSettings) return;
    const { name, value, type } = e.target;

    if (INSTANT_SAVE_FIELDS.includes(name)) {
      const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
      handleInstantUpdate(name, val);
      return;
    }

    // Non-instant field — mark form dirty. User must click "Update System" to save + cloud sync.
    isDirty.current = true;
    setFormDataState((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // "Update System" button — ONLY place where store identity + all settings save + cloud sync
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditSettings) {
      sonner.error('You do not have permission to change settings.');
      return;
    }
    setIsSaving(true);
    setSyncStatus('saving');
    try {
      sonner.loading('Saving & sharing to all devices...');
      const { settingsService } = await import('../../lib/services');
      const updatedSettings = {
        ...appSettings,
        ...formData,
        taxRate: parseFloat(formData.taxRate),
        invoiceCounter: parseInt(formData.invoiceCounter),
        invoicePadDigits: parseInt(formData.invoicePadDigits || '4', 10),
        receiptFontScale: parseFloat(formData.receiptFontScale),
        receiptFontWeight: parseInt((formData as any).receiptFontWeight?.toString() || '600'),
      } as unknown as AppSettings;

      // Saves to local mirror and queues cloud sync to Supabase
      await settingsService.update(updatedSettings as any);
      useSettingsStore.getState().setSettings(updatedSettings as any);

      // Form is now in sync with saved state — allow remote sync events to update it again
      isDirty.current = false;

      setSyncStatus('success');
      sonner.success('Settings saved & synced to cloud!');
    } catch (error) {
      console.error('Error saving settings:', error);
      setSyncStatus('idle');
      sonner.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
      sonner.close();
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // Discard — reset form to last committed settings, clear dirty flag
  const handleDiscard = () => {
    isDirty.current = false;
    setFormDataState(syncFormDataFromSettings(appSettings));
  };

  const handleRepairCounter = async () => {
    if (!canEditSettings) return;
    try {
      sonner.loading('Scanning local sales for highest invoice number...');
      const { salesService } = await import('../../lib/services');
      const sales = await salesService.getAll();
      let maxCounterNum = parseInt(formData.invoiceCounter) || 0;
      if (sales && sales.length > 0) {
        sales.forEach(sale => {
          const val = sale.invoiceNumber;
          if (typeof val === 'string') {
            const matches = val.match(/\d+$/);
            if (matches) {
              const num = parseInt(matches[0]);
              if (!isNaN(num) && num > maxCounterNum) maxCounterNum = num;
            }
          }
        });
      }
      const nextCounter = maxCounterNum + 1;
      setFormDataState((prev: any) => ({ ...prev, invoiceCounter: nextCounter.toString() }));
      sonner.success(`Counter repaired! Next invoice: ${formData.invoicePrefix}-${nextCounter}`);
    } catch (err: any) {
      sonner.error(`Failed to repair counter: ${err.message}`);
    } finally {
      sonner.close();
    }
  };

  const handleResetCalibration = () => {
    setFormDataState((prev: any) => ({
      ...prev,
      receiptPaddingTop: 0, receiptPaddingBottom: 0,
      receiptPaddingLeft: 0, receiptPaddingRight: 0,
      receiptOffsetX: 0, receiptHeaderOffsetX: 0, receiptFooterOffsetX: 0,
    }));
    sonner.toast('Calibration reset to center. 🎯', 'info');
  };

  return {
    formData,
    setFormData,
    setFormDataDirect,
    handleChange,
    handleInstantUpdate,
    handleSubmit,
    handleDiscard,
    handleRepairCounter,
    handleResetCalibration,
    appSettings,
    profile,
    canEditSettings,
    isOnline,
    play,
    isSaving,
    showReceipt,
    setShowReceipt,
    completedSale,
    setCompletedSale,
    syncStatus,
    isDirty: isDirty.current,
  };
}
