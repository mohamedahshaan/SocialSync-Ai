import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Loader2, FileText } from 'lucide-react';

export function StatusBadge({ status, size = 'md' }) {
  const upper = (status || 'DRAFT').toUpperCase();

  const configs = {
    PUBLISHED: {
      label: 'Published',
      icon: CheckCircle2,
      style: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800 ring-emerald-500/20'
    },
    SCHEDULED: {
      label: 'Scheduled',
      icon: Clock,
      style: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200/80 dark:border-sky-800 ring-sky-500/20'
    },
    PUBLISHING: {
      label: 'Publishing',
      icon: Loader2,
      spin: true,
      style: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800 ring-amber-500/20'
    },
    PARTIALLY_PUBLISHED: {
      label: 'Partial Success',
      icon: AlertTriangle,
      style: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200/80 dark:border-purple-800 ring-purple-500/20'
    },
    FAILED: {
      label: 'Failed',
      icon: XCircle,
      style: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-800 ring-rose-500/20'
    },
    DRAFT: {
      label: 'Draft',
      icon: FileText,
      style: 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155] ring-slate-500/20'
    },
    PENDING: {
      label: 'Pending',
      icon: Clock,
      style: 'bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155]'
    },
    CONNECTED: {
      label: 'Connected',
      icon: CheckCircle2,
      style: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    },
    CONFIG_REQUIRED: {
      label: 'Configuration Required',
      icon: AlertTriangle,
      style: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800'
    },
    DISCONNECTED: {
      label: 'Not Connected',
      icon: XCircle,
      style: 'bg-slate-100 dark:bg-[#1E293B] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#334155]'
    }
  };

  const current = configs[upper] || configs.DRAFT;
  const Icon = current.icon;

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs ${current.style} ${sizeClasses} select-none transition-colors`}
    >
      <Icon className={`w-3.5 h-3.5 ${current.spin ? 'animate-spin' : ''}`} />
      <span>{current.label}</span>
    </span>
  );
}
export default StatusBadge;
