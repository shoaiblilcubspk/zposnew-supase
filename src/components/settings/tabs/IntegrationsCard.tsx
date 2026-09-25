import React from 'react';
import { KeyRound, Eye, EyeOff, ExternalLink, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { sonner } from '../../../lib/sonner';
import { getPexelsKey, savePexelsKey, testPexelsKey, maskKey } from '../../../lib/services/integrationSettingsService';
import { useUsersStore } from '../../../stores';

/**
 * Integrations card — image search (Pexels) API key. Admin only. The key is saved as one atomic
 * bundle (synced to all devices) and only ever sent in the Authorization header. Displayed masked.
 */
export function IntegrationsCard() {
  const currentUser = useUsersStore((s) => s.currentUser);
  const isAdmin = (currentUser?.role || '') === 'admin';

  const [saved, setSaved] = React.useState<string | null>(null);
  const [input, setInput] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string>('');

  const refresh = React.useCallback(async () => { setSaved(await getPexelsKey()); }, []);
  React.useEffect(() => { void refresh(); }, [refresh]);

  if (!isAdmin) return null;

  const onSave = async () => {
    if (!input.trim()) { sonner.error('Enter an API key first.'); return; }
    setBusy(true);
    try {
      await savePexelsKey(input.trim(), currentUser?.name || 'admin');
      setInput(''); setStatus('');
      await refresh();
      sonner.success('Image search key saved & syncing to all devices.');
    } catch (e: any) {
      sonner.error(e.message || 'Failed to save key');
    } finally { setBusy(false); }
  };

  const onTest = async () => {
    const key = input.trim() || saved;
    if (!key) { sonner.error('No key to test.'); return; }
    setBusy(true);
    try {
      const res = await testPexelsKey(key);
      setStatus(res.ok ? `Valid${res.remaining ? ` · ${res.remaining} requests left this month` : ''}` : res.message);
      res.ok ? sonner.success('Key is valid.') : sonner.error(res.message);
    } finally { setBusy(false); }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      await savePexelsKey(null, currentUser?.name || 'admin');
      setInput(''); setStatus('');
      await refresh();
      sonner.success('Image search key removed (synced).');
    } finally { setBusy(false); }
  };

  return (
    <Card className="p-5 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface shadow-none rounded-md">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-neutral-900 dark:text-white text-[14px]">Image Search (Pexels)</h3>
      </div>
      <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mb-3 leading-relaxed">
        Add a free Pexels API key to search stock photos for products from the Media library.
        The key is stored securely, synced to all devices, and used only for image search.
        {' '}<a href="https://www.pexels.com/api/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
          Get a free key <ExternalLink className="w-3 h-3" />
        </a>
      </p>

      {saved && (
        <div className="mb-3 flex items-center gap-2 text-[12px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Key saved: <span className="font-mono">{maskKey(saved)}</span>
        </div>
      )}

      <div className="max-w-md space-y-3">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            placeholder={saved ? 'Enter a new key to replace…' : 'Paste your Pexels API key…'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-8 px-3 pr-9 rounded bg-neutral-50 dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
          />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        {status && <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{status}</p>}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" disabled={busy || !input.trim()} onClick={onSave}>Save Key</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={onTest}>Test Key</Button>
          {saved && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={onRemove} className="text-red-500">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
