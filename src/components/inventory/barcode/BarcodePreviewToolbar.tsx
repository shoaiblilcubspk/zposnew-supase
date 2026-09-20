import { Minus, Plus, Maximize2 } from 'lucide-react';
import { Button } from '../../../shared/ui';

interface BarcodePreviewToolbarProps {
    paperSize: string;
    pageCount: number;
    a4Columns: number;
    a4Rows: number;
    autoScale: number;
    zoomDelta: number;
    previewScale: number;
    setZoomDelta: React.Dispatch<React.SetStateAction<number>>;
    calcAutoScale: () => void;
}

export function BarcodePreviewToolbar({
    paperSize,
    pageCount,
    a4Columns,
    a4Rows,
    autoScale,
    zoomDelta,
    previewScale,
    setZoomDelta,
    calcAutoScale,
}: BarcodePreviewToolbarProps) {
    return (
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 bg-neutral-100 dark:bg-[#0f0f0f] border-b border-neutral-200 dark:border-white/[0.08] flex-wrap gap-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white dark:bg-surface py-1 px-2.5 rounded border border-neutral-200 dark:border-white/[0.08] shadow-none">
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap hidden sm:inline">Preview</span>
                    <div className="hidden sm:block h-2.5 w-px bg-neutral-200 dark:bg-white/10" />
                    <span className="text-[11px] font-mono font-medium text-neutral-900 dark:text-white uppercase">{paperSize}</span>
                    <div className="h-2.5 w-px bg-neutral-200 dark:bg-white/10" />
                    <span className="text-[11px] font-mono text-neutral-500">{pageCount}pg</span>
                    <div className="h-2.5 w-px bg-neutral-200 dark:border-white/[0.08]" />
                    <span className="text-[11px] font-mono text-neutral-500">{a4Columns}×{a4Rows}</span>
                </div>
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 hidden sm:inline-flex">
                    Zero Margins
                </span>
            </div>

            <div className="flex items-center gap-1.5 bg-white dark:bg-surface rounded border border-neutral-200 dark:border-white/[0.08] p-1 px-2 shadow-none">
                <Button
                    variant="ghost"
                    onClick={() => setZoomDelta(d => Math.max(d - 0.05, -autoScale + 0.1))}
                    className="!min-h-0 !w-6 !h-6 !p-0 !rounded !bg-transparent !text-neutral-500 hover:!text-neutral-900 dark:hover:!text-white hover:!bg-neutral-100 dark:hover:!bg-surface-hover"
                    icon={<Minus className="h-3 w-3" />}
                />

                <input
                    type="range"
                    min={-autoScale + 0.1}
                    max={2.5 - autoScale}
                    step={0.01}
                    value={zoomDelta}
                    onChange={(e) => setZoomDelta(parseFloat(e.target.value))}
                    className="w-20 sm:w-28 h-1 bg-neutral-200 dark:bg-neutral-800 rounded appearance-none cursor-pointer accent-emerald-600"
                />

                <Button
                    variant="ghost"
                    onClick={() => setZoomDelta(d => Math.min(d + 0.05, 2.5 - autoScale))}
                    className="!min-h-0 !w-6 !h-6 !p-0 !rounded !bg-transparent !text-neutral-500 hover:!text-neutral-900 dark:hover:!text-white hover:!bg-neutral-100 dark:hover:!bg-surface-hover"
                    icon={<Plus className="h-3 w-3" />}
                />

                <div className="w-px h-3.5 bg-neutral-200 dark:border-white/[0.08] mx-0.5" />

                <Button
                    variant="ghost"
                    onClick={() => { setZoomDelta(0); }}
                    className="!min-h-0 !px-1.5 !rounded !bg-transparent !text-[11px] font-mono text-neutral-700 dark:text-neutral-300 hover:!bg-neutral-100 dark:hover:!bg-surface-hover whitespace-nowrap !min-w-[32px]"
                >
                    {Math.round(previewScale * 100)}%
                </Button>

                <div className="w-px h-3.5 bg-neutral-200 dark:border-white/[0.08] mx-0.5" />

                <Button
                    onClick={calcAutoScale}
                    title="Fit To Window"
                    variant="ghost"
                    className="!min-h-0 !w-6 !h-6 !p-0 !rounded !bg-transparent !text-neutral-500 hover:!text-neutral-900 dark:hover:!text-white hover:!bg-neutral-100 dark:hover:!bg-surface-hover"
                    icon={<Maximize2 className="h-3 w-3" />}
                />
            </div>
        </div>
    );
}
