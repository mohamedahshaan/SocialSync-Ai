import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Loader2, Sparkles, FileText } from 'lucide-react';

export function StatusBadge({ status, size = 'md' }) {
  const upper = (status || 'DRAFT').toUpperCase();

  const configs = {
    PUBLISHED: {
      label: 'Published',
      icon: CheckCircle2,
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/20'
    },
    SCHEDULED: {
      label: 'Scheduled',
      icon: Clock,
      style: 'bg-sky-50 text-sky-700 border-sky-200/80 ring-sky-500/20'
    },
    PUBLISHING: {
      label: 'Publishing',
      icon: Loader2,
      spin: true,
      style: 'bg-amber-50 text-amber-700 border-amber-200/80 ring-amber-500/20'
    },
    PARTIALLY_PUBLISHED: {
      label: 'Partial Success',
      icon: AlertTriangle,
      style: 'bg-purple-50 text-purple-700 border-purple-200/80 ring-purple-500/20'
    },
    FAILED: {
      label: 'Failed',
      icon: XCircle,
      style: 'bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/20'
    },
    DRAFT: {
      label: 'Draft',
      icon: FileText,
      style: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/20'
    },
    PENDING: {
      label: 'Pending',
      icon: Clock,
      style: 'bg-slate-100 text-slate-600 border-slate-200'
    },
    CONNECTED: {
      label: 'Connected',
      icon: CheckCircle2,
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    CONFIG_REQUIRED: {
      label: 'Configuration Required',
      icon: AlertTriangle,
      style: 'bg-amber-50 text-amber-800 border-amber-300'
    },
    DISCONNECTED: {
      label: 'Not Connected',
      icon: XCircle,
      style: 'bg-slate-100 text-slate-500 border-slate-200'
    }
  };

  const current = configs[upper] || configs.DRAFT;
  const Icon = current.icon;

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs ${current.style} ${sizeClasses} select-none`}
    >
      <Icon className={`w-3.5 h-3.5 ${current.spin ? 'animate-spin' : ''}`} />
      <span>{current.label}</span>
    </span>
  );
}
