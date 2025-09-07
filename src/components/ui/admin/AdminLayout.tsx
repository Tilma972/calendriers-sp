// AdminLayout.tsx - Composants de mise en page pour l'interface admin
import React from 'react';
import { cn } from '@/shared/lib/utils';
import Link from 'next/link';

export interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
}

export interface AdminSectionProps {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export interface AdminGridProps {
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export interface AdminBreadcrumbsProps {
  items: { label: string; href?: string }[];
  className?: string;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  subtitle,
  icon,
  breadcrumbs,
  actions,
  className
}) => {
  return (
    <div className={cn('bg-white border-b border-gray-200 sticky top-0 z-10', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <AdminBreadcrumbs items={breadcrumbs} className="mb-4" />
          )}
          
          {/* Header Content */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {icon && (
                <div className="p-3 bg-red-50 rounded-xl text-red-600 text-2xl">
                  {icon}
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-gray-600 mt-1">{subtitle}</p>
                )}
              </div>
            </div>
            
            {actions && (
              <div className="flex items-center gap-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminSection: React.FC<AdminSectionProps> = ({
  title,
  subtitle,
  headerAction,
  children,
  className
}) => {
  return (
    <section className={cn('space-y-6', className)}>
      {(title || subtitle || headerAction) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            )}
            {subtitle && (
              <p className="text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {headerAction && (
            <div>{headerAction}</div>
          )}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
};

const AdminGrid: React.FC<AdminGridProps> = ({
  cols = 1,
  gap = 'md',
  children,
  className
}) => {
  const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  };

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8'
  };

  return (
    <div className={cn(
      'grid',
      colsClasses[cols],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
};

const AdminBreadcrumbs: React.FC<AdminBreadcrumbsProps> = ({
  items,
  className
}) => {
  return (
    <nav className={cn('flex items-center space-x-2 text-sm', className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <svg 
              className="w-4 h-4 text-gray-400" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
          )}
          
          {item.href ? (
            <Link
              href={item.href}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn(
              index === items.length - 1 
                ? 'text-gray-900 font-medium' 
                : 'text-gray-500'
            )}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Composant de container principal pour les pages admin
export interface AdminPageProps {
  children: React.ReactNode;
  className?: string;
}

const AdminPage: React.FC<AdminPageProps> = ({ children, className }) => {
  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {children}
    </div>
  );
};

// Composant de contenu principal
export interface AdminContentProps {
  children: React.ReactNode;
  className?: string;
}

const AdminContent: React.FC<AdminContentProps> = ({ children, className }) => {
  return (
    <main className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8', className)}>
      {children}
    </main>
  );
};

AdminPageHeader.displayName = 'AdminPageHeader';
AdminSection.displayName = 'AdminSection';
AdminGrid.displayName = 'AdminGrid';
AdminBreadcrumbs.displayName = 'AdminBreadcrumbs';
AdminPage.displayName = 'AdminPage';
AdminContent.displayName = 'AdminContent';

export { 
  AdminPageHeader, 
  AdminSection, 
  AdminGrid, 
  AdminBreadcrumbs,
  AdminPage,
  AdminContent
};