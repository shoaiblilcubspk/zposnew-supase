import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  ArrowRight,
  Clock,
  Activity,
  Zap,
  Star
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { MagicalClock } from './MagicalClock';
import { formatCurrency } from '../../lib/currencies';
import { formatInTimeZone } from '../../lib/dateUtils';
import { Button } from '../../shared/ui';
import { DashboardCards } from './DashboardCards';
import { useDashboardData } from './DashboardManager.data';

export function DashboardManager() {
  const navigate = useNavigate();
  const {
    currency,
    country,
    todaySalesStats,
    todayStats,
    flowRatio,
    payableStats,
    pendingPOsCount,
    lowStockCount,
    hourlyData,
    recentActivity,
  } = useDashboardData();

  return (
    <div className="main-content-scroll p-2.5 sm:p-4 bg-gray-50/50 dark:bg-app flex flex-col gap-4">
      {/* --- COMPACT HERO GRID WITH MAGICAL WATCH --- */}
      <div className="grid grid-cols-[1fr_auto] lg:grid-cols-3 gap-3 items-stretch">
        
        {/* Left: Identity Greeting Card */}
        <div className="lg:col-span-2 flex flex-col justify-between p-4 sm:p-5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none relative overflow-hidden min-h-[140px] sm:min-h-[160px]">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                <span className="text-[10px] font-mono uppercase tracking-wider">{"System Live"}</span>
              </div>
              <div className="px-2 py-0.5 bg-neutral-100 dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-400 rounded border border-neutral-200 dark:border-white/[0.08] flex items-center gap-1">
                <Activity className="w-2.5 h-2.5" />
                <span className="text-[10px] font-mono uppercase tracking-wider">POS</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight leading-none mb-1">
              {"Control Center"}
            </h1>
            <p className="text-[12px] text-neutral-500 dark:text-neutral-400 max-w-xl leading-normal hidden sm:block">
              {"Welcome back. Monitor real-time transactions and inventory health across your terminals."}
            </p>
          </div>

          <div className="relative z-10 mt-3 flex items-center gap-2">
            <Button
              onClick={() => navigate('/pos')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              className="h-8 px-3 text-[13px] font-medium rounded-md"
            >
              {"Launch POS"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/inventory')}
              className="h-8 px-3 text-[13px] font-medium rounded-md"
            >
              {"Manage Stock"}
            </Button>
          </div>
        </div>

        {/* Right: The Magical Clock Card — compact on mobile, full on lg */}
        <div className="w-[110px] sm:w-auto lg:w-auto bg-white dark:bg-surface rounded-md p-2 sm:p-3 border border-neutral-200 dark:border-white/[0.08] shadow-none relative overflow-hidden flex flex-col items-center justify-center">
          <div className="relative z-10 w-full h-full max-w-[110px] sm:max-w-[130px] aspect-square flex items-center justify-center">
            <MagicalClock />
          </div>
        </div>
      </div>

      {/* Cards always mounted — never swap with skeleton to prevent blink */}
      <DashboardCards
        todaySalesStats={todaySalesStats}
        todayStats={todayStats}
        currency={currency}
        flowRatio={flowRatio}
        payableStats={payableStats}
        pendingPOsCount={pendingPOsCount}
        lowStockCount={lowStockCount}
      />

      {/* --- BUSINESS PULSE & LIVE FEED (THE ANALYTICS) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Live Business Pulse Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-surface rounded-md p-4 border border-neutral-200 dark:border-white/[0.08] shadow-none flex flex-col h-[340px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-white">{"Business Pulse"}</h3>
              <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{"Hourly Volume"}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-mono text-neutral-500 uppercase">{"Peak Sales"}</p>
                <p className="text-[13px] font-mono font-semibold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(Math.max(...hourlyData.map(d => d.value), 0), currency)}</p>
              </div>
              <div className="w-7 h-7 bg-neutral-100 dark:bg-white/[0.04] rounded-md flex items-center justify-center border border-neutral-200 dark:border-white/[0.08]">
                <Zap className="w-3.5 h-3.5 text-neutral-400" />
              </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    boxShadow: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                  itemStyle={{ color: '#10B981', fontSize: '11px', textTransform: 'uppercase' }}
                  formatter={(value: number) => formatCurrency(value, currency)}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPulse)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Feed - Compact List */}
        <div className="lg:col-span-1 bg-white dark:bg-surface rounded-md p-4 border border-neutral-200 dark:border-white/[0.08] shadow-none flex flex-col h-[340px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-white">{"Live Feed"}</h3>
              <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{"Recent Transactions"}</p>
            </div>
            <div className="w-7 h-7 bg-neutral-100 dark:bg-white/[0.04] rounded-md flex items-center justify-center border border-neutral-200 dark:border-white/[0.08]">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto scrollbar-hide pb-1">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1">
                <Star className="w-6 h-6 text-neutral-300 dark:text-neutral-700 mb-2" />
                <p className="text-[11px] font-mono uppercase text-neutral-400">{"No Activity"}</p>
              </div>
            ) : (
              recentActivity.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => navigate('/transactions')}
                  className="bg-white dark:bg-surface hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors p-2 rounded-md border border-neutral-200 dark:border-white/[0.08] flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] text-neutral-500">
                      {sale.paymentMethod === 'cash' ? <Wallet className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-mono font-medium text-neutral-900 dark:text-white truncate">TRX-{sale.id.slice(-4)}</p>
                      <p className="text-[10px] font-mono text-neutral-500">{formatInTimeZone(sale.createdAt || sale.timestamp, country, 'HH:mm')}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(sale.total - (sale.refundedAmount || 0), currency, false)}</p>
                    <p className="text-[10px] font-mono text-neutral-400 uppercase">{sale.items?.length || 0} {sale.items?.length === 1 ? "item" : "items"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
