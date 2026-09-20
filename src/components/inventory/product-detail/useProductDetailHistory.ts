import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, Ban } from 'lucide-react';
import { localDb } from '../../../lib/localDb';
import { getSaleById } from '../../../lib/services/sales/salesRepository';
import { sonner } from '../../../lib/sonner';

export function useProductDetailHistory({
  productStockHistory,
  filterType,
  setFilterType: _setFilterType,
  historyPage,
  setHistoryPage: _setHistoryPage,
  setClickedRowId,
  setSelectedSale,
  HISTORY_PER_PAGE,
}: {
  productStockHistory: any[];
  filterType: 'ALL' | 'IN' | 'OUT' | 'ADJUST' | 'RETURN';
  setFilterType: (v: 'ALL' | 'IN' | 'OUT' | 'ADJUST' | 'RETURN') => void;
  historyPage: number;
  setHistoryPage: (v: number) => void;
  setClickedRowId: (v: string | null) => void;
  setSelectedSale: (v: any | null) => void;
  HISTORY_PER_PAGE: number;
}) {
  const movementHistory = useMemo(() => {
    const history: any[] = [];

    (productStockHistory as any[]).forEach(h => {
      const rawQty = Number(h.quantity !== undefined ? h.quantity : (h.changeQty !== undefined ? h.changeQty : 0));
      const typeUpper = String(h.type || '').toUpperCase();
      const refUpper = String(h.referenceType || '').toUpperCase();
      const note = (h.notes || h.note || '').toLowerCase();

      const isOut = rawQty < 0 || typeUpper === 'INVENTORY_OUT';
      const displayType: 'IN' | 'OUT' = isOut ? 'OUT' : 'IN';
      const displayQty = Math.abs(rawQty);

      let label = 'Stock Movement';
      let color = isOut ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold';
      let bg = isOut ? 'bg-rose-500/10' : 'bg-emerald-500/10';
      let icon = isOut ? ArrowUpRight : ArrowDownLeft;

      if (note.includes('edit')) {
        label = 'Sale Edited';
        color = 'text-purple-600 dark:text-purple-400 font-semibold';
        bg = 'bg-purple-500/10';
        icon = isOut ? ArrowUpRight : ArrowDownLeft;
      } else if (note.includes('delet') || note.includes('void')) {
        label = 'Sale Deleted / Reversal';
        color = 'text-rose-600 dark:text-rose-400 font-semibold';
        bg = 'bg-rose-500/10';
        icon = ArrowDownLeft;
      } else if (refUpper === 'SALE' || typeUpper === 'SALE' || note.includes('sale')) {
        label = 'POS Sale';
        color = 'text-rose-600 dark:text-rose-400 font-semibold';
        bg = 'bg-rose-500/10';
        icon = ArrowUpRight;
      } else if (refUpper === 'RETURN' || typeUpper === 'RETURN' || note.includes('return') || note.includes('refund')) {
        label = note.includes('partial') ? 'Partial Refund' : 'POS Return';
        color = 'text-amber-600 dark:text-amber-400 font-semibold';
        bg = 'bg-amber-500/10';
        icon = ArrowDownLeft;
      } else if (refUpper === 'PURCHASE' || typeUpper === 'RESTOCK' || typeUpper === 'STOCK_IN' || note.includes('purchase')) {
        label = 'Restock / Purchase';
        color = 'text-emerald-600 dark:text-emerald-400 font-semibold';
        bg = 'bg-emerald-500/10';
        icon = ArrowDownLeft;
      } else if (typeUpper === 'INITIAL' || note.includes('initial')) {
        label = 'Initial Stock';
        color = 'text-blue-600 dark:text-blue-400 font-semibold';
        bg = 'bg-blue-500/10';
        icon = ArrowDownLeft;
      } else if (refUpper === 'AUDIT' || typeUpper === 'AUDIT' || note.includes('audit')) {
        label = 'Stock Audit';
        color = 'text-cyan-600 dark:text-cyan-400 font-semibold';
        bg = 'bg-cyan-500/10';
        icon = isOut ? Ban : ArrowDownLeft;
      } else if (typeUpper === 'ADJUSTMENT' || refUpper === 'ADJUSTMENT' || note.includes('adjust')) {
        label = 'Adjustment';
        color = isOut ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold';
        bg = isOut ? 'bg-orange-500/10' : 'bg-amber-500/10';
        icon = isOut ? Ban : ArrowDownLeft;
      }

      const safeDate = h.createdAt
        ? (h.createdAt instanceof Date ? h.createdAt : new Date(typeof h.createdAt === 'number' ? h.createdAt : Number(h.createdAt)))
        : (h.timestamp ? (h.timestamp instanceof Date ? h.timestamp : new Date(Number(h.timestamp))) : new Date());

      const userDisplay = h.userId || h.cashierName || 'Admin';

      history.push({
        id: h.id,
        date: isNaN(safeDate.getTime()) ? new Date() : safeDate,
        type: displayType,
        label,
        qty: displayQty,
        reference: (h.referenceId ? String(h.referenceId).slice(-8).toUpperCase() : (h.notes ? h.notes.slice(0, 16) : '')),
        fullReference: h.referenceId,
        entity: userDisplay,
        user: userDisplay,
        notes: h.notes || h.note,
        icon,
        color,
        bg,
      });
    });

    const rawHistory = [...history];

    return rawHistory
      .filter(h => {
        if (filterType === 'ALL') return true;
        if (filterType === 'IN') return h.type === 'IN';
        if (filterType === 'OUT') return h.type === 'OUT';
        if (filterType === 'ADJUST') return h.label.includes('Adjust') || h.label.includes('Audit') || h.label.includes('Initial');
        if (filterType === 'RETURN') return h.label.includes('Return') || h.label.includes('Refund');
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [productStockHistory, filterType]);

  const totalHistoryPages = Math.ceil(movementHistory.length / HISTORY_PER_PAGE);
  const paginatedHistory = movementHistory.slice(
    (historyPage - 1) * HISTORY_PER_PAGE,
    historyPage * HISTORY_PER_PAGE
  );

  const handleRowClick = async (h: any) => {
    const isRetailTransaction = h.label?.includes('Sale') || h.label?.includes('Return');

    if (isRetailTransaction && h.fullReference) {
      const sale = (await getSaleById(h.fullReference)) || (await localDb.sales.get(h.fullReference));
      if (!sale) {
        sonner.error("This invoice has been deleted.");
        return;
      }
      setClickedRowId(h.id);
      setSelectedSale(sale);
    }
  };

  return {
    movementHistory, totalHistoryPages, paginatedHistory, handleRowClick,
  };
}
