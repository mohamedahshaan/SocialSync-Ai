import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, AlertTriangle, FolderOpen } from 'lucide-react';
import { Button } from './Button';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC]">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
        <p className="text-sm font-medium text-[#475569] dark:text-[#CBD5E1]">Loading SocialSync AI...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export function LoadingState({ message = 'Loading details...' }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-3" />
      <p className="text-sm font-medium text-[#475569] dark:text-[#CBD5E1]">{message}</p>
    </div>
  );
}

export function EmptyState({
  title = 'No items found',
  description = 'Get started by creating your first entry.',
  actionLabel,
  onAction,
  icon: Icon = FolderOpen
}) {
  return (
    <div className="py-16 px-4 flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827]">
      <div className="p-3 bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 rounded-2xl mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">{title}</h3>
      <p className="text-sm text-[#475569] dark:text-[#CBD5E1] max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load content. Please try again.',
  onRetry
}) {
  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center text-center rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
      <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-full mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-300 mb-1">{title}</h3>
      <p className="text-xs text-rose-600 dark:text-rose-400 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
