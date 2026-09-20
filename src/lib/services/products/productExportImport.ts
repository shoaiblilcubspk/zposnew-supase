/**
 * Product Catalog Import & Export Engine
 * Supports JSON, Excel/CSV, and ZIP archives containing embedded content-addressed images.
 */

import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { productsService } from '../productsService';
import { getImageData, saveImage } from '../../media/localImageStore';

export interface ExportProductsOptions {
  productIds?: string[];
  withImages?: boolean;
  format?: 'zip' | 'json' | 'xlsx' | 'csv';
}

export interface ImportProductsResult {
  totalFound: number;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

export async function exportProductsCatalog(options: ExportProductsOptions = {}): Promise<{
  blob: Blob;
  filename: string;
  count: number;
}> {
  const allProducts = await productsService.getAll();
  const targetProducts = options.productIds && options.productIds.length > 0
    ? allProducts.filter(p => options.productIds!.includes(p.id))
    : allProducts;

  const dateStr = new Date().toISOString().split('T')[0];

  // 1. With Images — Bundled in ZIP archive
  if (options.withImages) {
    const zip = new JSZip();
    zip.file('products.json', JSON.stringify({ version: '2.0', exportedAt: new Date().toISOString(), products: targetProducts }, null, 2));

    const imgFolder = zip.folder('images');
    const includedHashes = new Set<string>();

    for (const p of targetProducts) {
      const hash = (p as any).image_hash || (p.image?.startsWith('img_') ? p.image : null);
      if (hash && !includedHashes.has(hash)) {
        const data = await getImageData(hash);
        if (data && imgFolder) {
          imgFolder.file(`${hash}.webp`, data);
          includedHashes.add(hash);
        }
      }
    }

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    return {
      blob,
      filename: `Products_Catalog_With_Images_${dateStr}.zip`,
      count: targetProducts.length,
    };
  }

  // 2. Without Images — Excel (.xlsx)
  if (options.format === 'xlsx') {
    const rows = targetProducts.map(p => ({
      Name: p.name,
      Category: p.category || '',
      Price: p.price || 0,
      Cost: p.cost || 0,
      Stock: p.stock || 0,
      MinStock: p.minStock || 0,
      Barcode: p.barcode || p.barcodeValue || '',
      SKU: p.sku || '',
      Description: p.description || '',
      Unit: p.unit || 'piece',
      Active: p.active !== false ? 'Yes' : 'No',
      Service: p.isService ? 'Yes' : 'No',
      RequireSerial: p.requireSerial ? 'Yes' : 'No',
      Type: p.productType || 'single',
      ExpiryDate: p.expiryDate || '',
      ExpiryAlertDays: p.expiryAlertDays || 90,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return {
      blob,
      filename: `Products_Catalog_${dateStr}.xlsx`,
      count: targetProducts.length,
    };
  }

  // 3. Without Images — CSV (.csv)
  if (options.format === 'csv') {
    const rows = targetProducts.map(p => ({
      Name: p.name,
      Category: p.category || '',
      Price: p.price || 0,
      Cost: p.cost || 0,
      Stock: p.stock || 0,
      MinStock: p.minStock || 0,
      Barcode: p.barcode || p.barcodeValue || '',
      SKU: p.sku || '',
      Description: p.description || '',
      Unit: p.unit || 'piece',
      Active: p.active !== false ? 'Yes' : 'No',
      Service: p.isService ? 'Yes' : 'No',
      RequireSerial: p.requireSerial ? 'Yes' : 'No',
      Type: p.productType || 'single',
      ExpiryDate: p.expiryDate || '',
      ExpiryAlertDays: p.expiryAlertDays || 90,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csvString = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
    return {
      blob,
      filename: `Products_Catalog_${dateStr}.csv`,
      count: targetProducts.length,
    };
  }

  // 4. Default: Without Images — Clean JSON
  const jsonContent = JSON.stringify({
    version: '2.0',
    exportedAt: new Date().toISOString(),
    products: targetProducts,
  }, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  return {
    blob,
    filename: `Products_Catalog_${dateStr}.json`,
    count: targetProducts.length,
  };
}

export async function importProductsCatalog(
  file: File,
  options: { skipDuplicates?: boolean } = { skipDuplicates: true }
): Promise<ImportProductsResult> {
  const result: ImportProductsResult = { totalFound: 0, importedCount: 0, skippedCount: 0, errors: [] };
  let rawProducts: any[] = [];

  const fileName = file.name.toLowerCase();

  // A. ZIP Archive (With Images)
  if (fileName.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    let jsonEntry: JSZip.JSZipObject | null = null;

    zip.forEach((path, entry) => {
      if (!entry.dir && path.endsWith('.json')) jsonEntry = entry;
    });

    if (!jsonEntry) throw new Error('ZIP archive must contain a products.json file');

    const jsonText = await (jsonEntry as JSZip.JSZipObject).async('text');
    const parsed = JSON.parse(jsonText);
    rawProducts = parsed.products || parsed.data?.products || (Array.isArray(parsed) ? parsed : []);

    // Extract and save images from ZIP
    for (const [path, entry] of Object.entries(zip.files)) {
      if (!entry.dir && (path.includes('images/') || path.endsWith('.webp') || path.endsWith('.png') || path.endsWith('.jpg'))) {
        try {
          const imgBytes = await entry.async('uint8array');
          await saveImage(imgBytes, 'image/webp');
        } catch {}
      }
    }
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
    // B. Excel or CSV
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheet = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheet];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    rawProducts = rows.map(r => ({
      name: String(r.Name || r.name || '').trim(),
      category: String(r.Category || r.category || 'General').trim(),
      price: Number(r.Price || r.price || 0),
      cost: Number(r.Cost || r.cost || 0),
      stock: Number(r.Stock || r.stock || 0),
      minStock: Number(r.MinStock || r.minStock || 0),
      barcode: String(r.Barcode || r.barcode || '').trim(),
      sku: String(r.SKU || r.sku || '').trim(),
      unit: String(r.Unit || r.unit || 'piece').trim(),
      active: true,
    }));
  } else {
    // C. Clean JSON
    const text = await file.text();
    const parsed = JSON.parse(text);
    rawProducts = parsed.products || parsed.data?.products || (Array.isArray(parsed) ? parsed : []);
  }

  result.totalFound = rawProducts.length;
  if (result.totalFound === 0) return result;

  const existingProducts = await productsService.getAll();
  const existingNames = new Set(existingProducts.map(p => (p.name || '').toLowerCase().trim()));
  const existingBarcodes = new Set(existingProducts.map(p => (p.barcode || p.barcodeValue || '').trim()).filter(Boolean));

  for (const item of rawProducts) {
    if (!item.name || !String(item.name).trim()) continue;
    const nameKey = String(item.name).toLowerCase().trim();
    const barcodeKey = String(item.barcode || item.barcodeValue || '').trim();

    const isDuplicate = existingNames.has(nameKey) || (barcodeKey && existingBarcodes.has(barcodeKey));

    if (isDuplicate && options.skipDuplicates) {
      result.skippedCount++;
      continue;
    }

    try {
      const payload: any = {
        name: String(item.name).trim(),
        price: Number(item.price || 0),
        cost: Number(item.cost || 0),
        stock: Number(item.stock || 0),
        minStock: Number(item.minStock || 0),
        category: String(item.category || 'General').trim(),
        barcode: item.barcode || item.barcodeValue || undefined,
        sku: item.sku || undefined,
        unit: item.unit || 'piece',
        image: item.image || item.image_hash || undefined,
        image_hash: item.image_hash || item.image || undefined,
        active: item.active !== false,
      };
      await productsService.create(payload);
      result.importedCount++;
      existingNames.add(nameKey);
      if (barcodeKey) existingBarcodes.add(barcodeKey);
    } catch (err: any) {
      result.errors.push(`Failed to import "${item.name}": ${err.message}`);
    }
  }

  return result;
}
