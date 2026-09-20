import React from 'react';
import { TYPOGRAPHY } from './typography';
import { cn } from '../../lib/utils';

export interface FormFieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  labelRight?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  hint,
  error,
  required = false,
  className,
  labelRight,
  htmlFor,
  children,
}) => {
  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      {(label || labelRight) && (
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={htmlFor}
              className={cn(
                TYPOGRAPHY.label,
                required && 'after:content-["*"] after:ml-0.5 after:text-rose-500'
              )}
            >
              {label}
            </label>
          )}
          {labelRight && <div className="text-right">{labelRight}</div>}
        </div>
      )}
      <div>{children}</div>
      {hint && !error && <p className={TYPOGRAPHY.hint}>{hint}</p>}
      {error && <p className={TYPOGRAPHY.error}>{error}</p>}
    </div>
  );
};
