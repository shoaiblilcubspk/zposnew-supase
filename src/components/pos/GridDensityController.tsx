import { useSettingsStore } from '../../stores';
import { settingsService } from '../../lib/services';
import { sonner } from '../../lib/sonner';

export function GridDensityController() {
  const appSettings = useSettingsStore(s => s.settings);

  const gridCols = appSettings.posGridColumns ?? 4;

  const handleColumnChange = (cols: number) => {
    useSettingsStore.getState().setSettings({ posGridColumns: cols });
    try {
      localStorage.setItem('pos_grid_columns', String(cols));
      const existing = JSON.parse(localStorage.getItem('pos_local_prefs') || '{}');
      localStorage.setItem('pos_local_prefs', JSON.stringify({ ...existing, posGridColumns: cols }));
      settingsService.update({ posGridColumns: cols }).catch(() => {});
    } catch {}
    sonner.success(`Grid density set to ${cols === 0 ? 'Auto' : `${cols} columns`}`);
  };

  return (
    <div className="hidden lg:flex items-center gap-0.5 bg-gray-100/50 dark:bg-white/5 p-0.5 rounded-lg border border-gray-200/50 dark:border-white/5">
      <button
        onClick={() => handleColumnChange(0)}
        className={`flex items-center justify-center px-2 h-5 lg:h-7 rounded-md transition-all ${gridCols === 0
          ? 'bg-primary text-white shadow-lg shadow-emerald-500/20 font-black scale-105'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
        title="Auto Layout"
      >
        <span className="text-[8px] lg:text-[10px] uppercase font-black">Auto</span>
      </button>

      {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
        <button
          key={num}
          onClick={() => handleColumnChange(num)}
          className={`flex items-center justify-center w-5 h-5 lg:w-7 lg:h-7 rounded-md transition-all ${gridCols === num
            ? 'bg-primary text-white shadow-lg shadow-emerald-500/20 font-black scale-105'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          title={`${num} Columns`}
        >
          <span className="text-[8px] lg:text-[10px]">{num}</span>
        </button>
      ))}
    </div>
  );
}
