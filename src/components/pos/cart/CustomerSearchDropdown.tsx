import { Plus, X, UserPlus, Eye } from 'lucide-react';
import { Customer } from '../../../types';

interface CustomerSearchDropdownProps {
  showCustomerSearch: boolean;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  isAddingCustomer: boolean;
  setIsAddingCustomer: (v: boolean) => void;
  newCustomer: { name: string; phone: string; email: string };
  setNewCustomer: (v: { name: string; phone: string; email: string }) => void;
  filteredCustomers: Customer[];
  selectCustomer: (c: Customer) => void;
  setViewingCustomer: (c: Customer | null) => void;
  setShowCustomerSearch: (v: boolean) => void;
  handleQuickAddCustomer: () => void;
}

export function CustomerSearchDropdown({
  customerSearch,
  setCustomerSearch,
  isAddingCustomer,
  setIsAddingCustomer,
  newCustomer,
  setNewCustomer,
  filteredCustomers,
  selectCustomer,
  setViewingCustomer,
  setShowCustomerSearch,
  handleQuickAddCustomer,
}: CustomerSearchDropdownProps) {
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md shadow-lg z-50 max-h-[50vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
      {!isAddingCustomer ? (
        <div className="p-2.5 space-y-2">
          <div className="relative">
            <input
              type="text"
              autoFocus
              placeholder={"Search name, phone, email..."}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full h-8 bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-md px-3 text-[13px] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-primary outline-none"
            />
            <button
              onClick={() => setIsAddingCustomer(true)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-primary hover:bg-primary/10 rounded transition-colors flex items-center gap-1 text-[11px] font-medium"
            >
              <Plus className="h-3 w-3" /> {"NEW"}
            </button>
          </div>

          <div className="max-h-[220px] overflow-y-auto custom-scrollbar divide-y divide-neutral-100 dark:divide-white/[0.04] pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-[12px] text-neutral-400">No customer found</p>
                <button
                  onClick={() => setIsAddingCustomer(true)}
                  className="h-8 px-3 bg-primary hover:bg-primary-hover text-white rounded-md text-[12px] font-medium transition-colors"
                >
                  + Create New Customer
                </button>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-1 rounded-md hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors group"
                >
                  <button
                    onClick={() => selectCustomer(customer)}
                    className="flex-1 text-left p-2 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[12px] font-medium text-neutral-900 dark:text-white leading-none group-hover:text-primary transition-colors">
                        {customer.name}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-1">
                        {customer.phone || customer.email || 'No contact info'}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewingCustomer(customer); setShowCustomerSearch(false); }}
                    className="touch-reveal p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100 mr-1"
                    title="View customer profile"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Skip / No Customer */}
          <button
            onClick={() => { setShowCustomerSearch(false); setCustomerSearch(''); }}
            className="w-full h-8 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-200 dark:border-white/[0.08] text-[12px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Skip — No Customer
          </button>
        </div>
      ) : (
        <div className="p-3 space-y-2.5 bg-neutral-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-neutral-900 dark:text-white flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-primary" /> Quick Add Customer
            </span>
            <button onClick={() => setIsAddingCustomer(false)}>
              <X className="h-3.5 w-3.5 text-neutral-400 hover:text-neutral-600" />
            </button>
          </div>

          <div className="space-y-1.5">
            {['name', 'phone', 'email'].map((key) => (
              <input
                key={key}
                type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                placeholder={`Customer ${key.toUpperCase()}${key === 'name' || key === 'phone' ? ' *' : ''}`}
                value={newCustomer[key as keyof typeof newCustomer]}
                onChange={(e) => setNewCustomer({ ...newCustomer, [key]: e.target.value })}
                className="w-full h-8 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md px-3 text-[13px] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-primary outline-none"
              />
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={handleQuickAddCustomer} className="h-8 px-3 bg-primary hover:bg-primary-hover text-white text-[13px] font-medium rounded-md flex-1 transition-colors">
              Save & Link
            </button>
            <button
              onClick={() => setIsAddingCustomer(false)}
              className="h-8 px-3 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 text-[13px] font-medium rounded-md hover:bg-neutral-200 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
