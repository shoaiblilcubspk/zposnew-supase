import React from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  XCircle,
  Settings,
  User,
  Users,
  ShoppingBag,
  ShoppingCart,
  Package,
  Tag,
  Hash,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  Gift,
  RefreshCw,
  Filter,
  Download,
  Upload,
  Printer,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  QrCode,
  HelpCircle,
  Phone,
  Mail,
  ArrowLeft,
  ArrowRight,
  Database,
  TrendingUp,
  TrendingDown,
  Camera,
  Layers,
  type LucideProps,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AppIconProps extends Omit<LucideProps, 'size'> {
  size?: IconSize | number;
  className?: string;
}

const sizeMap: Record<IconSize, string> = {
  xs: 'h-3 w-3',       // 12px
  sm: 'h-3.5 w-3.5',   // 14px
  md: 'h-4 w-4',       // 16px (Standard UI icon)
  lg: 'h-5 w-5',       // 20px (Card / metric icon)
  xl: 'h-6 w-6',       // 24px (Hero icon)
};

function createIcon(IconComponent: React.ComponentType<LucideProps>) {
  const WrappedIcon = React.forwardRef<SVGSVGElement, AppIconProps>(({ size = 'md', className, ...props }, ref) => {
    const sizeClass = typeof size === 'string' ? sizeMap[size] || sizeMap.md : undefined;
    const numericSize = typeof size === 'number' ? size : undefined;

    return (
      <IconComponent
        ref={ref}
        size={numericSize}
        className={cn(sizeClass, 'shrink-0', className)}
        {...props}
      />
    );
  });
  WrappedIcon.displayName = `AppIcon(${IconComponent.displayName || 'Icon'})`;
  return WrappedIcon;
}

// ── Standard Centralized Application Icons ───────────────────────────────────
export const SearchIcon = createIcon(Search);
export const PlusIcon = createIcon(Plus);
export const MinusIcon = createIcon(Minus);
export const TrashIcon = createIcon(Trash2);
export const EditIcon = createIcon(Edit2);
export const CheckIcon = createIcon(Check);
export const CheckCircleIcon = createIcon(CheckCircle2);
export const AlertIcon = createIcon(AlertCircle);
export const WarningIcon = createIcon(AlertTriangle);
export const InfoIcon = createIcon(Info);
export const CloseIcon = createIcon(X);
export const CloseCircleIcon = createIcon(XCircle);
export const SettingsIcon = createIcon(Settings);
export const UserIcon = createIcon(User);
export const UsersIcon = createIcon(Users);
export const ShoppingBagIcon = createIcon(ShoppingBag);
export const CartIcon = createIcon(ShoppingCart);
export const PackageIcon = createIcon(Package);
export const TagIcon = createIcon(Tag);
export const HashIcon = createIcon(Hash);
export const CalendarIcon = createIcon(Calendar);
export const ChevronDownIcon = createIcon(ChevronDown);
export const ChevronRightIcon = createIcon(ChevronRight);
export const ChevronLeftIcon = createIcon(ChevronLeft);
export const ChevronUpIcon = createIcon(ChevronUp);
export const GiftIcon = createIcon(Gift);
export const RefreshIcon = createIcon(RefreshCw);
export const FilterIcon = createIcon(Filter);
export const DownloadIcon = createIcon(Download);
export const UploadIcon = createIcon(Upload);
export const PrinterIcon = createIcon(Printer);
export const LockIcon = createIcon(Lock);
export const UnlockIcon = createIcon(Unlock);
export const EyeIcon = createIcon(Eye);
export const EyeOffIcon = createIcon(EyeOff);
export const QrCodeIcon = createIcon(QrCode);
export const HelpIcon = createIcon(HelpCircle);
export const PhoneIcon = createIcon(Phone);
export const MailIcon = createIcon(Mail);
export const ArrowLeftIcon = createIcon(ArrowLeft);
export const ArrowRightIcon = createIcon(ArrowRight);
export const DatabaseIcon = createIcon(Database);
export const TrendingUpIcon = createIcon(TrendingUp);
export const TrendingDownIcon = createIcon(TrendingDown);
export const CameraIcon = createIcon(Camera);
export const LayersIcon = createIcon(Layers);

// ── Real 3D / Rich Icons (from public/Icons/) ───────────────────────────────
export * from './realIcons';
