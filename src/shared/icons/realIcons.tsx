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
 * Sourced directly from /public/Icons/ for high-end tactile UI chips, tabs & cards.
 * Single source of truth for all 3D icon assets & corresponding system vector icons.
 */
export const REAL_ICONS = {
  pos: '/Icons/Cart.webp',
  cart: '/Icons/Cart.webp',
  sales: '/Icons/Sales.webp',
  transactions: '/Icons/Sales.webp',
  expenses: '/Icons/Expenses.webp',
  inventory: '/Icons/Inventory.webp',
  customers: '/Icons/Customers.webp',
  discounts: '/Icons/Discounts.webp',
  reports: '/Icons/Reports.webp',
  reportOverview: encodeURI('/Icons/Reports overview.webp'),
  reportTab: encodeURI('/Icons/Reports overview.webp'),
  suppliers: '/Icons/Suppliers.webp',
  users: '/Icons/Users.webp',
  salesman: '/Icons/Users.webp',
  staff: '/Icons/Users.webp',
  settings: '/Icons/Settings.webp',
  generalSettings: encodeURI('/Icons/General settings.webp'),
  database: encodeURI('/Icons/Restore and backup.webp'),
  backup: encodeURI('/Icons/Restore and backup.webp'),
  device: encodeURI('/Icons/Device pair.webp'),
  devicePair: encodeURI('/Icons/Device pair.webp'),
  deals: '/Icons/Deals.png',
  bundles: '/Icons/Deals.png',
  media: '/Icons/Media.webp',
  product: '/Icons/Product.webp',
  productRestock: encodeURI('/Icons/Restock inventory.webp'),
  restock: encodeURI('/Icons/Restock inventory.webp'),
  categories: '/Icons/Categories.webp',
  groups: '/Icons/Categories.webp',
  receipt: encodeURI('/Icons/Recipt&printer.webp'),
  posMachine: encodeURI('/Icons/Pos machine.webp'),
  purchases: encodeURI('/Icons/Purchase history.webp'),
  purchaseHistory: encodeURI('/Icons/Purchase history.webp'),
  cashWallet: '/Icons/Cash.webp',
  cash: '/Icons/Cash.webp',
  cardWallet: '/Icons/Card.webp',
  card: '/Icons/Card.webp',
  bankWallet: '/Icons/Bank.webp',
  bank: '/Icons/Bank.webp',
  online: '/Icons/Bank.webp',
  split: encodeURI('/Icons/Split payment.webp'),
  splitWallet: encodeURI('/Icons/Split payment.webp'),
  lock: encodeURI('/Icons/Profile Lock.webp'),
  moon: encodeURI('/Icons/Moon dark theme.webp'),
  sun: encodeURI('/Icons/Sun light theme.webp'),
  refresh: '/Icons/Reports.webp',
  exit: '/Icons/Exit.webp',
  logout: '/Icons/Exit.webp',
  account: encodeURI('/Icons/Account and privacy.webp'),
  security: encodeURI('/Icons/Account and privacy.webp'),
  userGuide: encodeURI('/Icons/User guide.webp'),
  howTo: encodeURI('/Icons/User guide.webp'),
  more: encodeURI('/Icons/More menu.png'),
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

  if (effectiveMode === 'system') {
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
  }

  const pixel = typeof size === 'number' ? size : (PIXEL_SIZES[size] || PIXEL_SIZES.md);
  const src = REAL_ICONS[name] || REAL_ICONS.pos;

  return (
    <img
      src={src}
      alt={alt || name}
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
      draggable={false}
      {...props}
    />
  );
}
