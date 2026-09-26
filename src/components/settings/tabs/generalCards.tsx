import React from 'react';
import { Store, Globe, Printer, LayoutGrid } from 'lucide-react';
import { SearchableSelect } from '../../../shared/ui/SearchableSelect';
import { LogoUpload } from '../LogoUpload';
import { CURRENCIES } from '../../../lib/currencies';

type ChangeHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
type SetForm = React.Dispatch<React.SetStateAction<any>>;
type InstantUpdater = (name: string, value: any) => Promise<void>;

interface StoreIdentityProps {
  formData: any;
  setFormData: SetForm;
  handleChange: ChangeHandler;
  handleInstantUpdate: InstantUpdater;
}

interface LocalizationProps {
  formData: any;
  setFormData: SetForm;
  setFormDataDirect: SetForm;
  handleChange: ChangeHandler;
  handleInstantUpdate: InstantUpdater;
}

export function GeneralStoreIdentity({ formData, setFormData, handleChange }: StoreIdentityProps) {
  return (
    <div className="p-4 sm:p-5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <Store className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          <div>
            <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">Store Identity</h3>
            <p className="text-[11px] text-neutral-500 font-mono tracking-tight">How your business appears to customers</p>
          </div>
        </div>
        <div className="w-full md:w-auto">
          <LogoUpload
            currentLogo={formData.storeLogo}
            onLogoChange={(url: string | undefined) => {
              // Only update local form state — isDirty is set inside setFormData wrapper.
              // Logo is saved + cloud synced ONLY when user clicks "Update System".
              setFormData((prev: any) => ({ ...prev, storeLogo: url ?? '' }));
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Business Name</label>
          <input
            type="text"
            name="storeName"
            value={formData.storeName}
            onChange={handleChange}
            className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
            placeholder="My Store"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Contact Phone</label>
          <input
            type="tel"
            name="storePhone"
            value={formData.storePhone}
            onChange={handleChange}
            className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
            placeholder="+92 3XX XXXXXXX"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Store Email</label>
          <input
            type="email"
            name="storeEmail"
            value={formData.storeEmail}
            onChange={handleChange}
            className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
            placeholder="contact@mystore.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Store Website</label>
          <input
            type="text"
            name="storeWebsite"
            value={formData.storeWebsite}
            onChange={handleChange}
            className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
            placeholder="www.mystore.com"
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Physical Address</label>
          <textarea
            name="storeAddress"
            value={formData.storeAddress}
            onChange={handleChange}
            rows={2}
            className="w-full p-2 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary resize-none"
            placeholder="123 Main Street"
          />
        </div>
      </div>
    </div>
  );
}

export function GeneralLocalization({ formData, setFormDataDirect, handleChange, handleInstantUpdate}: LocalizationProps) {
  return (
    <div className="p-4 sm:p-5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-200 dark:border-white/[0.08]">
        <Globe className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
        <div>
          <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">Localization & Defaults</h3>
          <p className="text-[11px] text-neutral-500 font-mono tracking-tight">Currencies, languages and system default types</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1 relative z-30">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Store Currency</label>
          <SearchableSelect
            options={CURRENCIES.map(c => ({ id: c.code, label: `${c.code} - ${c.name} (${c.symbol})` }))}
            value={formData.currency}
            onChange={(val) => {
              setFormDataDirect((prev: any) => ({ ...prev, currency: val }));
              handleInstantUpdate('currency', val);
            }}
            placeholder="Select currency..."
            icon={Globe}
          />
        </div>
        <div className="space-y-1 relative z-30">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Store Country</label>
          <SearchableSelect
            options={[
              { id: 'PK', label: 'Pakistan (🇵🇰)' },
              { id: 'AE', label: 'United Arab Emirates (🇦🇪)' },
              { id: 'SA', label: 'Saudi Arabia (🇸🇦)' },
              { id: 'QR', label: 'Qatar (🇶🇦)' },
              { id: 'KW', label: 'Kuwait (🇰🇼)' },
              { id: 'OM', label: 'Oman (🇴🇲)' },
              { id: 'BH', label: 'Bahrain (🇧🇭)' },
              { id: 'US', label: 'United States (🇺🇸)' },
              { id: 'GB', label: 'United Kingdom (🇬🇧)' },
              { id: 'CA', label: 'Canada (🇨🇦)' },
              { id: 'AU', label: 'Australia (🇦🇺)' },
              { id: 'LK', label: 'Sri Lanka (🇱🇰)' },
              { id: 'BD', label: 'Bangladesh (🇧🇩)' },
              { id: 'IN', label: 'India (🇮🇳)' },
              { id: 'AF', label: 'Afghanistan (🇦🇫)' },
              { id: 'TR', label: 'Turkey (🇹🇷)' },
              { id: 'MY', label: 'Malaysia (🇲🇾)' },
              { id: 'SG', label: 'Singapore (🇸🇬)' },
              { id: 'ID', label: 'Indonesia (🇮🇩)' },
              { id: 'PH', label: 'Philippines (🇵🇭)' },
              { id: 'VN', label: 'Vietnam (🇻🇳)' },
              { id: 'EG', label: 'Egypt (🇪🇬)' },
              { id: 'ZA', label: 'South Africa (🇿🇦)' },
              { id: 'NG', label: 'Nigeria (🇳🇬)' }
            ]}
            value={formData.country || 'PK'}
            onChange={(val) => {
              setFormDataDirect((prev: any) => ({ ...prev, country: val }));
              handleInstantUpdate('country', val);
            }}
            placeholder="Select country..."
            icon={Globe}
          />
        </div>
        <div className="space-y-1 relative z-20">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Default POS View</label>
          <SearchableSelect
            options={[
              { id: 'retail', label: 'Retail Mode' },
              { id: 'wholesale', label: 'Wholesale Mode' }
            ]}
            value={formData.defaultSaleType || 'retail'}
            onChange={(val) => {
              setFormDataDirect((prev: any) => ({ ...prev, defaultSaleType: val as any }));
              handleInstantUpdate('defaultSaleType', val);
            }}
            placeholder="Select mode..."
            icon={LayoutGrid}
          />
        </div>
        <div className="space-y-1 relative z-10">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Standard Paper Size</label>
          <SearchableSelect
            options={[
              { id: '80mm', label: '80mm (Standard Thermal)' },
              { id: '58mm', label: '58mm (Compact Thermal)' },
              { id: 'a4', label: 'A4 (Invoice Style)' }
            ]}
            value={formData.receiptPaperSize}
            onChange={(val) => {
              setFormDataDirect((prev: any) => ({ ...prev, receiptPaperSize: val as any }));
              handleInstantUpdate('receiptPaperSize', val);
            }}
            placeholder="Select size..."
            icon={Printer}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 relative">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Default Tax %</label>
            <input
              type="number"
              name="taxRate"
              value={formData.taxRate}
              onChange={handleChange}
              step="0.01"
              className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary font-mono tabular-nums"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Tax/Business ID</label>
            <input
              type="text"
              name="taxId"
              value={formData.taxId}
              onChange={handleChange}
              className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary font-mono"
              placeholder="NTN / VAT"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export { ReceiptInvoicingSection as GeneralInvoicing } from './ReceiptInvoicingSection';
