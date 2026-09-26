import React, { useState, useRef } from 'react';
import { Download, Upload, FileArchive, FileJson, Sheet, CheckCircle2, Loader2 } from 'lucide-react';
import { Modal, Button } from '../../shared/ui';
import { exportProductsCatalog, importProductsCatalog } from '../../lib/services/products/productExportImport';
import { useProductsStore } from '../../stores';
import { sonner } from '../../lib/sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedProductIds?: string[];
  onImportComplete?: () => void;
}

export function ProductImportExportModal({ open, onClose, selectedProductIds = [], onImportComplete }: Props) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [withImages, setWithImages] = useState(false);
  const [format, setFormat] = useState<'json' | 'xlsx' | 'csv'>('json');
  const [exportScope, setExportScope] = useState<'all' | 'selected'>(selectedProductIds.length > 0 ? 'selected' : 'all');
  const [isProcessing, setIsProcessing] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const products = useProductsStore(s => s.products);

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      sonner.loading('Preparing product export...');
      const targetIds = exportScope === 'selected' ? selectedProductIds : undefined;
      const { blob, filename, count } = await exportProductsCatalog({
        productIds: targetIds,
        withImages,
        format: withImages ? 'zip' : format,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      sonner.dismissAll();
      sonner.success(`Exported ${count} products successfully!`);
      onClose();
    } catch (err: any) {
      sonner.dismissAll();
      sonner.error(err.message || 'Export failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      sonner.error('Please select a file to import');
      return;
    }

    setIsProcessing(true);
    try {
      sonner.loading('Reading & importing products...');
      const res = await importProductsCatalog(importFile, { skipDuplicates });
      
      // Reload products in Zustand store
      await useProductsStore.getState().loadProducts();
      if (onImportComplete) onImportComplete();

      sonner.dismissAll();
      sonner.success(`Import complete: ${res.importedCount} added, ${res.skippedCount} skipped`);
      onClose();
    } catch (err: any) {
      sonner.dismissAll();
      sonner.error(err.message || 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Product Catalog Import & Export" maxWidth="md">
      <div className="space-y-4 text-[13px] tracking-[-0.01em]">
        {/* Sub-tab navigation */}
        <div className="flex border-b border-neutral-200 dark:border-white/[0.08] gap-4 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-1 flex items-center gap-1.5 font-medium border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Export Products</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-1 flex items-center gap-1.5 font-medium border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-500" />
            <span>Import Products</span>
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="space-y-4 py-1">
            {/* Scope Selection */}
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Products to Export</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`h-9 px-3 rounded-md text-left flex items-center justify-between border transition-colors ${
                    exportScope === 'all'
                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <span>All Products ({products.length})</span>
                  {exportScope === 'all' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('selected')}
                  disabled={selectedProductIds.length === 0}
                  className={`h-9 px-3 rounded-md text-left flex items-center justify-between border transition-colors disabled:opacity-40 ${
                    exportScope === 'selected'
                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <span>Selected Items ({selectedProductIds.length})</span>
                  {exportScope === 'selected' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </button>
              </div>
            </div>

            {/* With Images Option */}
            <div className="p-3 bg-neutral-50 dark:bg-white/[0.03] rounded-md border border-neutral-200 dark:border-white/[0.08] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={withImages}
                  onChange={(e) => setWithImages(e.target.checked)}
                  className="rounded border-neutral-300 text-emerald-600 focus:ring-0 w-4 h-4"
                />
                <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <FileArchive className="w-4 h-4 text-purple-500" />
                  Include Images (Download ZIP Archive)
                </span>
              </label>
              <p className="text-[12px] text-neutral-500 pl-6 leading-relaxed">
                {withImages
                  ? 'Packs all product photos into an images/ directory inside a single compressed ZIP file.'
                  : 'Exports text metadata only (faster, lighter file for catalog editing).'}
              </p>
            </div>

            {/* Format Selection (Only when without images) */}
            {!withImages && (
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Export File Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'json', label: 'JSON Catalog', icon: FileJson, color: 'text-amber-500' },
                    { id: 'xlsx', label: 'Excel (.xlsx)', icon: Sheet, color: 'text-emerald-500' },
                    { id: 'csv', label: 'CSV (.csv)', icon: Sheet, color: 'text-blue-500' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormat(fmt.id as any)}
                      className={`h-9 px-2.5 rounded-md flex items-center gap-1.5 border transition-colors text-[12px] ${
                        format === fmt.id
                          ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold'
                          : 'border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <fmt.icon className={`w-3.5 h-3.5 ${fmt.color}`} />
                      <span>{fmt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-white/[0.08]">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExport}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                icon={isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              >
                {isProcessing ? 'Exporting...' : 'Download Export File'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {/* Import Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 dark:border-white/[0.15] hover:border-emerald-500 p-6 rounded-md text-center cursor-pointer transition-colors bg-neutral-50/50 dark:bg-white/[0.02]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.json,.xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setImportFile(f);
                }}
              />
              <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              {importFile ? (
                <div>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">{importFile.name}</p>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    {(importFile.size / 1024).toFixed(1)} KB • Click to change file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200">
                    Click to select Catalog File (.zip, .json, .xlsx, .csv)
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    ZIP files containing images will automatically save images to local media library
                  </p>
                </div>
              )}
            </div>

            {/* Skip duplicates */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded border-neutral-300 text-emerald-600 focus:ring-0 w-4 h-4"
              />
              <span className="text-neutral-700 dark:text-neutral-300 text-[12px]">
                Skip existing products if Name or Barcode matches
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-white/[0.08]">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImport}
                disabled={!importFile || isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                icon={isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              >
                {isProcessing ? 'Importing...' : 'Start Import'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
