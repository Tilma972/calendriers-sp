import React from 'react';
import { cn } from '@/shared/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  className,
  variant = 'default',
  padding = 'md',
  children,
  ...props
}, ref) => {
  
  const baseClasses = 'bg-white transition-all duration-200';
  
  const variantClasses = {
    default: 'rounded-xl border border-gray-200 shadow-sm',
    elevated: 'rounded-xl border border-gray-200 shadow-lg hover:shadow-xl',
    bordered: 'rounded-xl border-2 border-red-200 bg-red-50',
    ghost: 'rounded-xl'
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  );
});

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(({
  className,
  children,
  ...props
}, ref) => (
  <div
    className={cn('mb-4 pb-4 border-b border-gray-200', className)}
    ref={ref}
    {...props}
  >
    {children}
  </div>
));

const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(({
  className,
  children,
  ...props
}, ref) => (
  <div
    className={cn('space-y-4', className)}
    ref={ref}
    {...props}
  >
    {children}
  </div>
));

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(({
  className,
  children,
  ...props
}, ref) => (
  <div
    className={cn('mt-4 pt-4 border-t border-gray-200', className)}
    ref={ref}
    {...props}
  >
    {children}
  </div>
));

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardBody.displayName = 'CardBody';
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardBody, CardFooter };