// AdminModal.tsx - Composant Modal optimisé pour l'interface admin
import React, { useEffect } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '../Button';

export interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closable?: boolean;
  className?: string;
}

export interface AdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export interface AdminFormModalProps extends Omit<AdminModalProps, 'footer'> {
  onSubmit: () => void;
  onCancel: () => void;
  submitText?: string;
  cancelText?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
}

const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  closable = true,
  className
}) => {
  // Gestion de l'ESC et du focus
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closable]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={closable ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        className={cn(
          'relative bg-white rounded-xl shadow-2xl w-full transition-all transform',
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || subtitle || closable) && (
          <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-200">
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600">
                  {subtitle}
                </p>
              )}
            </div>
            
            {closable && (
              <button
                onClick={onClose}
                className="ml-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  isLoading = false
}) => {
  const typeConfig = {
    danger: {
      icon: '⚠️',
      iconBg: 'bg-red-100 text-red-600',
      confirmVariant: 'danger' as const
    },
    warning: {
      icon: '⚠️',
      iconBg: 'bg-amber-100 text-amber-600',
      confirmVariant: 'primary' as const
    },
    info: {
      icon: 'ℹ️',
      iconBg: 'bg-blue-100 text-blue-600',
      confirmVariant: 'primary' as const
    }
  };

  const config = typeConfig[type];

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closable={!isLoading}
    >
      <div className="flex items-start gap-4">
        <div className={cn('p-3 rounded-full text-2xl', config.iconBg)}>
          {config.icon}
        </div>
        <div className="flex-1">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>
      </div>
      
      <div className="flex gap-3 mt-6">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
          className="flex-1"
        >
          {cancelText}
        </Button>
        <Button
          variant={config.confirmVariant}
          onClick={onConfirm}
          isLoading={isLoading}
          className="flex-1"
        >
          {confirmText}
        </Button>
      </div>
    </AdminModal>
  );
};

const AdminFormModal: React.FC<AdminFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onCancel,
  title,
  subtitle,
  size = 'md',
  children,
  submitText = 'Enregistrer',
  cancelText = 'Annuler',
  isSubmitting = false,
  submitDisabled = false,
  className
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitting && !submitDisabled) {
      onSubmit();
    }
  };

  const footer = (
    <div className="flex gap-3">
      <Button
        variant="secondary"
        onClick={onCancel}
        disabled={isSubmitting}
        className="flex-1"
      >
        {cancelText}
      </Button>
      <Button
        variant="primary"
        onClick={handleSubmit}
        isLoading={isSubmitting}
        disabled={submitDisabled}
        className="flex-1"
      >
        {submitText}
      </Button>
    </div>
  );

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      footer={footer}
      closable={!isSubmitting}
      className={className}
    >
      <form onSubmit={handleSubmit}>
        {children}
      </form>
    </AdminModal>
  );
};

AdminModal.displayName = 'AdminModal';
AdminConfirmModal.displayName = 'AdminConfirmModal';
AdminFormModal.displayName = 'AdminFormModal';

export { AdminModal, AdminConfirmModal, AdminFormModal };