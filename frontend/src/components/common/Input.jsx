import React from 'react';

export function Input({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={`w-full rounded-xl border ${
            error
              ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
              : 'border-slate-200 focus:ring-brand-500 focus:border-brand-500'
          } ${Icon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2.5 bg-white text-slate-900 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
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
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        {maxCharCount && (
          <span className={`text-xs ${charCount > maxCharCount ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
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
            : 'border-slate-200 focus:ring-brand-500 focus:border-brand-500'
        } p-3.5 bg-white text-slate-900 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all resize-y ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
