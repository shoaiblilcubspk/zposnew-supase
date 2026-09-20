import { Badge } from '../../shared/ui';
import { XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function StatusBadge({ status }: { status: string }) {
  if (status === 'Infinity Mode') return <Badge tone="info" size="sm" className="!rounded !text-[10px] font-bold !bg-violet-500/10 !text-violet-500 dark:!text-violet-400 !px-2 !py-0.5" icon={<span>∞</span>}>{"INFINITY"}</Badge>;
  if (status === 'Out of Stock') return <Badge tone="danger" size="sm" className="!rounded !text-[10px] font-bold !bg-red-500/10 !text-red-500 dark:!text-red-400 !px-2 !py-0.5" icon={<XCircle className="w-3 h-3" />}>{"OUT"}</Badge>;
  if (status === 'Low Stock') return <Badge tone="warning" size="sm" className="!rounded !text-[10px] font-bold !bg-amber-500/10 !text-amber-500 dark:!text-amber-400 !px-2 !py-0.5" icon={<AlertTriangle className="w-3 h-3" />}>{"LOW"}</Badge>;
  return <Badge tone="success" size="sm" className="!rounded !text-[10px] font-bold !bg-primary/10 !text-primary dark:!text-emerald-400 !px-2 !py-0.5" icon={<CheckCircle2 className="w-3 h-3" />}>{"OK"}</Badge>;
}
