import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Supplier } from '../../../types';
import { Modal } from '../../../shared/ui/Modal';
import { Select } from '../../../shared/ui';
import { useActionGuard } from '../../../hooks/useActionGuard';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Partial<Supplier>) => Promise<void>;
  supplier?: Supplier | null;
}

export function SupplierModal({ isOpen, onClose, onSave, supplier }: SupplierModalProps) {
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    phone: '',
    email: '',
    businessType: '',
    paymentTerms: '',
    address: '',
    openingBalance: 0,
    rating: 5,
    contactPerson: '',
    ntn: ''
  });

  useEffect(() => {
    if (supplier) {
      setFormData(supplier);
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        businessType: '',
        paymentTerms: '',
        address: '',
        openingBalance: 0,
        rating: 5,
        contactPerson: '',
        ntn: ''
      });
    }
  }, [supplier, isOpen]);

  const { isProcessing: isSubmitting, guardedAction: handleSubmit } = useActionGuard(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save supplier:', error);
    }
  });

  if (!isOpen) return null;

  const footer = (
    <div className="flex items-center justify-end gap-2 w-full font-mono text-[12px]">
      <button
        type="button"
        onClick={onClose}
        className="h-8 px-3 rounded border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.08] font-medium transition-colors"
      >
        {"Discard"}
      </button>
      <button
        type="submit"
        form="supplier-form"
        disabled={isSubmitting}
        className="h-8 px-4 rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50 font-medium flex items-center gap-1.5 transition-colors shadow-none"
      >
        <Save className="h-3.5 w-3.5" />
        <span>{supplier ? "Update Supplier" : "Register Supplier"}</span>
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? "EDIT SUPPLIER ACCOUNT" : "REGISTER NEW PARTNER"}
      maxWidth="lg"
      footer={footer}
    >
      <form id="supplier-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Business Profile */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            {"Business Profile"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Legal Entity *"}</label>
              <input
                type="text"
                required
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder="e.g. Acme Corp"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Lead Contact"}</label>
              <input
                type="text"
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder="Point of contact"
                value={formData.contactPerson}
                onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Business Mobile *"}</label>
              <input
                type="text"
                required
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder="+92 3xx xxxxxxx"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Operational Data */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            {"Operational Data"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Operational Email"}</label>
              <input
                type="email"
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder="orders@partner.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
             <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Tax Identity (NTN)"}</label>
              <input
                type="text"
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder="Tax registration number"
                value={formData.ntn}
                onChange={e => setFormData({ ...formData, ntn: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Classification & Terms */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            {"Classification & Terms"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Business Type"}</label>
              <Select
                value={formData.businessType || ''}
                onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                className="!h-8 !text-[13px] !rounded !bg-white dark:!bg-surface !border-neutral-300 dark:!border-white/[0.12] text-neutral-900 dark:text-white"
              >
                <option value="">{"Select type"}</option>
                <option value="Manufacturer">{"Manufacturer"}</option>
                <option value="Distributor">{"Distributor"}</option>
                <option value="Wholesaler">{"Wholesaler"}</option>
                <option value="Retailer">{"Retailer"}</option>
                <option value="Agent">{"Agent"}</option>
                <option value="Other">{"Other"}</option>
              </Select>
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Payment Terms"}</label>
              <input
                type="text"
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder="e.g. Net 30, COD"
                value={formData.paymentTerms || ''}
                onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Rating"}</label>
              <Select
                value={String(formData.rating ?? 5)}
                onChange={e => setFormData({ ...formData, rating: Number(e.target.value) })}
                className="!h-8 !text-[13px] !rounded !bg-white dark:!bg-surface !border-neutral-300 dark:!border-white/[0.12] text-neutral-900 dark:text-white"
              >
                <option value="5">{"5 — Excellent"}</option>
                <option value="4">{"4 — Good"}</option>
                <option value="3">{"3 — Average"}</option>
                <option value="2">{"2 — Poor"}</option>
                <option value="1">{"1 — Bad"}</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Logistics & Financials */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            {"Logistics & Initial State"}
          </h3>
          
          <div className="space-y-3.5">
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Distribution Hub Address"}</label>
              <textarea
                className="w-full px-2.5 py-2 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors min-h-[72px] resize-none placeholder:text-neutral-400"
                placeholder="Complete location for logistics..."
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            {!supplier && (
              <div>
                <label className="text-[12.5px] font-semibold text-rose-600 dark:text-rose-400 block mb-1">{"Initial Debt Balance"}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                    className="w-full h-8 pl-2.5 pr-28 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono tabular-nums text-rose-600 dark:text-rose-400 focus:border-rose-500 focus:outline-none transition-colors"
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-rose-600 dark:text-rose-400 font-mono text-[11px] font-semibold uppercase">{"Opening Debt"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
