import React from 'react';
import { cn } from '@/shared/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}, ref) => {
  
  const baseClasses = 'inline-flex items-center justify-center gap-1 font-medium transition-all duration-200 whitespace-nowrap';
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border border-gray-200',
    primary: 'bg-red-600 text-white shadow-sm', // SP primary red
    secondary: 'bg-gray-600 text-white shadow-sm', // SP secondary gray
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    danger: 'bg-red-100 text-red-800 border border-red-200',
    info: 'bg-blue-100 text-blue-800 border border-blue-200',
    outline: 'bg-transparent text-red-600 border-2 border-red-600 hover:bg-red-50'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs rounded-md',
    md: 'px-3 py-1.5 text-sm rounded-lg',
    lg: 'px-4 py-2 text-base rounded-xl'
  };

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

export { Badge };