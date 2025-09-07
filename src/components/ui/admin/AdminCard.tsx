// AdminCard.tsx - Composant Card optimisé pour l'interface admin
import React from 'react';
import { cn } from '@/shared/lib/utils';
import { Card, CardProps } from '../Card';

export interface AdminCardProps extends CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  isLoading?: boolean;
}

export interface AdminStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
}

const AdminCard = React.forwardRef<HTMLDivElement, AdminCardProps>(({
  className,
  title,
  subtitle,
  icon,
  headerAction,
  isLoading = false,
  children,
  ...props
}, ref) => {
  return (
    <Card
      className={cn('relative', className)}
      ref={ref}
      {...props}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-xl">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Header */}
      {(title || subtitle || icon || headerAction) && (
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-red-50 rounded-lg text-red-600 text-lg">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
          </div>
          {headerAction && (
            <div className="ml-4">{headerAction}</div>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className="space-y-4">
        {children}
      </div>
    </Card>
  );
});

const AdminStatCard = React.forwardRef<HTMLDivElement, AdminStatCardProps>(({
  title,
  value,
  icon,
  subtitle,
  trend,
  onClick,
  className,
  ...props
}, ref) => {
  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-lg transition-all duration-200 p-6',
        onClick && 'transform hover:scale-105',
        className
      )}
      onClick={onClick}
      ref={ref}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span className={cn(
                'text-xs font-medium px-2 py-1 rounded-full',
                trend.isPositive 
                  ? 'text-emerald-700 bg-emerald-100' 
                  : 'text-red-700 bg-red-100'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="ml-4 p-3 bg-red-50 rounded-full text-red-600 text-2xl">
          {icon}
        </div>
      </div>
    </Card>
  );
});

AdminCard.displayName = 'AdminCard';
AdminStatCard.displayName = 'AdminStatCard';

export { AdminCard, AdminStatCard };