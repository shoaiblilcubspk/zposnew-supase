import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../../../../lib/currencies';

interface Props {
  salesData: any[];
  featureAnalytics: any;
  categoryData: any[];
  currency: string;
  theme: string;
}

const COLORS = ['#10b981', '#6b7280', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'];

export function SalesCharts({ salesData, featureAnalytics, categoryData, currency, theme }: Props) {
  const isDark = theme === 'dark';
  const tooltipStyle = {
    backgroundColor: isDark ? '#141414' : '#ffffff',
    border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e5e7eb',
    borderRadius: '6px',
    boxShadow: 'none',
    color: isDark ? '#fff' : '#000',
    fontSize: '12px',
  };
  const itemStyle = { color: isDark ? '#e5e7eb' : '#374151' };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {/* Sales Trend Line Chart */}
      <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 shadow-none">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-white/[0.06]">
          <span className="text-[12px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            Sales & Volume Trend
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">Revenue vs Bills</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#f0f0f0'} />
            <XAxis dataKey="date" stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={11} tickLine={false} />
            <YAxis stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={11} tickLine={false} />
            <Tooltip formatter={(value: any, name: string) => [name === 'sales' ? formatCurrency(Number(value), currency) : value, name === 'sales' ? 'Sales' : 'Transactions']} contentStyle={tooltipStyle} itemStyle={itemStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="Sales" dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="transactions" stroke={isDark ? '#a3a3a3' : '#525252'} strokeWidth={1.5} name="Bills" dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue By Item Type */}
      <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 shadow-none">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-white/[0.06]">
          <span className="text-[12px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            Revenue By Item Type
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">Distribution</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={[
                { name: 'Products', value: featureAnalytics.productRevenue },
                { name: 'Services', value: featureAnalytics.serviceRevenue },
                { name: 'Add-ons', value: featureAnalytics.modifiersRevenue }
              ].filter(d => d.value > 0)}
              cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value"
            >
              {[
                { name: 'Products', value: featureAnalytics.productRevenue },
                { name: 'Services', value: featureAnalytics.serviceRevenue },
                { name: 'Add-ons', value: featureAnalytics.modifiersRevenue }
              ].filter(d => d.value > 0).map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6'][index % 3]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} contentStyle={tooltipStyle} itemStyle={itemStyle} />
            <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 shadow-none">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-white/[0.06]">
          <span className="text-[12px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            Sales by Category
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">Top Categories</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
              {categoryData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
            </Pie>
            <Tooltip formatter={(value: any) => [formatCurrency(Number(value), currency), 'Revenue']} contentStyle={tooltipStyle} itemStyle={itemStyle} />
            <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Top Variants */}
      {featureAnalytics.topVariants.length > 0 && (
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md p-4 shadow-none">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-white/[0.06]">
            <span className="text-[12px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              Top Selling Variants
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">Variants</span>
          </div>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
            {featureAnalytics.topVariants.map((variant: any, index: number) => (
              <div key={index} className="flex justify-between items-center px-2.5 py-1.5 bg-neutral-50 dark:bg-white/[0.02] rounded border border-neutral-200 dark:border-white/[0.06]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-mono text-neutral-400 w-4">{index + 1}.</span>
                  <span className="text-[13px] font-medium text-neutral-900 dark:text-white truncate">{variant.name}</span>
                  <span className="text-[10px] font-mono text-neutral-500">({variant.quantity} sold)</span>
                </div>
                <span className="text-[13px] font-mono tabular-nums font-semibold text-neutral-900 dark:text-white ml-2">
                  {formatCurrency(variant.revenue, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
