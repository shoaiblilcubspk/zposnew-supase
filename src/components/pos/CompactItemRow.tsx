import { ShoppingBagIcon } from '../../shared/icons';
import { TYPOGRAPHY } from '../../shared/ui/typography';
import { formatCurrency } from '../../lib/currencies';
import { ProductThumb } from '../../shared/ui/ProductThumb';

interface CompactItemRowProps {
  image?: string | null;
  name: string;
  price: string;
  subtitle?: string;
  discount?: string;
  hidePrice?: boolean;
  variant?: string;
  modifierInfo?: string;
  serialNumber?: string;
  className?: string;
  imageSize?: 'sm' | 'md';
  onClick?: () => void;
  children?: React.ReactNode;
  
  // Advanced props
  quantity?: number;
  modifiers?: any[];
  addons?: any[];
  toppings?: any[];
  displayToppings?: any[];
  sn?: string;
  index?: number;
  currency?: string;
}

const sizeMap = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
} as const;

export function CompactItemRow({
  image,
  name,
  price,
  subtitle,
  discount,
  hidePrice,
  variant,
  modifierInfo,
  serialNumber,
  className = '',
  imageSize = 'md',
  onClick,
  children,
  quantity,
  modifiers,
  addons,
  toppings,
  displayToppings,
  sn,
  index,
  currency = 'PKR'
}: CompactItemRowProps) {
  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {index !== undefined && (
        <span className={`flex items-center justify-center w-5 h-5 rounded-full bg-neutral-100 dark:bg-white/10 shrink-0 ${TYPOGRAPHY.kbd}`}>{index}</span>
      )}
      <div className={`${sizeMap[imageSize]} rounded-lg overflow-hidden bg-neutral-100 dark:bg-white/5 shrink-0 flex items-center justify-center aspect-square`}>
        <ProductThumb
          image={image}
          alt={name}
          fallback={<ShoppingBagIcon size={imageSize === 'sm' ? 'xs' : 'md'} className="text-neutral-400" />}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={TYPOGRAPHY.itemName}>
          {quantity !== undefined && quantity > 1 ? `${Math.abs(quantity)} × ` : ''}{name}
        </p>
        {variant && <p className={`${TYPOGRAPHY.itemVariant} mt-0.5`}>{variant}</p>}
        {modifierInfo && <p className={`${TYPOGRAPHY.itemModifier} mt-0.5`}>+{modifierInfo}</p>}
        {modifiers && modifiers.length > 0 && (
          <p className={`${TYPOGRAPHY.itemModifier} mt-0.5`}>
            + {modifiers.map((m: any) => `${quantity && Math.abs(quantity) > 1 ? Math.abs(quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * (quantity ? Math.abs(quantity) : 1), currency)})`).join(', ')}
          </p>
        )}
        {addons && addons.length > 0 && (
          <p className={`${TYPOGRAPHY.itemAddon} mt-0.5`}>
            + Add-ons: {addons.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * (quantity ? Math.abs(quantity) : 1)}x (${formatCurrency(a.subtotal * (quantity ? Math.abs(quantity) : 1), currency)})`).join(', ')}
          </p>
        )}
        {toppings && toppings.length > 0 && (
          <p className={`${TYPOGRAPHY.itemTopping} mt-0.5`}>
            + {toppings.map((t: any) => `${quantity && Math.abs(quantity) > 1 ? Math.abs(quantity) + 'x ' : ''}${t.name} (${formatCurrency(t.price * (quantity ? Math.abs(quantity) : 1), currency)})`).join(', ')}
          </p>
        )}
        {displayToppings && displayToppings.length > 0 && (
          <p className={`${TYPOGRAPHY.itemTopping} mt-0.5 opacity-80`}>
            + {displayToppings.map((t: any) => `${quantity && Math.abs(quantity) > 1 ? Math.abs(quantity) + 'x ' : ''}${t.name}`).join(', ')}
          </p>
        )}
        {(serialNumber || sn) && (
          <span className={`${TYPOGRAPHY.kbd} text-amber-700 dark:text-amber-400 bg-amber-500/15 border-amber-500/20 inline-block mt-0.5`}>
            SN: {serialNumber || sn}
          </span>
        )}
        {subtitle && <p className={`${TYPOGRAPHY.hint} mt-0.5`}>{subtitle}</p>}
        <div className="flex items-center gap-1.5 mt-0.5">
          {!hidePrice && (
            <span className={TYPOGRAPHY.money}>{price}</span>
          )}
          {discount && (
            <span className={`${TYPOGRAPHY.moneyRed} bg-rose-500/10 px-1.5 py-0.5 rounded leading-none text-[11px]`}>{discount}</span>
          )}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
