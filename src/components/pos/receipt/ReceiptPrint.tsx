import { type Sale } from '../../../types';
import { MessageCircle, Printer, Check, Share2, FileText, PlusCircle } from 'lucide-react';
import { Modal, Button } from '../../../shared/ui';
import { formatCurrency } from '../../../lib/currencies';
import { useReceiptActions } from './useReceiptActions';
import { renderNewLayout } from './ReceiptLayouts';
import { renderMonospaceBody } from './ReceiptMonospace';
import { ReceiptScaler } from './ReceiptScaler';
import { useReceiptCtx } from './buildReceiptCtx';

export interface ReceiptPrintProps {
  sale: Sale;
  onClose: () => void;
}

export function ReceiptPrint({ sale, onClose }: ReceiptPrintProps) {
  const ctx = useReceiptCtx(sale);
  const isAutoPrint = ctx.settings.receiptPrinter;
  const isNewLayout = ctx.template !== 'classic';
  const paperWidthPx = ctx.paperWidthPx;

  const { handlePrint, handleSafeClose, handleWhatsAppRedirect, handleShareReceipt, isSharing } = useReceiptActions(ctx, { onClose, isAutoPrint });

  const renderReceiptBody = () => {
    if (isNewLayout) {
      return (
        <div id="receipt-content" style={{ width: paperWidthPx, maxWidth: paperWidthPx, margin: '0 auto' }}>
          {renderNewLayout(ctx)}
        </div>
      );
    }
    return renderMonospaceBody(ctx);
  };

  if (isAutoPrint) {
    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom)+var(--bottom-nav-clearance))] md:pb-4 animate-in fade-in duration-150">
        <div className="bg-white dark:bg-surface rounded-md p-6 max-w-sm w-full shadow-2xl border border-neutral-200 dark:border-white/[0.08] flex flex-col items-center text-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 bg-neutral-100 dark:bg-white/[0.04] rounded border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center">
              <Printer className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white uppercase tracking-tight">Printing Receipt</h3>
            <p className="text-[12px] text-neutral-500 mt-1 font-mono">Processing thermal ESC/POS commands...</p>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-white/[0.06] h-1 rounded overflow-hidden">
            <div className="bg-primary h-full animate-progress" />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button onClick={() => handlePrint()} className="w-full h-8 bg-primary hover:bg-primary-hover text-white rounded text-[13px] font-medium transition-colors shadow-none">
              Print Manually
            </button>
            <button onClick={handleSafeClose} className="text-[12px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
              Close
            </button>
          </div>
        </div>
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
          {renderReceiptBody()}
        </div>
      </div>
    );
  }

  const paperLabel = ctx.isA4 ? 'A4 Document' : ctx.is58mm ? 'Thermal 58mm' : 'Thermal 80mm';

  return (
    <Modal
      isOpen={true}
      onClose={handleSafeClose}
      title="PRINT CHECKOUT"
      subtitle={`POS • ${paperLabel}`}
      maxWidth={ctx.isA4 ? 'max' : 'xl'}
      footer={
        <div className="flex flex-row items-center gap-2 sm:gap-3 w-full overflow-hidden">
          <Button
            id="receipt-close-btn"
            variant="soft-emerald"
            onClick={handleSafeClose}
            className="flex-1 !h-10 sm:!h-11 !text-[12.5px] font-semibold"
            icon={<PlusCircle className="w-4 h-4" />}
            shortcut="Esc"
          >
            <span>New Sale</span>
          </Button>

          <Button
            id="receipt-share-btn"
            variant="soft-blue"
            onClick={handleShareReceipt}
            disabled={isSharing}
            loading={isSharing}
            className="flex-1 !h-10 sm:!h-11 !text-[12.5px] font-semibold"
            icon={!isSharing ? <Share2 className="w-3.5 h-3.5" /> : undefined}
            shortcut="S"
          >
            <span>Share</span>
          </Button>

          <Button
            id="receipt-print-btn"
            variant="primary"
            onClick={handlePrint}
            className="flex-1 sm:flex-[1.5] !h-10 sm:!h-11 !text-[13.5px] font-semibold min-w-0"
            icon={<Printer className="w-4 h-4 shrink-0" />}
            shortcut="↵"
          >
            <span className="truncate">Print</span>
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left Column: Mobile App Inspired Thermal Receipt Slip */}
        <div className="md:col-span-6 lg:col-span-7 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              {paperLabel} ({paperWidthPx})
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              {(sale.items?.length || 1) <= 3 ? 'Full Preview' : `${sale.items?.length} Items`}
            </span>
          </div>

          <ReceiptScaler paperWidthPx={paperWidthPx} itemsCount={sale.items?.length || 1}>
            {renderReceiptBody()}
          </ReceiptScaler>
        </div>

        {/* Right Column: Checkout Summary, Customer Details & Actions */}
        <div className="md:col-span-6 lg:col-span-5 flex flex-col gap-3">
          {/* Sale Summary Card */}
          <div className="bg-neutral-50/90 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-lg p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Check className="w-3 h-3 mr-1" /> Paid & Completed
              </span>
              <span className="text-[12px] font-mono font-bold text-neutral-800 dark:text-neutral-200">
                #{sale.invoiceNumber || sale.id.slice(-6)}
              </span>
            </div>

            <div className="flex items-baseline justify-between border-t border-neutral-200/60 dark:border-white/[0.06] pt-2">
              <span className="text-[12px] font-medium text-neutral-500">Net Amount</span>
              <span className="text-xl font-bold font-mono text-neutral-900 dark:text-white tabular-nums">
                {formatCurrency(sale.total, ctx.settings.currency)}
              </span>
            </div>

            {(() => {
              const dcExtra = sale.extraCharges?.find((c: any) => Number(c.amount) > 0 && (c.name?.toUpperCase() === 'DC' || c.name?.toUpperCase()?.includes('DELIVERY')));
              const dcVal = dcExtra ? Number(dcExtra.amount) : (Number(sale.deliveryFee) || 0);
              if (dcVal > 0) {
                return (
                  <div className="flex items-center justify-between text-[11.5px] font-mono text-neutral-500 dark:text-neutral-400 pt-0.5">
                    <span>Delivery (DC)</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      +{formatCurrency(dcVal, ctx.settings.currency)}
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {sale.paymentMethod && (
              <div className="flex items-center justify-between text-[11.5px] font-mono text-neutral-500 dark:text-neutral-400 pt-0.5">
                <span>Payment Mode</span>
                <span className="capitalize font-bold text-neutral-800 dark:text-neutral-200">
                  {sale.paymentMethod === 'split' && sale.splitPayments && sale.splitPayments.length > 0
                    ? `Split (${sale.splitPayments.map((p: any) => `${p.method?.toUpperCase()}: ${formatCurrency(p.amount, ctx.settings.currency)}`).join(' + ')})`
                    : sale.paymentMethod}
                </span>
              </div>
            )}
          </div>

          {/* Customer & WhatsApp Direct */}
          {sale.customerPhone && (
            <div className="bg-neutral-50/90 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-neutral-900 dark:text-white truncate">
                  {sale.customerName || 'Walk-in Customer'}
                </p>
                <p className="text-[11px] font-mono text-neutral-500">{sale.customerPhone}</p>
              </div>
              <button
                type="button"
                onClick={handleWhatsAppRedirect}
                className="h-7.5 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-none"
                title="Send receipt via WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default ReceiptPrint;

