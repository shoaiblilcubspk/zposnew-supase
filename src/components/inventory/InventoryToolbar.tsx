import { Plus, Upload, Download, Layers, Trash2, Printer } from 'lucide-react';
import { Button } from '../../shared/ui';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { SharedSearchBar } from '../../shared/modules/search-and-list';

interface InventoryToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  handleImportJSON: () => void;
  handleExportSelected: () => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (val: string) => void;
  selectedType: string;
  onTypeChange: (val: string) => void;
  sortBy: 'name' | 'stock' | 'price';
  sortOrder: 'asc' | 'desc';
  onSortChange: (by: 'name' | 'stock' | 'price', order: 'asc' | 'desc') => void;
  canManageStock: boolean;
  selectedCount: number;
  _filteredCount?: number;
  handleBulkDelete: () => void;
  onBulkEdit: () => void;
  onPrintBarcodes: () => void;
  onAddProduct: () => void;
  onScanClick: () => void;
  canViewExpiry?: boolean;
}

export function InventoryToolbar({
  searchTerm,
  onSearchChange,
  handleImportJSON,
  handleExportSelected,
  categories,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  sortBy,
  sortOrder,
  onSortChange,
  canManageStock,
  selectedCount,
  _filteredCount,
  handleBulkDelete,
  onBulkEdit,
  onPrintBarcodes,
  onAddProduct,
  onScanClick,
  canViewExpiry,
}: InventoryToolbarProps) {
  const typeFilterOptions = [
    { id: 'All', label: "All Items" },
    { id: 'standard', label: "Standard Products" },
    { id: 'variable', label: "Variable Products" },
    { id: 'services', label: "Service Items" },
    { id: 'serialized', label: "IMEI / Serialized" },
    ...(canViewExpiry ? [
      { id: 'expiring_soon', label: "Expiring Soon" },
      { id: 'expired', label: "Expired" }
    ] : [])
  ];

  return (
    <div className="relative z-30 bg-white dark:bg-surface p-2.5 rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Contextual Actions Grid */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 order-2 lg:order-1">
          {canManageStock && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => { onAddProduct(); }}
                className="col-span-2 sm:col-auto"
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                <span>{"Add Item"}</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={handleImportJSON} icon={<Upload className="h-3.5 w-3.5" />}>
                <span>{"Import"}</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportSelected} icon={<Download className="h-3.5 w-3.5" />}>
                <span>{"Export"}</span>
              </Button>
            </>
          )}
        </div>

        {/* Search Box — shared module (SharedSearchBar) */}
        <div className="flex-1 order-1 lg:order-2">
          <SharedSearchBar
            value={searchTerm}
            onChange={(val) => { onSearchChange(val); }}
            placeholder={"Search name, barcode, SKU..."}
            onScanClick={() => onScanClick()}
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex items-center gap-2 order-3 w-full xl:w-auto">
          <SearchableSelect
            options={categories.map(c => ({ id: c, label: c === 'All' ? "All" : c }))}
            value={selectedCategory}
            onChange={val => { onCategoryChange(val); }}
            placeholder={"Category"}
            label={"Category"}
          />
          <SearchableSelect
            options={typeFilterOptions}
            value={selectedType}
            onChange={val => { onTypeChange(val); }}
            placeholder={"Item Type"}
            label={"Type"}
          />
          <SearchableSelect
            options={[
              { id: 'name-asc', label: "Sort: A-Z" },
              { id: 'name-desc', label: "Sort: Z-A" },
              { id: 'stock-asc', label: "Stock: Low" },
              { id: 'stock-desc', label: "Stock: High" }
            ]}
            value={`${sortBy}-${sortOrder}`}
            onChange={val => {
              const [field, order] = val.split('-');
              onSortChange(field as 'name' | 'stock' | 'price', order as 'asc' | 'desc');
            }}
            placeholder={"Sort"}
            align="right"
          />
        </div>
      </div>

      {/* Bulk Actions Bar (Theme-adaptive for Light and Dark modes) */}
      {canManageStock && selectedCount > 0 && (
        <div className="flex items-center gap-2 mt-2.5 px-3 py-1.5 bg-neutral-100 dark:bg-surface border border-neutral-200 dark:border-white/[0.08] text-neutral-900 dark:text-white rounded-md overflow-x-auto scrollbar-hide shadow-none">
          <div className="flex items-center gap-1.5 pr-3 border-r border-neutral-200 dark:border-white/10 shrink-0">
            <span className="text-[12px] font-mono tabular-nums font-bold text-neutral-900 dark:text-white leading-none">{selectedCount}</span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">Selected</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={onBulkEdit} className="!text-neutral-700 dark:!text-neutral-200 hover:!bg-neutral-200/60 dark:hover:!bg-white/10">
              <Layers className="h-3.5 w-3.5" /> <span>Bulk Edit</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="!text-rose-600 dark:!text-rose-400 hover:!bg-rose-500/10">
              <Trash2 className="h-3.5 w-3.5" /> <span>Delete</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onPrintBarcodes} className="!text-emerald-600 dark:!text-emerald-400 hover:!bg-emerald-500/10">
              <Printer className="h-3.5 w-3.5" /> <span>Print Barcodes</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
