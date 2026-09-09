import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'indigo' | 'purple' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  id?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  id
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full whitespace-nowrap';
  
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : 'px-2.5 py-1 text-xs sm:text-xs';

  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    error: 'bg-rose-50 text-rose-700 border border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
    outline: 'bg-transparent text-slate-600 border border-slate-300'
  }[variant];

  return (
    <span id={id} className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};
