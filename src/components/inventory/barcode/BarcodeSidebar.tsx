import React from 'react';
import { Minus, Plus, Save, X, Layout } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { SearchableSelect } from '../../../shared/ui/SearchableSelect';
import { Product } from '../../../types';
import type { PaperSize } from './BarcodeCard';

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[9px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest mb-2.5">{children}</p>
);

export const SliderRow = ({ label, disp, min, max, step, val, set }: {
    label: string; disp: string; min: number; max: number; step: number; val: number; set: (v: number) => void;
}) => {
    const handleAdjust = (dir: number) => {
        const precision = step.toString().split('.')[1]?.length || 0;
        const next = parseFloat((val + (dir * step)).toFixed(precision));
        set(Math.max(min, Math.min(max, next)));
    };

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none">{label}</span>
                <span className="text-[10px] font-black text-blue-600 min-w-[32px] text-right leading-none">{disp}</span>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleAdjust(-1)}
                    className="!min-h-0 !w-6 !h-6 !p-0 !rounded-lg !bg-gray-50 dark:!bg-white/5 !border !border-gray-200/50 dark:!border-white/5 !text-gray-500 hover:!text-gray-900 dark:hover:!text-white active:!scale-90"
                    icon={<Minus className="h-2.5 w-2.5" />}
                />

                <input type="range" min={min} max={max} step={step} value={val}
                    onChange={e => set(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-gray-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600" />

                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleAdjust(1)}
                    className="!min-h-0 !w-6 !h-6 !p-0 !rounded-lg !bg-gray-50 dark:!bg-white/5 !border !border-gray-200/50 dark:!border-white/5 !text-gray-500 hover:!text-gray-900 dark:hover:!text-white active:!scale-90"
                    icon={<Plus className="h-2.5 w-2.5" />}
                />
            </div>
        </div>
    );
};

interface BarcodeSidebarProps {
    settings: any;
    localProducts: Product[];
    setLocalProducts: (products: Product[]) => void;
    quantities: Record<string, number>;
    setQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    updateQty: (id: string, d: number) => void;
    setGlobalQty: (v: number) => void;
}

export function BarcodeSidebar({
    settings,
    localProducts,
    setLocalProducts,
    quantities,
    setQuantities,
    updateQty,
    setGlobalQty
}: BarcodeSidebarProps) {
    const {
        paperSize, setPaperSize,
        a4Columns, setA4Columns,
        a4Rows, setA4Rows,
        showPrice, setShowPrice,
        showName, setShowName,
        showSku, setShowSku,
        showCategory, setShowCategory,
        barcodeScale, setBarcodeScale,
        barcodeHeight, setBarcodeHeight,
        labelPadding, setLabelPadding,
        labelBorder, setLabelBorder,
        showBarcode, setShowBarcode,
        showQr, setShowQr,
        qrSize, setQrSize,
        nameLines, setNameLines,
        barcodeFontSize, setBarcodeFontSize,
        contentScale, setContentScale,
        marginX, setMarginX,
        marginY, setMarginY,
        gapX, setGapX,
        gapY, setGapY,
        barcodeBarWidth, setBarcodeBarWidth,
        barcodeZoom, setBarcodeZoom,
        isSaving, saveAsDefault
    } = settings;

    return (
        <div className="
            w-full lg:w-72 xl:w-80
            flex flex-col
            bg-white dark:bg-surface
            border-t lg:border-t-0 lg:border-r border-gray-200 dark:border-white/5
            order-2 lg:order-1
            overflow-hidden
            flex-1 lg:flex-none lg:h-full
            "
        >
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-hide min-h-0">

                <section>
                    <SectionTitle>Layout Configuration</SectionTitle>
                    <div className="space-y-3">

                        <div>
                            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wide">Symbols</span>
                            <div className="grid grid-cols-2 gap-1.5 mt-1">
                                <button
                                    onClick={() => setShowBarcode(!showBarcode)}
                                    className={`h-8 text-[11px] font-mono rounded transition-colors border ${showBarcode ? 'bg-primary/10 border-primary text-primary dark:text-emerald-400 font-medium' : 'bg-white dark:bg-white/[0.02] border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400'}`}
                                >
                                    Barcode
                                </button>
                                <button
                                    onClick={() => setShowQr(!showQr)}
                                    className={`h-8 text-[11px] font-mono rounded transition-colors border ${showQr ? 'bg-primary/10 border-primary text-primary dark:text-emerald-400 font-medium' : 'bg-white dark:bg-white/[0.02] border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400'}`}
                                >
                                    QR Code
                                </button>
                            </div>
                        </div>

                        <div>
                            <span className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Paper Type</span>
                            <div className="mt-1 relative z-30">
                                <SearchableSelect
                                    options={[
                                        { id: 'A4', label: "Standard A4 Sheet" },
                                        { id: 'Thermal-50x25', label: "Thermal 50x25" },
                                        { id: 'Thermal-40x30', label: "Thermal 40x30" },
                                        { id: 'Thermal-50x30', label: "Thermal 50x30" },
                                        { id: 'Thermal-50x40', label: "Thermal 50x40" },
                                        { id: 'Thermal-60x40', label: "Thermal 60x40" },
                                        { id: 'Thermal-80x40', label: "Thermal 80x40" },
                                        { id: 'Thermal-80x50', label: "Thermal 80x50" }
                                    ]}
                                    value={paperSize}
                                    onChange={(val) => setPaperSize(val as PaperSize)}
                                    placeholder={"Select Size..."}
                                    icon={Layout}
                                />
                            </div>
                        </div>

                        {paperSize === 'A4' && <>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Columns</span>
                                    <span className="text-[10px] font-black text-blue-600">{a4Columns}</span>
                                </div>
                                <div className="flex bg-neutral-100 dark:bg-white/[0.05] p-0.5 rounded-md border border-neutral-200 dark:border-white/[0.08]">
                                    {[2, 3, 4, 5, 6].map(n => (
                                        <button key={n} onClick={() => setA4Columns(n)}
                                            className={`flex-1 py-1 text-[12px] font-mono font-medium rounded transition-colors ${a4Columns === n ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <SliderRow label={"Rows per Page"} disp={String(a4Rows)} min={3} max={20} step={1} val={a4Rows} set={v => setA4Rows(Math.round(v))} />
                            <p className="text-[11px] text-neutral-500 italic -mt-1">Labels auto-scale to fit rows & columns</p>
                        </>}
                    </div>
                </section>

                <section className="border-t border-neutral-200 dark:border-white/[0.08] pt-3">
                    <div className="flex items-center justify-between mb-2">
                        <SectionTitle>Print Quantities</SectionTitle>
                        <div className="flex gap-1 -mt-2.5">
                            <Button variant="ghost" onClick={() => {
                                setQuantities(localProducts.reduce((a, p) => ({ ...a, [p.id]: 1 }), {}));
                                setBarcodeScale(1.0); setBarcodeHeight(30); setLabelPadding(8); setBarcodeFontSize(8);
                                setBarcodeBarWidth(0.8); setContentScale(1.0); setMarginX(0); setMarginY(0); setGapX(0);
                                setGapY(0); setNameLines(1); setPaperSize('A4'); setA4Columns(3); setA4Rows(10);
                                setShowPrice(true); setShowName(true); setShowSku(false); setShowCategory(false);
                                setLabelBorder(true); setShowBarcode(true); setShowQr(false);
                            }}
                                className="!min-h-0 !px-2 !py-0.5 !rounded !text-[11px] !font-medium !normal-case !tracking-normal !bg-neutral-100 dark:!bg-white/5 !text-neutral-600 dark:!text-neutral-400">Reset All</Button>
                            <Button variant="primary" onClick={() => { const v = prompt('Copies for all:', '5'); if (v) { const n = parseInt(v); if (!isNaN(n)) setGlobalQty(n); } }}
                                className="!min-h-0 !px-2 !py-0.5 !rounded !text-[11px] !font-medium !normal-case !tracking-normal">Set All</Button>
                        </div>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5 custom-scrollbar">
                        {localProducts.map(p => (
                            <div key={p.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] transition-colors group/item">
                                <Button variant="ghost" onClick={() => setLocalProducts(localProducts.filter(x => x.id !== p.id))} className="!min-h-0 !p-1 !rounded !bg-transparent !text-neutral-400 hover:!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10" icon={<X className="h-3.5 w-3.5" />} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-medium text-neutral-900 dark:text-white truncate leading-tight">{p.name}</p>
                                    <p className="text-[11px] text-neutral-500 font-mono leading-tight">{p.barcodeValue || p.barcode || p.sku || 'NO-SKU'}</p>
                                </div>
                                <div className="flex items-center bg-white dark:bg-surface rounded border border-neutral-200 dark:border-white/[0.08] p-0.5 flex-shrink-0">
                                    <Button variant="ghost" onClick={() => updateQty(p.id, -1)} className="!min-h-0 !w-5 !h-5 !p-0 !rounded-sm !bg-transparent !text-neutral-500 hover:!text-rose-500" icon={<Minus className="h-2.5 w-2.5" />} />
                                    <input type="text" inputMode="numeric" value={quantities[p.id] !== undefined ? quantities[p.id] : 0}
                                        onChange={e => {
                                            let str = e.target.value.replace(/^0+/, '');
                                            if (str === '') str = '0';
                                            const v = Math.max(0, Math.min(999, parseInt(str) || 0));
                                            setQuantities(q => ({ ...q, [p.id]: v }));
                                        }}
                                        className="w-10 text-center text-[12px] font-mono font-medium bg-transparent border-none focus:ring-0 text-neutral-900 dark:text-white p-0 [appearance:textfield]" />
                                    <Button variant="ghost" onClick={() => updateQty(p.id, 1)} className="!min-h-0 !w-5 !h-5 !p-0 !rounded-sm !bg-transparent !text-neutral-500 hover:!text-emerald-500" icon={<Plus className="h-2.5 w-2.5" />} />
                                </div>
                            </div>
                        ))}
                        {localProducts.length === 0 && (
                            <div className="text-center py-4 text-neutral-400 text-[12px]">
                                No Products Selected
                            </div>
                        )}
                    </div>
                </section>

                <section className="border-t border-neutral-200 dark:border-white/[0.08] pt-3">
                    <SectionTitle>Content Options</SectionTitle>
                    <div className="grid grid-cols-3 gap-1.5">
                        {([
                            { label: "Name", val: showName, set: setShowName },
                            { label: "Price", val: showPrice, set: setShowPrice },
                            { label: "SKU", val: showSku, set: setShowSku },
                            { label: "Category", val: showCategory, set: setShowCategory },
                            { label: "Border", val: labelBorder, set: setLabelBorder },
                        ] as const).map(({ label, val, set }) => (
                            <button key={label} onClick={() => (set as any)(!val)}
                                className={`py-1 rounded border text-[11px] font-medium transition-colors ${val
                                    ? 'bg-primary/10 border-primary/30 text-emerald-400'
                                    : 'bg-white dark:bg-white/[0.02] border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400'}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {showName && (
                        <div className="mt-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">Name Lines</span>
                                <span className="text-[11px] font-mono text-primary">{nameLines} {nameLines > 1 ? "Lines" : "Line"}</span>
                            </div>
                            <div className="flex bg-neutral-100 dark:bg-white/[0.05] p-0.5 rounded-md border border-neutral-200 dark:border-white/[0.08]">
                                {([1, 2] as const).map(n => (
                                    <button key={n} onClick={() => setNameLines(n)}
                                        className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${nameLines === n ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}>
                                        {n} {n > 1 ? "Lines" : "Line"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <section className="border-t border-gray-200 dark:border-white/5 pt-3 pb-1">
                    <SectionTitle>Barcode Dimensions</SectionTitle>
                    <div className="space-y-3">
                        <SliderRow label={"Overall Content Scale"} disp={contentScale.toFixed(2) + 'x'} min={0.3} max={3.0} step={0.05} val={contentScale} set={setContentScale} />
                        <SliderRow label={"Barcode Zoom"} disp={barcodeZoom.toFixed(2) + 'x'} min={0.5} max={3.0} step={0.05} val={barcodeZoom} set={setBarcodeZoom} />
                        {showBarcode && (
                            <>
                                <SliderRow label={"Barcode Width"} disp={barcodeScale.toFixed(1) + 'x'} min={0.5} max={3} step={0.1} val={barcodeScale} set={setBarcodeScale} />
                                <SliderRow label={"Barcode Height"} disp={barcodeHeight + 'px'} min={15} max={80} step={5} val={barcodeHeight} set={v => setBarcodeHeight(Math.round(v))} />
                                <SliderRow label={"Bar Thickness"} disp={barcodeBarWidth.toFixed(1)} min={0.5} max={5.0} step={0.1} val={barcodeBarWidth} set={setBarcodeBarWidth} />
                            </>
                        )}
                        {showQr && (
                            <SliderRow label={"QR Size"} disp={qrSize + 'px'} min={15} max={200} step={5} val={qrSize} set={v => setQrSize(Math.round(v))} />
                        )}
                        <SliderRow label={"Number Size"} disp={barcodeFontSize + 'px'} min={5} max={30} step={1} val={barcodeFontSize} set={v => setBarcodeFontSize(Math.round(v))} />
                        <SliderRow label={"Cell Padding"} disp={labelPadding + 'px'} min={0} max={20} step={1} val={labelPadding} set={v => setLabelPadding(Math.round(v))} />
                        <SliderRow label={"Margin X"} disp={marginX + 'px'} min={-50} max={50} step={1} val={marginX} set={v => setMarginX(Math.round(v))} />
                        <SliderRow label={"Margin Y"} disp={marginY + 'px'} min={-50} max={50} step={1} val={marginY} set={v => setMarginY(Math.round(v))} />
                        <SliderRow label={"Gap X"} disp={gapX + 'px'} min={0} max={50} step={1} val={gapX} set={v => setGapX(Math.round(v))} />
                        <SliderRow label={"Gap Y"} disp={gapY + 'px'} min={0} max={50} step={1} val={gapY} set={v => setGapY(Math.round(v))} />
                    </div>
                </section>
            </div>

            <div className="flex-shrink-0 relative z-10 px-4 py-2.5 bg-white dark:bg-surface border-t border-neutral-200 dark:border-white/[0.08] shadow-none">
                <Button variant="primary" size="sm" onClick={saveAsDefault} disabled={isSaving}
                    className="w-full">
                    {isSaving
                        ? <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <Save className="h-3.5 w-3.5" />}
                    {isSaving ? "Saving..." : "Save Settings"}
                </Button>
            </div>
        </div>
    );
}
