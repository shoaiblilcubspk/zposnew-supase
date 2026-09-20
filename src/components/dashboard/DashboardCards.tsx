import { Wallet, Activity, Building2, ShoppingBag, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../lib/currencies';

interface DashboardCardsProps {
  todaySalesStats: { revenue: number; cash: number; card: number; online: number };
  todayStats: { sales: number; purchases: number };
  currency: string;
  flowRatio: number;
  payableStats: { toPay: number; advance: number };
  pendingPOsCount: number;
  lowStockCount: number;
}

export function DashboardCards({
  todaySalesStats,
  todayStats,
  currency,
  flowRatio,
  payableStats,
  pendingPOsCount,
  lowStockCount
}: DashboardCardsProps) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* 1. Revenue Today */}
      <div
        className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none hover:border-neutral-400 dark:hover:border-white/20 transition-colors cursor-pointer flex flex-col justify-between min-h-[85px]"
        onClick={() => navigate('/reports')}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{"Revenue Today"}</span>
          <Wallet className="w-3.5 h-3.5 text-neutral-400" />
        </div>
        <div>
          <span className="text-lg font-bold font-mono tabular-nums text-neutral-900 dark:text-white">{formatCurrency(todaySalesStats.revenue, currency)}</span>
          <div className="mt-1">
            <span className="text-[10px] font-mono text-neutral-500 uppercase">
              {todaySalesStats.cash > 0 ? "Cash: " + formatCurrency(todaySalesStats.cash, currency, false) : "No Cash"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Flow Monitor */}
      <div
        className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none hover:border-neutral-400 dark:hover:border-white/20 transition-colors cursor-pointer flex flex-col justify-between min-h-[85px]"
        onClick={() => navigate('/reports')}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{"Flow Monitor"}</span>
          <Activity className="w-3.5 h-3.5 text-neutral-400" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-neutral-500">{"Inflow"}</span>
            <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">+{formatCurrency(todayStats.sales, currency, false)}</span>
          </div>
          <div className="w-full h-1 bg-neutral-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${flowRatio}%` }} />
          </div>
        </div>
      </div>

      {/* 3. Payables */}
      <div
        className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none hover:border-neutral-400 dark:hover:border-white/20 transition-colors cursor-pointer flex flex-col justify-between min-h-[85px]"
        onClick={() => navigate('/suppliers')}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{"Payables"}</span>
          <Building2 className="w-3.5 h-3.5 text-neutral-400" />
        </div>
        <div>
          <span className="text-lg font-bold font-mono tabular-nums text-neutral-900 dark:text-white">{formatCurrency(payableStats.toPay, currency)}</span>
          <p className="text-[10px] font-mono text-neutral-500 uppercase mt-0.5">Supplier balance</p>
        </div>
      </div>

      {/* 4. Orders */}
      <div
        className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-3 shadow-none hover:border-neutral-400 dark:hover:border-white/20 transition-colors cursor-pointer flex flex-col justify-between min-h-[85px]"
        onClick={() => navigate('/purchase-orders')}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{"Pending Orders"}</span>
          <ShoppingBag className="w-3.5 h-3.5 text-neutral-400" />
        </div>
        <div>
          <span className="text-lg font-bold font-mono tabular-nums text-neutral-900 dark:text-white">{pendingPOsCount}</span>
          <p className="text-[10px] font-mono text-neutral-500 uppercase mt-0.5">Awaiting fulfillment</p>
        </div>
      </div>

      {/* 5. Inventory */}
      <div
        className={`bg-white dark:bg-surface border rounded-md p-3 shadow-none transition-colors cursor-pointer flex flex-col justify-between min-h-[85px] ${lowStockCount > 0 ? 'border-amber-500/30' : 'border-neutral-200 dark:border-white/[0.08] hover:border-neutral-400 dark:hover:border-white/20'}`}
        onClick={() => navigate('/inventory')}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{"Low Stock Items"}</span>
          <Package className={`w-3.5 h-3.5 ${lowStockCount > 0 ? 'text-amber-500' : 'text-neutral-400'}`} />
        </div>
        <div>
          <span className={`text-lg font-bold font-mono tabular-nums ${lowStockCount > 0 ? 'text-amber-500' : 'text-neutral-900 dark:text-white'}`}>{lowStockCount}</span>
          <p className={`text-[10px] font-mono uppercase mt-0.5 ${lowStockCount > 0 ? 'text-amber-500' : 'text-neutral-500'}`}>
            {lowStockCount > 0 ? "Requires restock" : "Optimal"}
          </p>
        </div>
      </div>
    </div>
  );
}
