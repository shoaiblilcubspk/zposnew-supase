import { CheckSquare, MinusSquare, Square, Package, Power, Trash2 } from 'lucide-react';
import { Button, Badge, Pagination } from '../../shared/ui';
import { BarcodePreview } from '../../shared/ui/BarcodePreview';
import { Product } from '../../types';
import { useSettingsStore } from '../../stores';
import { productsService } from '../../lib/services';
import { useProductsStore } from '../../stores';
import { formatCurrency } from '../../lib/currencies';
import { sonner } from '../../lib/sonner';
import { can } from '../../lib/permissions';
import { getExpiryStatus } from '../../utils/expiryUtils';

interface InventoryTableProps {
  paginatedProducts: Product[];
  selectedProductIds: string[];
  filteredProducts: Product[];
  handleSelectAll: () => void;
  handleSelectProduct: (id: string) => void;
  handleEditProduct: (product: Product) => void;
  handleDeleteProduct: (productId: string) => void;
  currentPage: number;
  totalPages: number;
  ITEMS_PER_PAGE: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  isAdmin: boolean;
  profile: any;
  canManageStock: boolean;
  canEditProduct: boolean;
  canViewExpiry?: boolean;
}

function ExpiryBadge({ expiryDate, alertDays }: { expiryDate: string; alertDays?: number }) {
  const exp = getExpiryStatus(expiryDate, alertDays);
  if (exp.status === 'expired') {
    return <Badge tone="danger" className="!bg-rose-500/10 !text-rose-600 dark:!text-rose-400 !border !border-rose-500/20 !px-1.5 !py-0.2 !rounded !text-[9px] !leading-none font-mono">Expired ({Math.abs(exp.daysRemaining)}d)</Badge>;
  }
  if (exp.status === 'expiring_soon') {
    return <Badge tone="warning" className="!bg-amber-500/10 !text-amber-600 dark:!text-amber-400 !border !border-amber-500/20 !px-1.5 !py-0.2 !rounded !text-[9px] !leading-none font-mono">Exp. in {exp.daysRemaining}d</Badge>;
  }
  return <Badge tone="neutral" className="!bg-neutral-100 dark:!bg-white/5 !text-neutral-500 !px-1.5 !py-0.2 !rounded !text-[9px] !leading-none font-mono">Exp: {expiryDate}</Badge>;
}

export function InventoryTable({
  paginatedProducts,
  selectedProductIds,
  filteredProducts,
  handleSelectAll,
  handleSelectProduct,
  handleEditProduct,
  handleDeleteProduct,
  currentPage,
  totalPages,
  ITEMS_PER_PAGE,
  onPageChange,
  onPageSizeChange,
  isAdmin,
  profile,
  canManageStock,
  canEditProduct,
  canViewExpiry,
}: InventoryTableProps) {
  const appSettings = useSettingsStore(s => s.settings);
  // RBAC: cost/profit figures are visible to admin|manager only (view_profit)
  const showCost = isAdmin || can(profile?.role, 'view_profit');

  return (
    <div className="bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden shadow-none flex flex-col sm:min-h-[calc(100vh-320px)] min-h-[280px]">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-neutral-50/50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
              <th className="p-4 w-12 cursor-pointer" onClick={handleSelectAll}>
                {selectedProductIds.length > 0 && selectedProductIds.length === filteredProducts.length
                  ? <CheckSquare className="h-5 w-5 text-primary" />
                  : selectedProductIds.length > 0
                    ? <MinusSquare className="h-5 w-5 text-emerald-400" />
                    : <Square className="h-5 w-5 text-gray-600" />}
              </th>
              <th className="p-4 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-left w-[32%]">{"Item"}</th>
              <th className="p-4 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-left hidden lg:table-cell w-[20%]">{"SKU / Identifier"}</th>
              <th className="p-4 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-center hidden lg:table-cell w-[14%]">{"Barcode"}</th>
              <th className="p-4 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-left w-[13%]">{"Price"}</th>
              <th className="p-4 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-center w-[11%]">{"Stock Status"}</th>
              <th className="p-4 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-right w-[10%]">{"Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-white/5">
            {paginatedProducts.map(product => (
              <tr key={product.id} className={`group hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors ${selectedProductIds.includes(product.id) ? 'bg-primary/5' : ''} ${!product.active ? 'opacity-50' : ''}`}>
                <td className="p-4 cursor-pointer" onClick={() => handleSelectProduct(product.id)}>
                  {selectedProductIds.includes(product.id) ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-gray-600" />}
                </td>
                <td className="p-4 text-left">
                  <div className="flex items-center gap-4 cursor-pointer group" onClick={() => handleEditProduct(product)}>
                    <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-900 rounded border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                      {product.image ? <img src={product.image} className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-neutral-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 dark:text-white text-[13px] tracking-[-0.01em] truncate max-w-[200px] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{product.name}</p>
                      <p className="text-[12px] text-neutral-600 dark:text-neutral-400 truncate">{product.category}{product.supplier ? ` · ${product.supplier}` : ''}</p>
                      {(product.isService || product.requireSerial || product.productType === 'variable' || (canViewExpiry && product.expiryDate)) && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {product.productType === 'variable' && <Badge tone="neutral" className="!bg-purple-500/10 !text-purple-600 dark:!text-purple-400 !px-1.5 !py-0.2 !rounded !text-[9px] !leading-none font-mono">Variable</Badge>}
                          {product.isService && <Badge tone="info" className="!bg-blue-500/10 !text-blue-500 !px-1.5 !py-0.2 !rounded !text-[9px] !leading-none font-mono">Service</Badge>}
                          {product.requireSerial && <Badge tone="warning" className="!bg-amber-500/10 !text-amber-500 !px-1.5 !py-0.2 !rounded !text-[9px] !leading-none font-mono">IMEI/SN</Badge>}
                          {canViewExpiry && product.expiryDate && <ExpiryBadge expiryDate={product.expiryDate} alertDays={product.expiryAlertDays} />}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="p-4 text-left font-mono text-[12px] text-neutral-700 dark:text-neutral-300 hidden lg:table-cell">
                  <div className="truncate max-w-[150px] xl:max-w-[180px]" title={product.sku}>
                    {product.sku}
                  </div>
                </td>
                <td className="p-4 text-center hidden lg:table-cell">
                  <div className="inline-flex justify-center w-full">
                    <BarcodePreview value={product.barcodeValue || product.barcode || ''} inline={true} />
                  </div>
                </td>
                <td className="p-4 text-left">
                  <p className="text-[13px] font-mono font-medium tabular-nums text-neutral-900 dark:text-white">{formatCurrency(product.price, appSettings.currency)}</p>
                  {showCost && <p className="text-[12px] font-mono text-neutral-600 dark:text-neutral-400">Cost: {formatCurrency(product.cost || 0, appSettings.currency)}</p>}
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    {product.trackInventory === false || product.stock >= 990000 ? (
                      <Badge tone="neutral" className="!bg-neutral-100 dark:!bg-white/10 !text-neutral-600 dark:!text-neutral-300 !px-1.5 !py-0.2 !rounded font-mono text-[11px]">∞</Badge>
                    ) : (
                      <Badge variant="soft" tone={product.stock <= 0 ? 'danger' : product.stock <= (product.minStock || 5) ? 'warning' : 'success'} className={`!px-1.5 !py-0.2 !rounded font-mono text-[11px] font-medium tabular-nums ${product.stock <= 0 ? '!bg-rose-500/10 !text-rose-600 dark:!text-rose-400 !border !border-rose-500/20' : product.stock <= (product.minStock || 5) ? '!bg-amber-500/10 !text-amber-600 dark:!text-amber-400 !border !border-amber-500/20' : '!bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400 !border !border-emerald-500/20'}`}>{product.stock}</Badge>
                    )}
                    {!product.active && <Badge tone="neutral" className="!bg-neutral-100 dark:!bg-white/10 !px-1.5 !py-0.2 !rounded !text-[9px] !text-neutral-500">Disabled</Badge>}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end items-center gap-1.5 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Enable / Disable Toggle */}
                    {canEditProduct && (
                      <Button
                        variant="ghost"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const updated = { id: product.id, active: !product.active, updatedAt: new Date() };
                            await productsService.update(product.id, updated);
                            useProductsStore.getState().updateProduct(updated);
                            sonner.success(updated.active ? 'Product enabled' : 'Product disabled');
                          } catch {
                            sonner.error('Failed to toggle product status');
                          }
                        }}
                        className={`!min-h-0 !h-7 !w-7 !p-0 !rounded ${product.active ? '!bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400' : '!bg-neutral-100 dark:!bg-white/10 !text-neutral-500'}`}
                        title={product.active ? 'Disable Product' : 'Enable Product'}
                        icon={<Power className="h-3.5 w-3.5" />}
                      />
                    )}
                    {canEditProduct && (
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(product.id);
                        }}
                        className="!min-h-0 !h-7 !w-7 !p-0 !rounded !bg-rose-500/10 !text-rose-600 hover:!bg-rose-500/20"
                        title="Delete Product"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Expert Density) */}
      <div className="lg:hidden p-3 sm:p-4 flex-1">
        {/* Select All on Mobile */}
        {paginatedProducts.length > 0 && (
          <div className="flex items-center justify-between mb-3 bg-neutral-50/50 dark:bg-white/[0.02] p-2 rounded">
            <Button
              variant="ghost"
              onClick={handleSelectAll}
              className="!min-h-0 !p-0 !bg-transparent !text-[11px] font-medium !text-neutral-600 dark:!text-neutral-400"
            >
              {selectedProductIds.length > 0 && selectedProductIds.length === filteredProducts.length
                ? <CheckSquare className="h-4 w-4 text-primary" />
                : selectedProductIds.length > 0
                  ? <MinusSquare className="h-4 w-4 text-emerald-400" />
                  : <Square className="h-4 w-4 text-neutral-400" />}
              Select All
            </Button>
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">{selectedProductIds.length} Selected</span>
          </div>
        )}
        {paginatedProducts.length === 0 ? (
          <div className="text-center py-10 text-neutral-500 text-[13px]">{"No products found"}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
            {paginatedProducts.map(product => (
              <div
                key={product.id}
                onClick={() => handleEditProduct(product)}
                className={`relative flex flex-col p-2.5 sm:p-4 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none transition-colors group ${selectedProductIds.includes(product.id) ? 'border-primary bg-primary/5' : ''}`}
              >
                {/* Selection Toggle */}
                <Button
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); handleSelectProduct(product.id); }}
                  className="absolute top-1.5 right-1.5 z-20 !min-h-0 !p-0 !bg-transparent"
                >
                  {selectedProductIds.includes(product.id) ? (
                    <div className="bg-primary rounded p-1">
                      <CheckSquare className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="bg-white/90 dark:bg-black/75 rounded p-1 border border-neutral-200 dark:border-white/20 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <Square className="h-3.5 w-3.5 text-neutral-400" />
                    </div>
                  )}
                </Button>

                <div className="flex flex-col gap-2.5">
                  <div className="aspect-square w-full bg-neutral-100 dark:bg-neutral-800 rounded flex items-center justify-center overflow-hidden border border-neutral-200 dark:border-white/[0.08] flex-shrink-0 relative">
                    {product.image ? (
                      <img src={product.image} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-neutral-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col">
                    <h3 className="font-semibold text-neutral-900 dark:text-white text-[13px] leading-tight truncate">
                      {product.name}
                    </h3>
                    <p className="text-[11.5px] text-neutral-600 dark:text-neutral-400 font-medium truncate mb-1">
                      {product.category}
                    </p>
                    {(product.isService || product.requireSerial || product.productType === 'variable' || !product.active || (canViewExpiry && product.expiryDate)) && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {product.productType === 'variable' && <Badge tone="neutral" className="!text-[10px] !bg-purple-500/10 !text-purple-600 dark:!text-purple-400">Variable</Badge>}
                        {product.isService && <Badge tone="info" className="!text-[10px]">Service</Badge>}
                        {product.requireSerial && <Badge tone="warning" className="!text-[10px]">IMEI / SN</Badge>}
                        {!product.active && <Badge tone="neutral" className="!text-[10px]">Disabled</Badge>}
                        {canViewExpiry && product.expiryDate && <ExpiryBadge expiryDate={product.expiryDate} alertDays={product.expiryAlertDays} />}
                      </div>
                    )}

                    <div className="mt-auto space-y-1 pt-1.5 border-t border-neutral-100 dark:border-white/[0.04]">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[13px] font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
                          {formatCurrency(product.price, appSettings.currency)}
                        </p>
                        <span className={`px-1.5 py-0.5 rounded text-[11.5px] font-mono tabular-nums font-semibold ${product.stock <= 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : product.stock <= (product.minStock || 5) ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200'}`}>
                          {product.trackInventory === false || product.stock >= 990000 ? '∞' : product.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto p-3 bg-white dark:bg-surface border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between gap-4">
        <p className="hidden sm:block text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
          Items {filteredProducts.length === 0 ? '0 of 0' : `${((currentPage - 1) * ITEMS_PER_PAGE) + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of ${filteredProducts.length}`}
        </p>
        <div className="flex items-center gap-1.5 ml-auto">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            onPageChange={(p) => { onPageChange(p); }}
            siblingCount={1}
            pageSize={ITEMS_PER_PAGE}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </div>
      
    </div>
  );
}
