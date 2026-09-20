import React from 'react';
import { SearchableSelect } from './SearchableSelect';
import { cn } from '../../lib/utils';

/**
 * DateRangePicker — the single standardized date-range filter for all
 * non-POS routes.
 *
 * Modeled on ReportsManager's 7-option dropdown (the app's most complete
 * implementation). Presentation + interaction only: preset math stays in
 * the page via dateUtils; this component renders the preset dropdown and
 * the custom-range date inputs.
 */
export interface DateRangePreset {
  id: string;
  label: string;
}

export interface DateRangePickerProps {
  preset: string;
  presets: DateRangePreset[];
  onPresetChange: (id: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function DateRangePicker({
  preset,
  presets,
  onPresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = 'RANGE',
  icon,
  className,
}: DateRangePickerProps) {
  const isCustom = preset === 'custom';

  return (
    <div className={cn('flex flex-col sm:flex-row items-stretch sm:items-center gap-3', className)}>
      <div className="flex-1 sm:flex-none sm:min-w-[200px]">
        <SearchableSelect
          label={label}
          options={presets}
          value={preset}
          onChange={onPresetChange}
          icon={icon}
        />
      </div>

      {isCustom && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full p-1.5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full sm:flex-1 h-8 px-2.5 text-[13px] font-mono bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-neutral-900 dark:text-neutral-100 focus:border-primary focus:outline-none transition-colors shadow-none"
          />
          <span className="hidden sm:block text-neutral-400 font-mono text-[11px] px-1">
            TO
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full sm:flex-1 h-8 px-2.5 text-[13px] font-mono bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded text-neutral-900 dark:text-neutral-100 focus:border-primary focus:outline-none transition-colors shadow-none"
          />
        </div>
      )}
    </div>
  );
}
