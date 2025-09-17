// AdminTable.tsx - Composant Table responsive pour l'interface admin
import React from 'react';
import { cn } from '@/shared/lib/utils';

export interface Column<T = unknown> {
  key: string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface AdminTableProps<T = unknown> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (row: T, index: number) => void;
  selectedRows?: string[];
  onSelectRow?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  rowKey?: keyof T | ((row: T) => string);
}

export interface AdminTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface AdminTableFiltersProps {
  children: React.ReactNode;
  onReset?: () => void;
  className?: string;
}

const AdminTable = <T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  onRowClick,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  className,
  emptyMessage = "Aucune donnée disponible",
  emptyIcon = "📊",
  rowKey = "id",
  ...props
}: AdminTableProps<T>) => {
  
  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    const val = (row as unknown as Record<string, unknown>)[rowKey as string];
    return (typeof val === 'string' ? val : index.toString());
  };

  const isAllSelected = data.length > 0 && selectedRows.length === data.length;
  const isSomeSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(!isAllSelected);
    }
  };

  const handleSelectRow = (row: T, index: number) => {
    const id = getRowKey(row, index);
    const isSelected = selectedRows.includes(id);
    if (onSelectRow) {
      onSelectRow(id, !isSelected);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Chargement des données...</p>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center h-64 p-8">
          <div className="text-6xl mb-4 text-gray-300">{emptyIcon}</div>
          <p className="text-gray-500 text-center">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl shadow-sm overflow-hidden', className)} {...props}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Checkbox pour sélection multiple */}
              {onSelectRow && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => {
              const rowId = getRowKey(row, index);
              const isSelected = selectedRows.includes(rowId);
              
              return (
                <tr
                  key={rowId}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer',
                    isSelected && 'bg-red-50'
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {/* Checkbox pour sélection */}
                  {onSelectRow && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(row, index);
                        }}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => {
                const value = (row as unknown as Record<string, unknown>)[column.key as string];
                    const cellContent = column.render 
                            ? column.render(value, row, index)
                      : value;
                    
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          'px-6 py-4 whitespace-nowrap text-sm',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.className
                        )}
                      >
                          {typeof cellContent === 'string' || typeof cellContent === 'number' ? cellContent : cellContent as React.ReactNode}
                        </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminTableHeader: React.FC<AdminTableHeaderProps> = ({ children, className }) => (
  <div className={cn('bg-white rounded-lg shadow p-6 mb-6', className)}>
    {children}
  </div>
);

const AdminTableFilters: React.FC<AdminTableFiltersProps> = ({ 
  children, 
  onReset,
  className 
}) => (
  <div className={cn('space-y-4', className)}>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {children}
    </div>
    {onReset && (
      <div className="flex justify-start pt-4 border-t border-gray-200">
        <button
          onClick={onReset}
          className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Réinitialiser les filtres
        </button>
      </div>
    )}
  </div>
);

AdminTable.displayName = 'AdminTable';
AdminTableHeader.displayName = 'AdminTableHeader';
AdminTableFilters.displayName = 'AdminTableFilters';

export { AdminTable, AdminTableHeader, AdminTableFilters };