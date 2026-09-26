import React from 'react';
import { cn } from '../../lib/utils';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  ShoppingCart,
  History,
  TrendingDown,
  Package,
  Users,
  Percent,
  BarChart3,
  Truck,
  ShieldCheck,
  UserCheck,
  Settings,
  Sliders,
  Database,
  Smartphone,
  Gift,
  Layers,
  Camera,
  ClipboardList,
  Printer,
  Banknote,
  CreditCard,
  Building2,
  Lock,
  Moon,
  Sun,
  RefreshCw,
  LogOut,
  LucideIcon,
} from 'lucide-react';

/**
 * 🎨 Real 3D / Rich Icons Registry
 *
 * Icons are imported as bundled ES-module assets from `src/assets/icons/` so Vite
 * fingerprints them (content-hashed, cache-busted, guaranteed present in the build).
 * This replaces the previous fragile `/Icons/...` public string paths which broke on:
 *   - filenames containing spaces (`%20` not resolving on file:// / WebView), and
 *   - stale CDN caches serving old/404 responses (AGENTS.md §2.11, §2.12, §4.2).
 * Never reference `/public/Icons/*` string paths for UI chrome again — always import.
 */
import cartIcon from '../../assets/icons/cart.webp';
import salesIcon from '../../assets/icons/sales.webp';
import expensesIcon from '../../assets/icons/expenses.webp';
import inventoryIcon from '../../assets/icons/inventory.webp';
import customersIcon from '../../assets/icons/customers.webp';
import discountsIcon from '../../assets/icons/discounts.webp';
import reportsIcon from '../../assets/icons/reports.webp';
import reportsOverviewIcon from '../../assets/icons/reports-overview.webp';
import suppliersIcon from '../../assets/icons/suppliers.webp';
import usersIcon from '../../assets/icons/users.webp';
import settingsIcon from '../../assets/icons/settings.webp';
import generalSettingsIcon from '../../assets/icons/general-settings.webp';
import restoreBackupIcon from '../../assets/icons/restore-and-backup.webp';
import devicePairIcon from '../../assets/icons/device-pair.webp';
import dealsIcon from '../../assets/icons/deals.png';
import mediaIcon from '../../assets/icons/media.webp';
import productIcon from '../../assets/icons/product.webp';
import restockInventoryIcon from '../../assets/icons/restock-inventory.webp';
import categoriesIcon from '../../assets/icons/categories.webp';
import receiptPrinterIcon from '../../assets/icons/receipt-printer.webp';
import posMachineIcon from '../../assets/icons/pos-machine.webp';
import purchaseHistoryIcon from '../../assets/icons/purchase-history.webp';
import cashIcon from '../../assets/icons/cash.webp';
import cardIcon from '../../assets/icons/card.webp';
import bankIcon from '../../assets/icons/bank.webp';
import splitPaymentIcon from '../../assets/icons/split-payment.webp';
import profileLockIcon from '../../assets/icons/profile-lock.webp';
import moonThemeIcon from '../../assets/icons/moon-dark-theme.webp';
import sunThemeIcon from '../../assets/icons/sun-light-theme.webp';
import refreshIcon from '../../assets/icons/refresh.webp';
import exitIcon from '../../assets/icons/exit.webp';
import accountPrivacyIcon from '../../assets/icons/account-privacy.webp';
import userGuideIcon from '../../assets/icons/user-guide.webp';
import moreMenuIcon from '../../assets/icons/more-menu.png';

export const REAL_ICONS = {
  pos: cartIcon,
  cart: cartIcon,
  sales: salesIcon,
  transactions: salesIcon,
  expenses: expensesIcon,
  inventory: inventoryIcon,
  customers: customersIcon,
  discounts: discountsIcon,
  reports: reportsIcon,
  reportOverview: reportsOverviewIcon,
  reportTab: reportsOverviewIcon,
  suppliers: suppliersIcon,
  users: usersIcon,
  salesman: usersIcon,
  staff: usersIcon,
  settings: settingsIcon,
  generalSettings: generalSettingsIcon,
  database: restoreBackupIcon,
  backup: restoreBackupIcon,
  device: devicePairIcon,
  devicePair: devicePairIcon,
  deals: dealsIcon,
  bundles: dealsIcon,
  media: mediaIcon,
  product: productIcon,
  productRestock: restockInventoryIcon,
  restock: restockInventoryIcon,
  categories: categoriesIcon,
  groups: categoriesIcon,
  receipt: receiptPrinterIcon,
  posMachine: posMachineIcon,
  purchases: purchaseHistoryIcon,
  purchaseHistory: purchaseHistoryIcon,
  cashWallet: cashIcon,
  cash: cashIcon,
  cardWallet: cardIcon,
  card: cardIcon,
  bankWallet: bankIcon,
  bank: bankIcon,
  online: bankIcon,
  split: splitPaymentIcon,
  splitWallet: splitPaymentIcon,
  lock: profileLockIcon,
  moon: moonThemeIcon,
  sun: sunThemeIcon,
  refresh: refreshIcon,
  exit: exitIcon,
  logout: exitIcon,
  account: accountPrivacyIcon,
  security: accountPrivacyIcon,
  userGuide: userGuideIcon,
  howTo: userGuideIcon,
  more: moreMenuIcon,
} as const;

export type RealIconName = keyof typeof REAL_ICONS;

export const SYSTEM_ICONS: Record<RealIconName, LucideIcon> = {
  pos: ShoppingCart,
  cart: ShoppingCart,
  sales: History,
  transactions: History,
  expenses: TrendingDown,
  inventory: Package,
  customers: Users,
  discounts: Percent,
  reports: BarChart3,
  reportOverview: BarChart3,
  reportTab: BarChart3,
  suppliers: Truck,
  users: ShieldCheck,
  salesman: UserCheck,
  staff: ShieldCheck,
  settings: Settings,
  generalSettings: Sliders,
  database: Database,
  backup: Database,
  device: Smartphone,
  devicePair: Smartphone,
  deals: Gift,
  bundles: Layers,
  media: Camera,
  product: Package,
  productRestock: ClipboardList,
  restock: ClipboardList,
  categories: Layers,
  groups: Layers,
  receipt: Printer,
  posMachine: Printer,
  purchases: ClipboardList,
  purchaseHistory: ClipboardList,
  cashWallet: Banknote,
  cash: Banknote,
  cardWallet: CreditCard,
  card: CreditCard,
  bankWallet: Building2,
  bank: Building2,
  online: Building2,
  split: Layers,
  splitWallet: Layers,
  lock: Lock,
  moon: Moon,
  sun: Sun,
  refresh: RefreshCw,
  exit: LogOut,
  logout: LogOut,
  account: ShieldCheck,
  security: ShieldCheck,
  userGuide: Layers,
  howTo: Layers,
  more: Sliders,
};

export type RealIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;

export interface RealIconProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  name: RealIconName;
  size?: RealIconSize;
  className?: string;
  mode?: '3d' | 'system' | 'auto';
}

const PIXEL_SIZES: Record<string, number> = {
  xs: 20, // compact chips/badges
  sm: 26, // header page badges & small chips
  md: 36, // header tabs & standard sub-tabs
  lg: 48, // prominent sub-tabs & drawer cards
  xl: 60, // payment methods & wallet metric cards
  '2xl': 76, // hero displays
};

const SYSTEM_PIXEL_SIZES: Record<string, number> = {
  xs: 14,
  sm: 18,
  md: 20,
  lg: 24,
  xl: 30,
  '2xl': 38,
};

export function RealIcon({
  name,
  size = 'md',
  className,
  style,
  alt,
  mode = 'auto',
  ...props
}: RealIconProps) {
  const appIconStyle = useSettingsStore((s) => s.settings?.iconStyle) ||
    (typeof localStorage !== 'undefined'
      ? (localStorage.getItem('pos_icon_style') as '3d' | 'system')
      : '3d') ||
    '3d';

  const effectiveMode = mode === 'auto' ? appIconStyle : mode;

  const [imgFailed, setImgFailed] = React.useState(false);
  // Reset the failure flag if the icon name changes to a different asset.
  React.useEffect(() => { setImgFailed(false); }, [name]);

  const renderSystem = () => {
    const SystemComponent = SYSTEM_ICONS[name] || Package;
    const sysPixel = typeof size === 'number'
      ? Math.round(size * 0.55)
      : (SYSTEM_PIXEL_SIZES[size] || SYSTEM_PIXEL_SIZES.md);
    return (
      <SystemComponent
        size={sysPixel}
        className={cn('shrink-0 stroke-[2] transition-transform inline-block', className)}
      />
    );
  };

  // Explicit system mode, or graceful fallback when the bundled asset failed to load.
  if (effectiveMode === 'system' || imgFailed) {
    return renderSystem();
  }

  const pixel = typeof size === 'number' ? size : (PIXEL_SIZES[size] || PIXEL_SIZES.md);
  const src = REAL_ICONS[name] || REAL_ICONS.pos;

  return (
    <img
      src={src}
      alt={alt || name}
      onError={() => setImgFailed(true)}
      style={{
        width: `${pixel}px`,
        height: `${pixel}px`,
        minWidth: `${pixel}px`,
        minHeight: `${pixel}px`,
        maxWidth: `${pixel}px`,
        maxHeight: `${pixel}px`,
        objectFit: 'contain',
        ...style,
      }}
      className={cn(
        'shrink-0 select-none pointer-events-none inline-block filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.16)] dark:drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)] transition-transform duration-200 ease-out will-change-transform',
        className
      )}
      loading="eager"
      decoding="async"
      draggable={false}
      {...props}
    />
  );
}
