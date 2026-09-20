import { useInventoryStore, useCustomersStore } from '../../stores';
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Customer } from '../../types';
import { sonner } from '../../lib/sonner';
import { Modal } from '../../shared/ui/Modal';
import { cn } from '../../lib/utils';
import { Button, Select } from '../../shared/ui';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export function CustomerModal({ isOpen, onClose, customer }: CustomerModalProps) {
  const appCategories = useInventoryStore(s => s.categories);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    priceTier: 'retail' as 'retail' | 'wholesale' | 'premium',
    notes: '',
    preferredCategories: [] as string[],
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        priceTier: customer.priceTier,
        notes: customer.notes || '',
        preferredCategories: customer.preferredCategories || [],
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        priceTier: 'retail',
        notes: '',
        preferredCategories: [],
      });
    }
  }, [customer]);

  const togglePreferredCategory = (categoryName: string) => {
    setFormData(prev => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(categoryName)
        ? prev.preferredCategories.filter(c => c !== categoryName)
        : [...prev.preferredCategories, categoryName],
    }));
  };

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      sonner.error("Critical Data Missing", {
        description: "Identity name and contact phone are mandatory for CRM registration."
      });
      return;
    }

    const customerData: Partial<Customer> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      priceTier: formData.priceTier,
      notes: formData.notes,
      preferredCategories: formData.preferredCategories,
    };


    setIsSubmitting(true);
    try {
      const { customersService } = await import('../../lib/services');
      if (customer) {
        const updated = await customersService.update(customer.id, customerData);
        await useCustomersStore.getState().updateCustomer(updated);
        sonner.success("Customer Updated");
      } else {
        const created = await customersService.create(customerData as Omit<Customer, 'id'>);
        await useCustomersStore.getState().addCustomer(created);
        sonner.success("Customer Added");
      }
      onClose();
    } catch (_error) {
      sonner.error("Sync Failure");
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2 sm:gap-3 w-full">
      <Button
        variant="ghost"
        size="md"
        onClick={onClose}
        className="border border-rose-200 dark:border-rose-900/30 text-[#ff4b6e] hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
      >
        {"DISCARD"}
      </Button>
      <Button
        size="md"
        loading={isSubmitting}
        icon={<Save className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />}
        onClick={handleSubmit}
        className="flex-1 sm:flex-none sm:min-w-[240px]"
      >
        {customer ? "UPDATE CUSTOMER" : "ADD CUSTOMER"}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? "EDIT CUSTOMER" : "ADD NEW CUSTOMER"}
      maxWidth="lg"
      footer={footer}
    >
      <div className="space-y-8">
        {/* Identity Hub */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            {"Basic Information"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Client Name *"}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder={"John Doe"}
              />
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Mobile Number *"}</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] font-mono tabular-nums text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder={"+92 3xx xxxxxxx"}
              />
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Email Address"}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full h-8 px-2.5 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                placeholder={"client@account.com"}
              />
            </div>
          </div>
        </div>

        {/* Commercials */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            {"Billing Details"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Pricing Tier *"}</label>
              <Select
                name="priceTier"
                value={formData.priceTier}
                onChange={handleChange}
                className="!h-8 !text-[13px] !rounded !bg-white dark:!bg-surface !border-neutral-300 dark:!border-white/[0.12] text-neutral-900 dark:text-white"
              >
                <option value="retail" className="dark:bg-surface">{"Standard Retail"}</option>
                <option value="wholesale" className="dark:bg-surface">{"Wholesale Logic"}</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            {"Category Preferences"}
          </h3>

          <div>
            <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5">{"Preferred Categories"}</label>
            <div className="flex flex-wrap gap-1.5">
              {appCategories.length === 0 ? (
                <p className="text-[12px] text-neutral-500 dark:text-neutral-400">{"No categories available"}</p>
              ) : (
                appCategories.map(category => {
                  const isSelected = formData.preferredCategories.includes(category.name);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => togglePreferredCategory(category.name)}
                      className={cn(
                        "px-3 py-1 rounded text-[12px] font-medium transition-colors border",
                        isSelected
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-semibold shadow-sm"
                          : "bg-white dark:bg-surface text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-white/[0.12] hover:border-neutral-400"
                      )}
                    >
                      {category.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Location & Insights */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-emerald-500 rounded-full"></span>
            {"Address & Notes"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Physical Address"}</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-2.5 py-2 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors min-h-[72px] resize-none placeholder:text-neutral-400"
                placeholder={"Complete location details..."}
              />
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 block mb-1">{"Administrative Notes"}</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-2.5 py-2 bg-white dark:bg-surface border border-neutral-300 dark:border-white/[0.12] rounded text-[13px] text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors min-h-[72px] resize-none placeholder:text-neutral-400"
                placeholder={"Additional notes about the customer..."}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}