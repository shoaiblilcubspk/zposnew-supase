import { useEffect, useRef, useState } from 'react';

export function ReceiptScaler({
  paperWidthPx,
  itemsCount = 1,
  children,
  className = '',
}: {
  paperWidthPx: string;
  itemsCount?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState<number>(0);

  const recalc = () => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth - 16;
    const receiptW = parseInt(paperWidthPx, 10) || 302;
    const newScale = containerW < receiptW ? Math.max(0.78, containerW / receiptW) : 1;
    setScale(newScale);

    if (contentRef.current) {
      setContentHeight(contentRef.current.offsetHeight);
    }
  };

  useEffect(() => {
    recalc();
    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [paperWidthPx]);

  // Normal receipts (1-3 items or <= 520px height) show full preview without scrollbar
  const isShortReceipt = itemsCount <= 3 || (contentHeight > 0 && contentHeight <= 520);

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col items-center justify-start py-2 sm:py-3.5 px-1 bg-neutral-100 dark:bg-black/40 rounded-md border border-neutral-200/60 dark:border-white/[0.06] transition-all duration-150 ${
        isShortReceipt
          ? 'overflow-visible'
          : 'overflow-y-auto max-h-[50vh] sm:max-h-[64vh] md:max-h-[70vh] custom-scrollbar'
      } ${className}`}
    >
      <div
        ref={contentRef}
        className="shadow-md bg-white text-black shrink-0 transition-transform rounded border border-neutral-200/80 my-0"
        style={{
          width: paperWidthPx,
          maxWidth: '100%',
          transform: scale < 1 ? `scale(${scale})` : 'none',
          transformOrigin: 'top center',
          marginBottom: scale < 1 && contentHeight ? `${-(contentHeight * (1 - scale))}px` : undefined,
        }}
      >
        {children}
      </div>
      {!isShortReceipt && (
        <div className="text-[10.5px] font-mono text-neutral-500 dark:text-neutral-400 text-center mt-2 pb-0.5 tracking-tight">
          Scroll receipt to view all {itemsCount} items
        </div>
      )}
    </div>
  );
}
