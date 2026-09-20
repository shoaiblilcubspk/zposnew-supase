import { ChevronLeft, RefreshCw } from 'lucide-react';
import { Button, RealIcon, ScrollableTabBar } from '../../../shared/ui';
import { REPORTS_TABS } from '../../../shared/navigation/tabRegistry';
import { formatAppDate } from '../../../lib/dateUtils';
import { useNavigate } from 'react-router-dom';
import { can } from '../../../lib/permissions';

interface Props {
  validStartDate: Date;
  validEndDate: Date;
  appSettings: any;
  isDataLoading: boolean;
  appCurrentUser: any;
  reportType: string;
}

export function ReportHeader({
  validStartDate, validEndDate, appSettings, isDataLoading, appCurrentUser, reportType
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-1 border-b border-neutral-200 dark:border-white/[0.08]">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'pos' }))}
          icon={<ChevronLeft className="h-4 w-4" />}
          className="h-8 px-2.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-transparent hover:border-neutral-200 dark:hover:border-white/[0.08]"
        >
          <span className="hidden sm:inline text-[12px] font-medium">POS</span>
        </Button>

        <div className="h-4 w-px bg-neutral-200 dark:bg-white/[0.08] hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="shrink-0 flex items-center justify-center drop-shadow-md">
            <RealIcon name="reportTab" size="md" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-neutral-900 dark:text-white tracking-[-0.01em] leading-tight">
              Reports & Analytics
            </h1>
            <p className="text-[12px] text-neutral-500 font-normal tracking-tight mt-0.5">
              <span className="font-mono">{formatAppDate(validStartDate, appSettings?.country)}</span> — <span className="font-mono">{formatAppDate(validEndDate, appSettings?.country)}</span>
            </p>
          </div>
        </div>

        {isDataLoading && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.08]">
            <RefreshCw className="h-3 w-3 text-primary animate-spin" />
            <span className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400">Syncing...</span>
          </div>
        )}
      </div>

      {/* Tactile Apple Segmented Pills for Reports Tabs */}
      <ScrollableTabBar>
        {REPORTS_TABS.filter(_tab => can(appCurrentUser?.role, 'view_reports')).map(tab => {
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate('/reports/' + tab.id)}
              className={`group relative whitespace-nowrap transition-all duration-150 flex-shrink-0 flex items-center gap-2 px-3 h-8 rounded-full text-[12.5px] tracking-tight active:scale-95 border cursor-pointer select-none ${
                isActive
                  ? 'bg-primary text-white font-bold border-primary shadow-xs'
                  : 'bg-white dark:bg-white/[0.05] text-neutral-900 dark:text-neutral-100 font-semibold border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-50 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="shrink-0 flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
                <RealIcon name={tab.realIcon} size={20} />
              </div>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </ScrollableTabBar>
    </div>
  );
}
