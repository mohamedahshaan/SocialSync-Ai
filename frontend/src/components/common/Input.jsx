import React from 'react';

export function Input({
  label,
  error,
  helperText,
  icon: Icon,
  endAdornment,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs sm:text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1.5 transition-colors">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#475569] dark:text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={`w-full rounded-xl border ${
            error
              ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
              : 'border-[#E2E8F0] dark:border-[#334155] focus:ring-brand-500 focus:border-brand-500'
          } ${Icon ? 'pl-10' : 'pl-3.5'} ${endAdornment ? 'pr-11' : 'pr-3.5'} py-2.5 bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] text-sm shadow-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${className}`}
          {...props}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {endAdornment}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-[#475569] dark:text-[#CBD5E1]">{helperText}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  helperText,
  charCount,
  maxCharCount,
  className = '',
  id,
  rows = 4,
  ...props
}) {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] transition-colors">
            {label}
          </label>
        )}
        {maxCharCount && (
          <span className={`text-xs ${charCount > maxCharCount ? 'text-rose-500 font-bold' : 'text-[#475569] dark:text-slate-400'}`}>
            {charCount || 0} / {maxCharCount}
          </span>
        )}
      </div>
      <textarea
        id={inputId}
        rows={rows}
        className={`w-full rounded-xl border ${
          error
            ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
            : 'border-[#E2E8F0] dark:border-[#334155] focus:ring-brand-500 focus:border-brand-500'
        } p-3.5 bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] text-sm shadow-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all resize-y ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-[#475569] dark:text-[#CBD5E1]">{helperText}</p>}
    </div>
  );
}
export default Input;
