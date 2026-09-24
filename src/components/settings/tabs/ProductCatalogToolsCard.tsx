import React, { useState } from 'react';
import { Package, Download, Upload, FileArchive } from 'lucide-react';
import { Card, Button } from '../../../shared/ui';
import { ProductImportExportModal } from '../../inventory/ProductImportExportModal';
import { useProductsStore } from '../../../stores';

export function ProductCatalogToolsCard() {
  const [showModal, setShowModal] = useState(false);
  const products = useProductsStore(s => s.products);

  return (
    <Card className="p-5 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface shadow-none rounded-md space-y-4 text-[13px] tracking-[-0.01em]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <Package className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white text-[14px] leading-tight">
              Product Catalog Import & Export
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] font-mono mt-0.5">
              With/Without Photos • ZIP Archive • Excel • Clean JSON
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-300 w-fit">
          {products.length} Products in catalog
        </span>
      </div>

      <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-[12px]">
        Export catalog items with photos compressed inside an images directory (ZIP), or clean spreadsheet/JSON format. Imported images automatically save to the local content-addressed media store and sync with cloud storage.
      </p>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowModal(true)}
          icon={<Download className="w-3.5 h-3.5 text-emerald-500" />}
        >
          Export Catalog
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowModal(true)}
          icon={<Upload className="w-3.5 h-3.5 text-blue-500" />}
        >
          Import Catalog
        </Button>
      </div>

      {showModal && (
        <ProductImportExportModal
          open={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </Card>
  );
}
