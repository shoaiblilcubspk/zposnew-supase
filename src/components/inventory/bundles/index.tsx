import { useAppStore, useProductsStore, useSettingsStore } from '../../../stores';
import { useState } from 'react';
import { Plus, Gift, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Bundle, Product } from '../../../types';
import { sonner } from '../../../lib/sonner';
import { can } from '../../../lib/permissions';
import { bundlesService } from '../../../lib/services';
import { generateBarcodeValue } from '../../../utils/barcode';
import { Button, EmptyState } from '../../../shared/ui';
import { BarcodeGenerator, clearPersistedBarcodeState } from '../barcode';
import { BundleForm } from './BundleForm';
import { BundleCard } from './BundleCard';

/** Final customer price of a bundle (override price wins, else discount-from-base). */
function bundleFinalPrice(bundle: Bundle, products: Product[]): number {
  const total = (bundle.items || []).reduce((sum, bi) => {
    const p = products.find(pr => pr.id === bi.productId);
    return sum + (p ? p.price * bi.quantity : 0);
  }, 0);
  if (typeof bundle.overridePrice === 'number' && bundle.overridePrice > 0) return bundle.overridePrice;
  const disc = bundle.discountType === 'percentage'
    ? (total * bundle.discountValue) / 100
    : Math.min(bundle.discountValue, total);
  return Math.max(0, total - disc);
}

/** Build a Product-shaped record so a bundle can go through the shared Barcode Print Engine. */
function bundleToBarcodeProduct(bundle: Bundle, products: Product[]): Product {
  const barcode = bundle.barcode || generateBarcodeValue(bundle.name || 'Bundle');
  return {
    id: bundle.id,
    name: bundle.name,
    barcode,
    barcodeValue: barcode,
    price: bundleFinalPrice(bundle, products),
    category: 'Bundle',
  } as Product;
}

export function BundleManager() {
  const appSettings = useSettingsStore(s => s.settings);
  const appProducts = useProductsStore(s => s.products);
  const appBundles = useAppStore(s => s.bundles);

  const { profile } = useAuth();
  // RBAC matrix: bundles manage = admin|manager (manage_products)
  const canManage = can(profile?.role, 'manage_products');

  const [showForm, setShowForm] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);
  const [actionMenuBundleId, setActionMenuBundleId] = useState<string | null>(null);
  const [menuUpward, setMenuUpward] = useState(false);
  const [printBundle, setPrintBundle] = useState<Bundle | null>(null);

  const bundles = appBundles || [];

  const openPrintBarcode = (bundle: Bundle) => {
    clearPersistedBarcodeState();
    setPrintBundle(bundle);
  };

  const openCreate = () => {
    setEditingBundle(null);
    setShowForm(true);
  };

  const openEdit = (bundle: Bundle) => {
    setEditingBundle(bundle);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBundle(null);
  };

  const handleDelete = async (bundle: Bundle) => {
    const title = "Delete Bundle?";
    const desc = "\"{name}\" bundle will be permanently deleted.".replace('{name}', bundle.name);
    const result = await sonner.confirm(title, desc);
    if (!result.isConfirmed) return;
    try {
      await bundlesService.delete(bundle.id);
      useAppStore.getState().deleteBundle(bundle.id);
      sonner.success("Bundle deleted");
    } catch (err: any) {
      sonner.error(err.message || "Error deleting bundle");
    }
  };

  const handleToggleActive = async (bundle: Bundle) => {
    try {
      await bundlesService.update(bundle.id, { active: !bundle.active });
      useAppStore.getState().updateBundle({ ...bundle, active: !bundle.active, updatedAt: new Date() },);
      sonner.success(bundle.active ? "Bundle disabled" : "Bundle enabled");
    } catch (_err: any) {
      sonner.error("Error updating status");
    }
  };

  return (
    <>
      {/* ─── FORM MODE ─── */}
      {showForm && (
        <BundleForm
          editingBundle={editingBundle}
          products={appProducts}
          appSettings={appSettings}
          onClose={closeForm}
        />
      )}

      {/* ─── LIST MODE (always mounted, hidden when form is open) ─── */}
      {!showForm && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between pb-1 border-b border-neutral-200 dark:border-white/[0.08]">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">{"Bundles & Deals"}</h2>
              <p className="text-[12px] text-neutral-500 font-normal mt-0.5 leading-normal">
                <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">{bundles.length}</span> bundles · Access from "Bundles" chip in POS
              </p>
            </div>
            {canManage && (
              <Button
                size="sm"
                variant="primary"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={openCreate}
              >
                {"Create Bundle"}
              </Button>
            )}
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2.5 p-3 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md text-[12px] text-neutral-600 dark:text-neutral-400">
            <Gift className="h-4 w-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {"In POS ProductGrid, you will see a Bundles chip under category chips. Click it → click \"Add Bundle\" → all items will be added to the cart with prorated discounts."}
            </p>
          </div>

          {/* Bundle List */}
          {bundles.length === 0 ? (
            <EmptyState
              icon={<Gift className="h-8 w-8 text-neutral-400" />}
              title={"No Bundles & Deals Yet"}
              subtext={"Create your first bundle deal to start selling combos."}
              className="py-16 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none"
              action={canManage && (
                <Button size="sm" variant="primary" onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>
                  {"Create Bundle"}
                </Button>
              )}
            />
          ) : (
            <div className="space-y-3">
              {bundles.map(bundle => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  products={appProducts}
                  appSettings={appSettings}
                  isExpanded={expandedBundle === bundle.id}
                  onToggleExpand={() => setExpandedBundle(expandedBundle === bundle.id ? null : bundle.id)}
                  canManage={canManage}
                  onEdit={() => openEdit(bundle)}
                  onToggleActive={() => handleToggleActive(bundle)}
                  onDelete={() => handleDelete(bundle)}
                  onPrintBarcode={() => openPrintBarcode(bundle)}
                  actionMenuOpen={actionMenuBundleId === bundle.id}
                  menuUpward={menuUpward}
                  onToggleMenu={(bundleId, e) => {
                    const isOpen = actionMenuBundleId === bundleId;
                    if (!isOpen) {
                      const btn = e.currentTarget.getBoundingClientRect();
                      setMenuUpward(window.innerHeight - btn.bottom < 220);
                    }
                    setActionMenuBundleId(isOpen ? null : bundleId);
                  }}
                  onCloseMenu={() => { setActionMenuBundleId(null); setMenuUpward(false); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── BUNDLE BARCODE PRINT (shared Barcode Print Engine) ─── */}
      {printBundle && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-2 sm:p-6 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-[calc(0.5rem+env(safe-area-inset-bottom)+var(--bottom-nav-clearance))] md:pb-6">
          <div className="relative w-full max-w-6xl h-[90vh] bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 dark:border-white/[0.08]">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                {"Print Barcode"} — {printBundle.name}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setPrintBundle(null)} icon={<X className="h-4 w-4" />} />
            </div>
            <div className="flex-1 min-h-0">
              <BarcodeGenerator
                products={[bundleToBarcodeProduct(printBundle, appProducts)]}
                onClose={() => { clearPersistedBarcodeState(); setPrintBundle(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BundleManager;
