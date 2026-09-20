import { useBarcodeSettings } from './useBarcodeSettings';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Minus, Plus, X, Maximize2 } from 'lucide-react';
import { Product } from '../../../types';
import { Button, Badge } from '../../../shared/ui';
import { BarcodeCard } from './BarcodeCard';
import { BarcodeSidebar } from './BarcodeSidebar';
import { BarcodePreviewToolbar } from './BarcodePreviewToolbar';

interface BarcodeGeneratorProps {
    products: Product[];
    onClose: () => void;
    onProductsChange?: (nextProducts: Product[]) => void;
}

const A4_W = 794;
const A4_H = 1123;

export let persistedBarcodeProducts: Product[] = [];
export let persistedBarcodeQuantities: Record<string, number> = {};

export function clearPersistedBarcodeState() {
    persistedBarcodeProducts = [];
    persistedBarcodeQuantities = {};
}

export function BarcodeGenerator({ products, onClose, onProductsChange }: BarcodeGeneratorProps) {
    const settings = useBarcodeSettings();
    const {
        paperSize, a4Columns, a4Rows, barcodeScale, barcodeHeight,
        labelPadding, labelBorder, showBarcode, showQr, qrSize, nameLines, barcodeFontSize, contentScale,
        marginX, marginY, gapX, gapY, barcodeBarWidth, barcodeZoom,
        showPrice, showName, showCategory, showSku, appSettings
    } = settings;

    const [localProducts, setLocalProducts] = useState<Product[]>(() => {
        return persistedBarcodeProducts.length > 0 ? persistedBarcodeProducts : products;
    });
    const [quantities, setQuantities] = useState<Record<string, number>>(() => {
        if (Object.keys(persistedBarcodeQuantities).length > 0) return persistedBarcodeQuantities;
        const q: Record<string, number> = {};
        products.forEach(p => { q[p.id] = 1; });
        return q;
    });

    useEffect(() => {
        persistedBarcodeProducts = localProducts;
        persistedBarcodeQuantities = quantities;
        if (onProductsChange) onProductsChange(localProducts);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localProducts, quantities]);

    useEffect(() => {
        if (products.length > 0 && localProducts.length === 0) {
            setLocalProducts(products);
            const q: Record<string, number> = {};
            products.forEach(p => { q[p.id] = 1; });
            setQuantities(q);
        }
    }, [products]);

    const updateQty = (id: string, qty: number) => setQuantities(prev => ({ ...prev, [id]: Math.max(0, qty) }));
    const setGlobalQty = (qty: number) => {
        const q: Record<string, number> = {};
        localProducts.forEach(p => { q[p.id] = qty; });
        setQuantities(q);
    };

    const isThermal = paperSize !== 'A4';

    const totalLabels = localProducts.reduce((sum, p) => sum + (quantities[p.id] || 0), 0);

    const allLabels: { product: Product, id: string }[] = [];
    localProducts.forEach(p => {
        const q = quantities[p.id] || 0;
        for (let i = 0; i < q; i++) {
            allLabels.push({ product: p, id: `${p.id}-${i}` });
        }
    });

    const labelsPerPage = a4Columns * a4Rows;
    const pages: typeof allLabels[] = [];
    if (!isThermal) {
        for (let i = 0; i < allLabels.length; i += labelsPerPage) {
            pages.push(allLabels.slice(i, i + labelsPerPage));
        }
    } else {
        pages.push(allLabels); // Thermal is just one continuous list
    }

    const [autoScale, setAutoScale] = useState(1);
    const [zoomDelta, setZoomDelta] = useState(0);
    const previewScale = autoScale + zoomDelta;

    const previewAreaRef = useRef<HTMLDivElement>(null);
    const componentRef = useRef<HTMLDivElement>(null);

    const calcAutoScale = useCallback(() => {
        if (!previewAreaRef.current) return;
        const w = previewAreaRef.current.clientWidth;
        const targetW = isThermal ? (paperSize === '58mm' ? 220 : 300) : A4_W;
        const padding = 40;
        const scale = Math.min(1, (w - padding) / targetW);
        setAutoScale(scale);
        setZoomDelta(0);
    }, [isThermal, paperSize]);

    useEffect(() => {
        calcAutoScale();
        window.addEventListener('resize', calcAutoScale);
        return () => window.removeEventListener('resize', calcAutoScale);
    }, [calcAutoScale]);

    const getPageStyle = () => {
        if (paperSize === 'A4') {
            return `@page { size: A4 portrait; margin: 0; }`;
        }
        const match = paperSize.match(/Thermal-(\d+)x(\d+)/);
        if (match) {
            return `@page { size: ${match[1]}mm ${match[2]}mm; margin: 0; } body { margin: 0; }`;
        }
        return `@page { margin: 0; }`;
    };

    const handlePrintFn = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Barcodes_${new Date().getTime()}`,
        pageStyle: getPageStyle(),
    });

    const handlePrint = () => {
        if (totalLabels > 0 && handlePrintFn) {
            handlePrintFn();
        }
    };

    const cellW = isThermal ? '100%' : `${100 / a4Columns}%`;
    const cellH = isThermal ? 'auto' : `${100 / a4Rows}%`;

    const renderCard = (product: Product, labelId: string) => (
        <BarcodeCard
            key={labelId}
            product={product}
            labelId={labelId}
            isThermal={isThermal}
            paperSize={paperSize}
            labelBorder={labelBorder}
            currency={appSettings.currency}
            pad={labelPadding}
            ratio={contentScale}
            fs={barcodeFontSize}
            barH={barcodeHeight}
            barcodeBarWidth={barcodeBarWidth}
            barcodeScale={barcodeScale}
            barcodeZoom={barcodeZoom}
            barcodeFontSize={barcodeFontSize}
            showBarcode={showBarcode}
            showQr={showQr}
            showName={showName}
            showPrice={showPrice}
            showCategory={showCategory}
            showSku={showSku}
            nameLines={nameLines}
            qrSz={qrSize}
            previewScale={previewScale}
            cellW={cellW}
            cellH={cellH}
            marginX={marginX}
            marginY={marginY}
        />
    );

    return (
        <div className="flex flex-col h-full min-h-[600px] w-full bg-white dark:bg-surface overflow-hidden relative border-t border-neutral-200 dark:border-white/[0.08]">
            <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 md:px-5 py-2.5 border-b border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 bg-neutral-100 dark:bg-white/[0.06] rounded flex-shrink-0">
                        <Printer className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white leading-none truncate">{"Barcode Print Engine"}</h2>
                        <p className="hidden sm:block text-[11px] text-neutral-500 mt-0.5 truncate">{"Configure and print barcode labels"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="hidden sm:inline-flex text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                        {totalLabels} {totalLabels === 1 ? 'label' : 'labels'} ({pages.length} {pages.length === 1 ? 'page' : 'pages'})
                    </span>
                    <Button
                        onClick={handlePrint}
                        disabled={totalLabels === 0}
                        variant="primary"
                        size="sm"
                        icon={<Printer className="h-3.5 w-3.5 flex-shrink-0" />}
                    >
                        <span>{"Print Labels"}</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onClose} icon={<X className="h-4 w-4" />} />
                </div>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                <BarcodeSidebar
                    settings={settings}
                    localProducts={localProducts}
                    setLocalProducts={setLocalProducts}
                    quantities={quantities}
                    setQuantities={setQuantities}
                    updateQty={updateQty}
                    setGlobalQty={setGlobalQty}
                />
                <div ref={previewAreaRef}
                    className="h-[35vh] lg:h-full lg:flex-1 flex-shrink-0 bg-neutral-100 dark:bg-[#0f0f0f] flex flex-col overflow-hidden order-1 lg:order-2 relative min-h-0"
                >
                    <BarcodePreviewToolbar
                        paperSize={paperSize}
                        pageCount={pages.length}
                        a4Columns={a4Columns}
                        a4Rows={a4Rows}
                        autoScale={autoScale}
                        zoomDelta={zoomDelta}
                        previewScale={previewScale}
                        setZoomDelta={setZoomDelta}
                        calcAutoScale={calcAutoScale}
                    />

                    <div className="flex-1 overflow-auto">
                        <div className="flex flex-col items-center py-4 px-2 min-h-full">
                            <div ref={componentRef} className="print:bg-transparent flex flex-col items-center">
                                {paperSize === 'A4' ? (
                                    pages.map((page, pi) => (
                                        <div key={`pw-${pi}`} className="flex flex-col items-center">
                                            <div className="page-indicator print:hidden flex items-center gap-2 my-2"
                                                style={{ width: `${A4_W * previewScale}px`, maxWidth: 'calc(100vw - 32px)' }}>
                                                <div className="h-px flex-1 bg-neutral-200 dark:border-white/[0.08]" />
                                                <span className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 px-2.5 py-0.5 rounded bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none whitespace-nowrap">
                                                    <span className="text-emerald-500">●</span> page {pi + 1} / {pages.length}
                                                </span>
                                                <div className="h-px flex-1 bg-neutral-200 dark:border-white/[0.08]" />
                                            </div>

                                            <div className="print-page bg-white shadow-2xl print:shadow-none"
                                                data-capture-id={`page-${pi}`}
                                                style={{
                                                    width: `${A4_W}px`,
                                                    height: `${A4_H}px`,
                                                    transform: `scale(${previewScale})`,
                                                    transformOrigin: 'top center',
                                                    marginBottom: `${(A4_H * previewScale) - A4_H + 16}px`,
                                                    display: 'grid',
                                                    gridTemplateColumns: `repeat(${a4Columns},1fr)`,
                                                    gridTemplateRows: `repeat(${a4Rows},1fr)`,
                                                    alignContent: 'stretch',
                                                    gap: `${gapY}px ${gapX}px`,
                                                    padding: '19px',
                                                    boxSizing: 'border-box',
                                                    backgroundColor: 'white',
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                }}>
                                                {page.map(item => renderCard(item.product, item.id))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center pt-3 print:pt-0">
                                        {allLabels.map(item => renderCard(item.product, item.id))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @media print {
                            .print-page {
                                transform: none !important;
                                margin-bottom: 0 !important;
                                width: 210mm !important;
                                height: 297mm !important;
                                padding: 5mm !important;
                            }
                            .label-to-print {
                                transform: none !important;
                                margin-bottom: 0 !important;
                                border: none !important;
                                box-shadow: none !important;
                            }
                            .page-indicator { display: none !important; }
                        }
                    `}</style>
                </div>
            </div>
        </div>
    );
}

export default BarcodeGenerator;
