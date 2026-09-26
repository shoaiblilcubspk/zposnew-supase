/**
 * ============================================================================
 * lineDiscount — SINGLE SOURCE OF TRUTH for per-line cart discount math
 * ============================================================================
 * Pure function (no hooks, no React). Mirrors the bill-level clamp in
 * calculateCart.ts so a per-line discount can NEVER exceed that line's own
 * gross — preventing a negative line subtotal that would leak into the bill
 * total and wipe out other lines' revenue (AGENTS.md §2.12).
 *
 * Used by every cart write site (add, quantity change, apply discount,
 * price edit) so all four stay consistent (§4, no duplication).
 * ============================================================================
 */

export interface LineDiscountResult {
  /** Clamped, signed discount amount (matches line sign for return mode). */
  discount: number;
  /** gross - discount (never flips sign due to an over-sized discount). */
  subtotal: number;
}

/**
 * @param effectivePrice unit price including toppings/add-ons/modifiers
 * @param quantity signed quantity (negative in return mode)
 * @param discountValue user-entered discount (percent or fixed amount)
 * @param discountType 'percentage' | 'fixed'
 */
export function computeLineDiscount(
  effectivePrice: number,
  quantity: number,
  discountValue: number,
  discountType: 'percentage' | 'fixed'
): LineDiscountResult {
  const price = Number(effectivePrice) || 0;
  const qty = Number(quantity) || 0;
  const gross = price * qty;

  const value = Number(discountValue) || 0;
  if (value <= 0 || qty === 0) {
    return { discount: 0, subtotal: gross };
  }

  const grossMagnitude = Math.abs(gross);
  const rawMagnitude =
    discountType === 'percentage'
      ? (grossMagnitude * Math.min(Math.max(value, 0), 100)) / 100
      : value;

  // Clamp to the line's own gross so the subtotal can never flip sign.
  const clampedMagnitude = Math.min(rawMagnitude, grossMagnitude);
  const sign = Math.sign(gross) || Math.sign(qty) || 1;
  const discount = sign * clampedMagnitude;

  return { discount, subtotal: gross - discount };
}
