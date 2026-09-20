import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { useCapsLock } from '../../hooks/useCapsLock';
import { CapsLockIndicator } from './CapsLockIndicator';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sizeVariant?: 'sm' | 'md' | 'lg';
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  hasError?: boolean;
  showCapsLockWarning?: boolean;
}

const sizeClasses = {
  sm: 'h-7 px-2.5 text-[12px]',
  md: 'h-9 px-3 text-[13px]',
  lg: 'h-10 px-3.5 text-[14px]',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  sizeVariant = 'md',
  prefixIcon,
  suffixIcon,
  hasError = false,
  showCapsLockWarning,
  className,
  disabled,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const isCapsLock = useCapsLock();
  const [isFocused, setIsFocused] = useState(false);

  const shouldShowCaps = isFocused && isCapsLock && (props.type === 'password' || showCapsLockWarning);

  return (
    <div className="relative flex items-center w-full">
      {prefixIcon && (
        <span className="absolute left-2.5 text-neutral-400 pointer-events-none flex items-center shrink-0">
          {prefixIcon}
        </span>
      )}
      <input
        ref={ref}
        disabled={disabled}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        className={cn(
          'w-full tracking-[-0.01em] rounded transition-colors duration-100 ease-out',
          'bg-white dark:bg-surface text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
          'border',
          hasError
            ? 'border-rose-500 focus:border-rose-500'
            : 'border-neutral-200 dark:border-white/[0.08] focus:border-primary',
          'focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-white/[0.02]',
          sizeClasses[sizeVariant],
          prefixIcon && 'pl-8',
          (suffixIcon || shouldShowCaps) && 'pr-8',
          className
        )}
        {...props}
      />
      {(suffixIcon || shouldShowCaps) && (
        <span className="absolute right-2.5 flex items-center gap-1.5 shrink-0">
          {shouldShowCaps && <CapsLockIndicator variant="icon-only" />}
          {suffixIcon}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
