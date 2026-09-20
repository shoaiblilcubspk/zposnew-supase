import JsBarcode from 'jsbarcode';

export interface BarcodeOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  font?: string;
  textAlign?: string;
  textPosition?: string;
  textMargin?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
}

/**
 * Generates a CODE128 compatible barcode value formatted as ZP-{5-digit padded ID}
 */
export function generateBarcodeValue(
  productNameOrId?: string | number,
  _fallbackId?: string | number
): string {
  let namePart = 'PR';

  if (typeof productNameOrId === 'string' && productNameOrId.trim() !== '') {
    const trimmed = productNameOrId.trim();
    // Check if it looks like a UUID or a purely numeric ID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    const isNumeric = !isNaN(Number(trimmed));
    if (!isUuid && !isNumeric) {
      const words = trimmed.split(/[\s_-]+/).filter(w => w.length > 0);
      if (words.length >= 2) {
        // First letter of first two words (e.g. Denim Jeans -> DJ)
        namePart = (words[0][0] + words[1][0]).toUpperCase();
      } else if (words.length === 1 && words[0].length >= 2) {
        // First two letters of single word (e.g. Shirt -> SH)
        namePart = words[0].substring(0, 2).toUpperCase();
      } else if (words.length === 1) {
        namePart = (words[0][0] + 'X').toUpperCase();
      }
    }
  }

  // Ensure namePart only contains A-Z (fallback to PR if non-alpha)
  namePart = namePart.replace(/[^A-Z]/g, '');
  if (namePart.length < 2) {
    namePart = (namePart + 'PR').substring(0, 2);
  }

  // 6 random numbers to match user request (e.g. 123456)
  const randomNumbers = Math.floor(100000 + Math.random() * 900000).toString();
  
  return `${namePart}${randomNumbers}`;
}

/**
 * OCR / Scanner Normalizer
 * Normalizes common scanner misreads (O vs 0) and formats barcodes uniformly.
 */
export function normalizeBarcodeValue(val: string | undefined): string {
  if (!val) return '';
  return val
    .trim()
    .toUpperCase()
    .replace(/O/g, '0') // Common letter O to number 0 mistake
    .replace(/I/g, '1') // Common letter I to number 1 mistake
    .replace(/L/g, '1') // Common letter L to number 1 mistake
    .replace(/S/g, '5') // Common letter S to number 5 mistake
    .replace(/Z/g, '2') // Common letter Z to number 2 mistake
    .replace(/[^A-Z0-9-]/g, ''); // Keep only alphanumeric and hyphen
}

/**
 * Renders a CODE128 barcode onto an SVG or HTML element
 */
export function renderBarcodeSVG(
  value: string,
  elementOrId: string | SVGElement | HTMLElement,
  options?: BarcodeOptions
): void {
  try {
    if (!value) return;
    const target = typeof elementOrId === 'string'
      ? (elementOrId.startsWith('#') ? elementOrId : `#${elementOrId}`)
      : elementOrId;
      
    const safeValue = value ? value.replace(/[^\x20-\x7E]/g, '') : 'PR9999';
      
    JsBarcode(target as any, safeValue, {
      format: 'CODE128',
      width: 1.5,
      height: 60,
      fontSize: 12,
      displayValue: true,
      margin: 8,
      background: 'transparent',
      lineColor: 'currentColor',
      ...options
    });

    // Add viewBox dynamically for responsive scaling
    const svgEl = typeof elementOrId === 'string'
      ? (document.querySelector(target as string) as unknown as SVGSVGElement)
      : (elementOrId as unknown as SVGSVGElement);

    if (svgEl && svgEl.tagName && svgEl.tagName.toLowerCase() === 'svg') {
      const w = svgEl.getAttribute('width');
      const h = svgEl.getAttribute('height');
      if (w && h) {
        const widthVal = w.replace('px', '');
        const heightVal = h.replace('px', '');
        svgEl.setAttribute('viewBox', `0 0 ${widthVal} ${heightVal}`);
      }
    }
  } catch (err) {
    console.error('[Barcode] Failed to render SVG:', err);
  }
}

/**
 * Renders a CODE128 barcode to a PNG data URL
 */
export async function renderBarcodePNG(value: string, options?: BarcodeOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!value) {
        return reject(new Error('No barcode value provided'));
      }
      const safeValue = value ? value.replace(/[^\x20-\x7E]/g, '') : 'PR9999';
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, safeValue, {
        format: 'CODE128',
        width: 1.5,
        height: 60,
        fontSize: 12,
        displayValue: true,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
        ...options
      });
      resolve(canvas.toDataURL('image/png'));
    } catch (err) {
      reject(err);
    }
  });
}
