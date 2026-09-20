import { Sale, StockHistory, VariantStockHistory } from '../../types';
import { localDb, generateId } from '../localDb';
import { toRemoteVariantStockHistory, toRemoteStockHistory } from './mappers';

export async function collectSaleMovements(
  newSale: Sale,
  id: string,
  now: Date,
  skipStockEffects: boolean
): Promise<{
  movements: any[];
  historyQueue: Array<{ entity: string; histId: string; remote: any; opts: any }>;
  anyOversold: boolean;
}> {
  let anyOversold = false;
  const movements: any[] = [];
  const historyQueue: Array<{ entity: string; histId: string; remote: any; opts: any }> = [];

  for (let i = 0; i < newSale.items.length; i++) {
    const item = newSale.items[i];
    const product = await localDb.products.get(item.product.id);

     if (product && product.trackInventory) {
      // Fix: Preserve the original sign of quantity to support returns (which have negative qtys).
      const rawQty = Number(item.weight || item.quantity) || 0;
      const changeQty = -rawQty; // A sale (qty > 0) means stock goes down (-). A return (qty < 0) means stock goes up (+).
      const histType = rawQty < 0 ? 'return' : 'sale';
      // RULE: Allow negative stock — never block a sale on stock level
      const newStock = (product.stock || 0) - rawQty;
      if (newStock < 0) anyOversold = true;

      // Find variant cost fallback if applicable
      let baseCostFallback = Number(product.cost) || 0;
      if (item.selectedVariantId && product.variantData) {
        const variant = product.variantData.find(v => v.id === item.selectedVariantId);
        if (variant && variant.cost !== undefined && variant.cost > 0) {
          baseCostFallback = Number(variant.cost);
        }
      }

      // Calculate total Add-on costs
      let addonCostTotal = 0;
      if (item.addonItems && item.addonItems.length > 0) {
        for (const addonItem of item.addonItems) {
          const addonProduct = await localDb.products.get(addonItem.addon.addonProductId);
          if (addonProduct) {
            addonCostTotal += (Number(addonProduct.cost) || 0) * addonItem.quantity * Math.abs(rawQty);
          }
        }
      }

      // Simple cost calculation (no FIFO)
      const effectivePurchaseCost = (baseCostFallback * Math.abs(rawQty)) + addonCostTotal;

      newSale.items[i] = {
        ...item,
        purchaseCost: effectivePurchaseCost,
        fifoDetails: [] // Kept for backward compatibility but always empty now
      };

      // --- STOCK DEDUCTION ---
      if (!skipStockEffects) {
        // Update Product locally (cloud is updated via stock_history trigger)
        await localDb.products.update(product.id, {
          stock: newStock,
          updatedAt: now
        });

        // Log Stock History
        const histId = generateId();
        
        const histEntry: StockHistory = {
          id: histId,
          productId: product.id,
          changeQty: changeQty,
          type: histType,
          referenceId: id,
          note: `Sale ${newSale.invoiceNumber}${newSale.editedFromInvoice ? ' (Edit #' + newSale.editedFromInvoice + ')' : ''}`,
          balanceAfter: newStock,
          cashierName: newSale.cashier || 'System',
          createdAt: now,
          ...(newStock < 0 ? { wasOversold: true } : {}),
        };
        await localDb.stockHistory.add(histEntry);
        movements.push({
          id: histId,
          product_id: product.id,
          change_qty: changeQty,
          type: histType,
          note: `Sale ${newSale.invoiceNumber}${newSale.editedFromInvoice ? ' (Edit #' + newSale.editedFromInvoice + ')' : ''}`,
          variant_id: '',
          variant_label: '',
          cashier_name: newSale.cashier || 'System',
        });
        historyQueue.push({ entity: 'stock_history', histId, remote: toRemoteStockHistory(histEntry), opts: { batchId: id } });
      }

      // --- VARIANT-LEVEL STOCK DEDUCTION ---
      if (!skipStockEffects && item.selectedVariantId && product.variantData) {
        const variant = product.variantData.find(v => v.id === item.selectedVariantId);
        if (variant) {
          const newVariantStock = (variant.stock || 0) - rawQty;

          {
            // Update local variant data (cloud handled by variant_stock_history trigger)
            const updatedVariantData = product.variantData.map(v =>
              v.id === variant.id ? { ...v, stock: newVariantStock } : v
            );

            await localDb.products.update(product.id, {
              variantData: updatedVariantData,
              updatedAt: now
            });

            // Log variant stock history
            const vHistId = generateId();
            const vHistEntry: VariantStockHistory = {
              id: vHistId,
              productId: product.id,
              variantId: item.selectedVariantId,
              variantLabel: item.selectedVariantLabel || variant.cardTitle || variant.option1,
              changeQty: changeQty,
              type: histType as any,
              referenceId: id,
              note: `Sale ${newSale.invoiceNumber}${newSale.editedFromInvoice ? ' (Edit #' + newSale.editedFromInvoice + ')' : ''}`,
              balanceAfter: newVariantStock,
              cashierName: newSale.cashier || 'System',
              createdAt: now,
            };
            await localDb.variantStockHistory.add(vHistEntry);
            movements.push({
              id: vHistId,
              product_id: product.id,
              change_qty: changeQty,
              type: histType,
              note: `Sale ${newSale.invoiceNumber}${newSale.editedFromInvoice ? ' (Edit #' + newSale.editedFromInvoice + ')' : ''}`,
              variant_id: item.selectedVariantId,
              variant_label: item.selectedVariantLabel || variant.cardTitle || variant.option1,
              cashier_name: newSale.cashier || 'System',
            });
            historyQueue.push({ entity: 'variant_stock_history', histId: vHistId, remote: toRemoteVariantStockHistory(vHistEntry), opts: { batchId: id } });
          }
        }
      }

      // Add-on stock deduction is performed AFTER this if/else (see block
      // before FREE GIFT). It must NOT be gated by the PARENT's
      // trackInventory — only the ADD-ON product's own trackInventory gates it.
    } else if (product && !product.trackInventory) {
      // Find variant cost fallback if applicable
      let baseCostFallback = Number(product.cost) || 0;
      if (item.selectedVariantId && product.variantData) {
        const variant = product.variantData.find(v => v.id === item.selectedVariantId);
        if (variant && variant.cost !== undefined && variant.cost > 0) {
          baseCostFallback = Number(variant.cost);
        }
      }

      // Calculate total Add-on costs
      let addonCostTotal = 0;
      if (item.addonItems && item.addonItems.length > 0) {
        for (const addonItem of item.addonItems) {
          const addonProduct = await localDb.products.get(addonItem.addon.addonProductId);
          if (addonProduct) {
            addonCostTotal += (Number(addonProduct.cost) || 0) * addonItem.quantity * Math.abs(item.weight || item.quantity);
          }
        }
      }

      // Non-tracked product: still inject purchaseCost from product.cost (or variant cost) + addons for accurate reporting
      newSale.items[i] = {
        ...item,
        purchaseCost: (baseCostFallback * (item.weight || item.quantity)) + addonCostTotal,
        fifoDetails: []
      };
    }

    // --- ADD-ON STOCK DEDUCTION (runs for EVERY item, gated only by the ADD-ON
    // product's own trackInventory — NOT the parent's). Uses the parent's
    // effective quantity (weight||quantity) so weighted-item + add-on sale/refund
    // magnitudes always match and reconcile with the stock ledger. ---
    if (!skipStockEffects && item.addonItems && item.addonItems.length > 0) {
      const parentQty = Math.abs(Number(item.weight || item.quantity) || 0);
      for (const addonItem of item.addonItems) {
        const addonProduct = await localDb.products.get(addonItem.addon.addonProductId);
        if (addonProduct && addonProduct.trackInventory) {
          const addonQty = addonItem.quantity * parentQty;
          const newAddonStock = (addonProduct.stock || 0) - addonQty;
          if (newAddonStock < 0) anyOversold = true;

          await localDb.products.update(addonProduct.id, { stock: newAddonStock, updatedAt: now });

          const aHistId = generateId();
          const aHistEntry: StockHistory = {
            id: aHistId,
            productId: addonProduct.id,
            changeQty: -addonQty,
            type: 'sale',
            referenceId: id,
            note: `Add-on for Sale ${newSale.invoiceNumber} (${addonItem.addon.name})`,
            balanceAfter: newAddonStock,
            cashierName: newSale.cashier || 'System',
            createdAt: now,
            ...(newAddonStock < 0 ? { wasOversold: true } : {}),
          };
          await localDb.stockHistory.add(aHistEntry);
          movements.push({
            id: aHistId,
            product_id: addonProduct.id,
            change_qty: -addonQty,
            type: 'sale',
            note: `Add-on for Sale ${newSale.invoiceNumber} (${addonItem.addon.name})`,
            variant_id: '',
            variant_label: '',
            cashier_name: newSale.cashier || 'System',
          });
          historyQueue.push({ entity: 'stock_history', histId: aHistId, remote: toRemoteStockHistory(aHistEntry), opts: { batchId: id } });
        }
      }
    }
  }

  // --- FREE GIFT STOCK DEDUCTION (A6) ---
  // Free-gift items live on sale.freeGifts (NOT sale.items), so previously they never
  // deducted stock → phantom inventory drain + profit overstated by gift cost.
  // Deduct them here and record their cost for accurate COGS reporting.
  if (!skipStockEffects && newSale.freeGifts && newSale.freeGifts.length > 0) {
    for (const gift of newSale.freeGifts) {
      const gProduct = await localDb.products.get(gift.product?.id);
      if (!gProduct || !gProduct.trackInventory) continue;
      const gQty = Math.abs(gift.quantity || 1);
      const gNewStock = (gProduct.stock || 0) - gQty;
      if (gNewStock < 0) anyOversold = true;

      (gift as any).purchaseCost = (Number(gProduct.cost) || 0) * gQty;

      await localDb.products.update(gProduct.id, { stock: gNewStock, updatedAt: now });
      const gHistId = generateId();
      const gHistEntry: StockHistory = {
        id: gHistId,
        productId: gProduct.id,
        changeQty: -gQty,
        type: 'sale' as const,
        referenceId: id,
        note: `Free Gift — Sale ${newSale.invoiceNumber}`,
        balanceAfter: gNewStock,
        cashierName: newSale.cashier || 'System',
        createdAt: now,
        ...(gNewStock < 0 ? { wasOversold: true } : {}),
      };
      await localDb.stockHistory.add(gHistEntry);
      movements.push({
        id: gHistId,
        product_id: gProduct.id,
        change_qty: -gQty,
        type: 'sale',
        note: `Free Gift — Sale ${newSale.invoiceNumber}`,
        variant_id: '',
        variant_label: '',
        cashier_name: newSale.cashier || 'System',
      });
       historyQueue.push({ entity: 'stock_history', histId: gHistId, remote: toRemoteStockHistory(gHistEntry), opts: { batchId: id } });
    }
  }

  return { movements, historyQueue, anyOversold };
}
