/**
 * src/shared/ui — the single standardized UI component library for all
 * non-POS routes.
 *
 * POS (`src/components/pos/**`) is completely excluded and keeps its own
 * markup. Components here accept `className` escape hatches for
 * page-specific tweaks.
 */
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export { Card, type CardProps, type CardVariant, type CardPadding } from './Card';
export { Badge, type BadgeProps, type BadgeTone, type BadgeSize, type BadgeVariant } from './Badge';
export { SegmentedControl, type SegmentedControlProps, type SegmentedOption } from './SegmentedControl';
export { ToggleSwitch, type ToggleSwitchProps } from './ToggleSwitch';
export { SubTabBar, type SubTabBarProps, type SubTab } from './SubTabBar';
export { ScrollableTabBar, type ScrollableTabBarProps } from './ScrollableTabBar';
export { Avatar, type AvatarProps, type AvatarSize, type AvatarShape } from './Avatar';
export {
  usePagination,
  Pagination,
  type PaginationProps,
} from './Pagination';
export {
  DateRangePicker,
  type DateRangePickerProps,
  type DateRangePreset,
} from './DateRangePicker';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { BottomSheet, type BottomSheetProps } from './BottomSheet';
export { Select, type SelectProps } from './Select';
export { Modal } from './Modal';
export { SearchableSelect, type SearchableSelectProps } from './SearchableSelect';
export { HelpTooltip } from './HelpTooltip';
export { Input, type InputProps } from './Input';
export { FormField, type FormFieldProps } from './FormField';
export { CapsLockIndicator, type CapsLockIndicatorProps } from './CapsLockIndicator';
export { TYPOGRAPHY, Text, type TypographyVariant, type TextProps } from './typography';
export { RealIcon, REAL_ICONS, type RealIconName, type RealIconProps } from '../icons/realIcons';
