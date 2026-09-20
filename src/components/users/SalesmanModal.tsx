import { useUsersStore } from '../../stores';
import { useState, useEffect } from 'react';
import { Loader2, Save, User as UserIcon, Phone } from 'lucide-react';
import { Salesman } from '../../types';
import { salesmenService } from '../../lib/services';
import { sonner } from '../../lib/sonner';
import { Modal } from '../../shared/ui/Modal';
import { Button, ToggleSwitch } from '../../shared/ui';

interface SalesmanModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesman?: Salesman | null;
}

export function SalesmanModal({ isOpen, onClose, salesman }: SalesmanModalProps) {
  const appSalesmen = useUsersStore(s => s.salesmen);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    active: true,
  });

  useEffect(() => {
    if (salesman) {
      setFormData({
        name: salesman.name,
        phone: salesman.phone || '',
        active: salesman.active,
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        active: true,
      });
    }
  }, [salesman, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        sonner.error('Name is required');
        setLoading(false);
        return;
      }

      if (salesman) {
        const updatePayload = {
          name: formData.name,
          phone: formData.phone,
          active: formData.active,
        };

        const updatedSalesman = await salesmenService.update(salesman.id, updatePayload);
        
        useUsersStore.getState().setSalesmen(appSalesmen.map(s => s.id === salesman.id ? updatedSalesman : s));
        sonner.success('Salesman updated successfully');
      } else {
        const newSalesman = await salesmenService.create({
          name: formData.name,
          phone: formData.phone,
          active: formData.active,
        });

        useUsersStore.getState().addSalesman(newSalesman);
        sonner.success('Salesman added successfully');
      }

      onClose();
    } catch (error) {
      sonner.error(`Error saving salesman: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        className="h-8 px-3 text-[13px] font-medium rounded-md"
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={handleSubmit}
        disabled={loading}
        className="h-8 px-3 text-[13px] font-medium rounded-md"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
        <span>
          {salesman ? "Save Changes" : "Register Salesman"}
        </span>
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={salesman ? "Edit Salesman" : "Register New Salesman"}
      maxWidth="md"
      footer={footer}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
            {"Identity Details"}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">{"Full Legal Name *"}</label>
              <div className="relative">
                <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full h-8 pl-8 pr-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white text-[13px] rounded-md focus:outline-none focus:border-neutral-400 transition-colors font-medium"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">{"Phone Number (Optional)"}</label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full h-8 pl-8 pr-2.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white text-[13px] rounded-md focus:outline-none focus:border-neutral-400 transition-colors font-medium"
                  placeholder="0300 1234567"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Access Protocol */}
        <div className="p-3 bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded-md flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-neutral-900 dark:text-white">{"System Status"}</span>
            <span className="text-[11px] text-neutral-500">{"Active / Inactive"}</span>
          </div>
          <ToggleSwitch
            checked={formData.active}
            onChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            size="sm"
            color="bg-emerald-600"
          />
        </div>
      </div>
    </Modal>
  );
}
