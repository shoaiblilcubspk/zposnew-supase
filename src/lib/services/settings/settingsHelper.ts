/**
 * Settings Synchronization & Validation Helper
 * Authoritative separation of Store-wide Shareable settings vs Device-Local display preferences.
 */

export const SHAREABLE_SETTINGS_KEYS = [
  // Store Identity
  'storeName',
  'storeAddress',
  'storePhone',
  'storeEmail',
  'storeWebsite',
  'storeLogo',
  // Business Rules & Finance
  'taxRate',
  'taxId',
  'currency',
  'country',
  'invoicePrefix',
  'invoiceCounter',
  'invoicePadDigits',
  'retailEnabled',
  'wholesaleEnabled',
  'defaultSaleType',
  'enableExtraCharges',
  'allowNegativeStock',
  'refundApprovalThreshold',
  'soundEnabled',
  // Receipt Design & Branding
  'receiptTemplate',
  'receiptPaperSize',
  'receiptDensity',
  'receiptHeader',
  'receiptFooter',
  'receiptShowLogo',
  'receiptShowFooter',
  'receiptShowTax',
  'receiptShowDiscount',
  'receiptShowStoreName',
  'receiptShowStoreAddress',
  'receiptShowStorePhone',
  'receiptShowStoreEmail',
  'receiptShowCustomerName',
  'receiptShowCustomerPhone',
  'receiptShowNotes',
  'receiptShowBarcode',
  'receiptShowDeliveryAddress',
  'receiptShowQrCode',
  'receiptFontScale',
  'receiptFontBold',
  'receiptFontWeight',
  'receiptPaddingTop',
  'receiptPaddingBottom',
  'receiptPaddingLeft',
  'receiptPaddingRight',
  'receiptOffsetX',
  'receiptHeaderOffsetX',
  'receiptFooterOffsetX',
  // Barcode Print Configuration
  'barcodePaperSize',
  'barcodeA4Columns',
  'barcodeA4Rows',
  'barcodeShowPrice',
] as const;

export const DEVICE_LOCAL_SETTINGS_KEYS = [
  // Screen & Display Preferences — each terminal/monitor has its own setting
  'theme',              // Light / Dark / Auto (e.g. Counter 1 dark, Counter 2 light)
  'iconStyle',          // 3D Tactile vs System Icons
  'posGridColumns',     // POS product grid columns (depends on screen size)
  'interfaceMode',      // Touch POS mode vs Desktop keyboard mode
  'touchKeyboardEnabled', // Virtual on-screen keyboard (touchscreen terminal only)
  // Hardware attached to THIS specific machine
  'receiptPrinter',     // USB/Bluetooth receipt printer physically connected here
  'enableKotPrinter',   // Kitchen KOT printer connected to this terminal
  'autoSaveReceiptPng', // Auto-save receipt PNG to this machine's local folder
  'autoBackup',         // Local auto-backup to this machine's storage
] as const;

export function getStoreIdentityScore(s: any): number {
  if (!s) return 0;
  let score = 0;
  const phone = (s.storePhone || '').trim();
  const email = (s.storeEmail || '').trim();
  const address = (s.storeAddress || '').trim();
  const website = (s.storeWebsite || '').trim();
  const logo = (s.storeLogo || '').trim();

  if (phone && phone !== '+92 3XX XXXXXXX') score += 2;
  if (email && email !== 'contact@mystore.com' && !email.includes('mystore.com')) score += 2;
  if (address && address !== '123 Main Street' && !address.includes('Main Street')) score += 2;
  if (website && website !== 'www.mystore.com' && !website.includes('mystore.com')) score += 1;
  if (logo && !logo.includes('placeholder') && !logo.includes('default') && logo !== '/zaynahs-logo.svg') score += 1;

  return score;
}

export function isDefaultPlaceholderSettings(s: any): boolean {
  if (!s) return true;
  return getStoreIdentityScore(s) < 3;
}

export function mergeRemoteSettingsIntoLocal(local: any, remote: any): any {
  if (!remote) return local;
  const result = { ...(local || {}) };
  const localScore = getStoreIdentityScore(local);
  const remoteScore = getStoreIdentityScore(remote);
  // "Real" = has actual store contact info, not just a logo (score >= 3 means phone/email/address is real)
  const localIsReal = localScore >= 3;
  const remoteIsReal = remoteScore >= 3;

  let shouldApplyRemoteIdentity: boolean;
  if (!remoteIsReal && localIsReal) {
    // Remote is a placeholder/blank device — PROTECT local real store identity from being overwritten
    shouldApplyRemoteIdentity = false;
  } else if (remoteIsReal && !localIsReal) {
    // Remote has real store identity, local is placeholder — apply remote
    shouldApplyRemoteIdentity = true;
  } else {
    // Both are "real" OR both are "placeholder" → TIMESTAMP decides (newer explicit user action wins).
    // CRITICAL: updatedAt may be an ISO string (e.g. "2026-09-18T18:38:00.000Z") or a Unix number.
    // Number(isoString) = NaN → NaN >= NaN = FALSE → merge never applied! Use Date.parse() instead.
    const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
    const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;
    shouldApplyRemoteIdentity = remoteTime >= localTime;
  }

  if (shouldApplyRemoteIdentity) {
    // Apply ALL shareable fields — including explicit empty/null values (logo removal MUST propagate)
    for (const key of SHAREABLE_SETTINGS_KEYS) {
      if (remote[key] !== undefined) {
        result[key] = remote[key];
      }
    }
  } else {
    // Remote is placeholder — protect local store identity fields, but apply other business settings
    for (const key of SHAREABLE_SETTINGS_KEYS) {
      if ((['storeName', 'storePhone', 'storeEmail', 'storeWebsite', 'storeAddress', 'storeLogo'] as string[]).includes(key)) {
        continue; // Skip — local real identity is protected
      }
      if (remote[key] !== undefined) {
        result[key] = remote[key];
      }
    }
  }

  // Strictly preserve local device preferences — these NEVER sync across devices
  for (const key of DEVICE_LOCAL_SETTINGS_KEYS) {
    if (local?.[key] !== undefined) {
      result[key] = local[key];
    }
  }

  return result;
}
