import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../../stores';
import { settingsService } from '../../../lib/services';
import { sonner } from '../../../lib/sonner';
import { AppSettings } from '../../../types';
import type { PaperSize } from './BarcodeCard';

const STORAGE_KEY = 'barcode_generator_settings';

const getStoredSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function useBarcodeSettings() {
  const appSettings = useSettingsStore(s => s.settings);
  const stored = getStoredSettings() || {};

  const [paperSize, setPaperSize] = useState<PaperSize>(stored.paperSize || (appSettings.barcodePaperSize as PaperSize) || 'A4');
  const [a4Columns, setA4Columns] = useState<number>(stored.a4Columns ?? appSettings.barcodeA4Columns ?? 3);
  const [a4Rows, setA4Rows] = useState<number>(stored.a4Rows ?? appSettings.barcodeA4Rows ?? 10);
  const [showPrice, setShowPrice] = useState<boolean>(stored.showPrice ?? appSettings.barcodeShowPrice ?? true);
  const [showName, setShowName] = useState<boolean>(stored.showName ?? appSettings.barcodeShowName ?? true);
  const [showSku, setShowSku] = useState<boolean>(stored.showSku ?? appSettings.barcodeShowSku ?? false);
  const [showCategory, setShowCategory] = useState<boolean>(stored.showCategory ?? appSettings.barcodeShowCategory ?? false);
  const [barcodeScale, setBarcodeScale] = useState<number>(stored.barcodeScale ?? appSettings.barcodeScale ?? 1.0);
  const [barcodeHeight, setBarcodeHeight] = useState<number>(stored.barcodeHeight ?? appSettings.barcodeHeight ?? 30);
  const [labelPadding, setLabelPadding] = useState<number>(stored.labelPadding ?? appSettings.barcodePadding ?? 8);
  const [labelBorder, setLabelBorder] = useState<boolean>(stored.labelBorder ?? appSettings.barcodeBorder ?? true);
  const [showBarcode, setShowBarcode] = useState<boolean>(stored.showBarcode ?? appSettings.barcodeShowBarcode ?? true);
  const [showQr, setShowQr] = useState<boolean>(stored.showQr ?? appSettings.barcodeShowQr ?? false);
  const [qrSize, setQrSize] = useState<number>(stored.qrSize ?? appSettings.barcodeQrSize ?? 30);
  const [nameLines, setNameLines] = useState<1 | 2>(stored.nameLines ?? (appSettings.barcodeNameLines as 1 | 2) ?? 1);
  const [barcodeFontSize, setBarcodeFontSize] = useState<number>(stored.barcodeFontSize ?? appSettings.barcodeFontSize ?? 8);
  const [contentScale, setContentScale] = useState<number>(stored.contentScale ?? appSettings.barcodeContentScale ?? 1.0);
  const [marginX, setMarginX] = useState<number>(stored.marginX ?? appSettings.barcodeMarginX ?? 0);
  const [marginY, setMarginY] = useState<number>(stored.marginY ?? appSettings.barcodeMarginY ?? 0);
  const [gapX, setGapX] = useState<number>(stored.gapX ?? appSettings.barcodeGapX ?? 0);
  const [gapY, setGapY] = useState<number>(stored.gapY ?? appSettings.barcodeGapY ?? 0);
  const [barcodeBarWidth, setBarcodeBarWidth] = useState<number>(stored.barcodeBarWidth ?? appSettings.barcodeBarWidth ?? 0.8);
  const [barcodeZoom, setBarcodeZoom] = useState<number>(stored.barcodeZoom ?? 1.0);
  const [isSaving, setIsSaving] = useState(false);

  // Automatically persist all settings changes locally so they survive reload
  useEffect(() => {
    try {
      const stateToSave = {
        paperSize, a4Columns, a4Rows, showPrice, showName, showSku, showCategory,
        barcodeScale, barcodeHeight, labelPadding, labelBorder, showBarcode, showQr,
        qrSize, nameLines, barcodeFontSize, contentScale, marginX, marginY,
        gapX, gapY, barcodeBarWidth, barcodeZoom
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {
      // Ignore quota errors
    }
  }, [
    paperSize, a4Columns, a4Rows, showPrice, showName, showSku, showCategory,
    barcodeScale, barcodeHeight, labelPadding, labelBorder, showBarcode, showQr,
    qrSize, nameLines, barcodeFontSize, contentScale, marginX, marginY,
    gapX, gapY, barcodeBarWidth, barcodeZoom
  ]);

  const saveAsDefault = async () => {
    try {
      setIsSaving(true);
      const s: Partial<AppSettings> = {
        barcodePaperSize: paperSize, barcodeA4Columns: a4Columns, barcodeA4Rows: a4Rows,
        barcodeShowPrice: showPrice, barcodeShowName: showName, barcodeShowSku: showSku,
        barcodeShowCategory: showCategory, barcodeScale, barcodeHeight,
        barcodePadding: labelPadding, barcodeBorder: labelBorder, 
        barcodeShowBarcode: showBarcode, barcodeShowQr: showQr, barcodeQrSize: qrSize,
        barcodeNameLines: nameLines, barcodeFontSize, barcodeContentScale: contentScale,
        barcodeMarginX: marginX, barcodeMarginY: marginY,
        barcodeGapX: gapX, barcodeGapY: gapY, barcodeBarWidth: barcodeBarWidth,
      };
      await settingsService.update(s);
      const prev = JSON.parse(localStorage.getItem('pos_advanced_settings') || '{}');
      localStorage.setItem('pos_advanced_settings', JSON.stringify({ ...prev, ...s }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...s, paperSize, a4Columns, a4Rows, showPrice, showName, showSku, showCategory,
        barcodeScale, barcodeHeight, labelPadding, labelBorder, showBarcode, showQr,
        qrSize, nameLines, barcodeFontSize, contentScale, marginX, marginY,
        gapX, gapY, barcodeBarWidth, barcodeZoom
      }));
      useSettingsStore.getState().setSettings(s);
      sonner.success('Settings saved as default!');
    } catch { sonner.error('Failed to save settings'); }
    finally { setIsSaving(false); }
  };

  return {
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
    isSaving, saveAsDefault,
    appSettings
  };
}
