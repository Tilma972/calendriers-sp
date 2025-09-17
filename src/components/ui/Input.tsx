import React from 'react';
import { cn } from '@/shared/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outlined';
  state?: 'default' | 'success' | 'error' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outlined';
  state?: 'default' | 'success' | 'error' | 'warning';
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  className,
  type = 'text',
  label,
  error,
  helperText,
  variant = 'default',
  state = 'default',
  size = 'md',
  leftIcon,
  rightIcon,
  disabled,
  ...props
}, ref) => {
  
  const finalState = error ? 'error' : state;
  
  const baseClasses = 'w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    default: 'border-2 bg-white',
    filled: 'border-2 border-transparent bg-gray-100 hover:bg-gray-50 focus:bg-white',
    outlined: 'border-2 bg-transparent'
  };
  
  const stateClasses = {
    default: 'border-gray-300 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-500 focus:border-green-600 focus:ring-green-500 bg-green-50',
    error: 'border-red-500 focus:border-red-600 focus:ring-red-500 bg-red-50',
    warning: 'border-amber-400 focus:border-amber-500 focus:ring-amber-400 bg-amber-50'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-3 text-base rounded-xl',
    lg: 'px-4 py-4 text-lg rounded-xl'
  };
  
  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const inputClasses = cn(
    baseClasses,
    variantClasses[variant],
    stateClasses[finalState],
    sizeClasses[size],
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    className
  );

  const messageColor = {
    default: 'text-gray-600',
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-amber-600'
  }[finalState];

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-900">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            <div className={iconSizeClasses[size]}>
              {leftIcon}
            </div>
          </div>
        )}
        <input
          type={type}
          className={inputClasses}
          ref={ref}
          disabled={disabled}
          aria-invalid={finalState === 'error'}
          aria-describedby={
            error ? `${props.id}-error` : 
            helperText ? `${props.id}-helper` : undefined
          }
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            <div className={iconSizeClasses[size]}>
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p id={`${props.id}-error`} className={cn('text-sm', messageColor)}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${props.id}-helper`} className={cn('text-sm', messageColor)}>
          {helperText}
        </p>
      )}
    </div>
  );
});

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className,
  label,
  error,
  helperText,
  variant = 'default',
  state = 'default',
  resize = 'vertical',
  disabled,
  ...props
}, ref) => {
  
  const finalState = error ? 'error' : state;
  
  const baseClasses = 'w-full px-4 py-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    default: 'border-2 bg-white rounded-xl',
    filled: 'border-2 border-transparent bg-gray-100 hover:bg-gray-50 focus:bg-white rounded-xl',
    outlined: 'border-2 bg-transparent rounded-xl'
  };
  
  const stateClasses = {
    default: 'border-gray-300 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-500 focus:border-green-600 focus:ring-green-500 bg-green-50',
    error: 'border-red-500 focus:border-red-600 focus:ring-red-500 bg-red-50',
    warning: 'border-amber-400 focus:border-amber-500 focus:ring-amber-400 bg-amber-50'
  };
  
  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize'
  };

  const textareaClasses = cn(
    baseClasses,
    variantClasses[variant],
    stateClasses[finalState],
    resizeClasses[resize],
    className
  );

  const messageColor = {
    default: 'text-gray-600',
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-amber-600'
  }[finalState];

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-900">
          {label}
        </label>
      )}
      <textarea
        className={textareaClasses}
        ref={ref}
        disabled={disabled}
        aria-invalid={finalState === 'error'}
        aria-describedby={
          error ? `${props.id}-error` : 
          helperText ? `${props.id}-helper` : undefined
        }
        {...props}
      />
      {error && (
        <p id={`${props.id}-error`} className={cn('text-sm', messageColor)}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${props.id}-helper`} className={cn('text-sm', messageColor)}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
Textarea.displayName = 'Textarea';

export { Input, Textarea };