import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  icon: Icon,
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none';

  const variants = {
    primary: 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white shadow-soft focus:ring-brand-500 border border-transparent',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm focus:ring-slate-400',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-soft focus:ring-rose-500 border border-transparent',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus:ring-slate-300',
    outline: 'bg-transparent border border-brand-500 text-brand-600 hover:bg-brand-50 focus:ring-brand-400'
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5'
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
}
