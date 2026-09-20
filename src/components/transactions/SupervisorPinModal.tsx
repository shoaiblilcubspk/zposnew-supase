import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { Button, CapsLockIndicator } from '../../shared/ui';

const inputCls = "w-full h-8 px-2.5 rounded-md border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface text-[13px] font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 disabled:opacity-50 transition-colors";

interface SupervisorPinModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  isProcessing: boolean;
  onSubmit: (email: string, password: string) => Promise<boolean>;
  onClose: () => void;
}

/**
 * RBAC SUPERVISOR OVERRIDE — admin email+password proof for restricted ops
 * (sale delete / refund above threshold). Verifies server-side via signed
 * action token; wrong credentials simply fail the RPC verification.
 */
export function SupervisorPinModal({ isOpen, title, description, isProcessing, onSubmit, onClose }: SupervisorPinModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Admin email aur password dono zaroori hain.');
      return;
    }
    setError('');
    const ok = await onSubmit(email.trim(), password);
    if (ok) {
      setPassword('');
      setEmail('');
    } else {
      setError('Authorization failed. Sirf active admin account chalega.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} showClose={!isProcessing} maxWidth="sm">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2.5 bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 p-3 rounded-md">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-neutral-500" />
          <p className="text-[12px] leading-relaxed">{description}</p>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">Admin Email</label>
          <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@gmail.com" autoComplete="username" disabled={isProcessing} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">Admin Password</label>
            <CapsLockIndicator variant="inline" />
          </div>
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" disabled={isProcessing}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} />
        </div>
        {error && (
          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isProcessing} className="flex-1 h-8 text-[13px] font-medium rounded-md">Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isProcessing} className="flex-1 h-8 text-[13px] font-medium rounded-md">
            {isProcessing ? 'Verifying…' : 'Approve & Continue'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
