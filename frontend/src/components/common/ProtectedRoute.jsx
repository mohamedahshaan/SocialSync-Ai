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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading SocialFlow AI...</p>
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
      <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
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
    <div className="py-16 px-4 flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white">
      <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
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
    <div className="py-12 px-4 flex flex-col items-center justify-center text-center rounded-2xl border border-rose-200 bg-rose-50/50">
      <div className="p-3 bg-rose-100 text-rose-600 rounded-full mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-rose-900 mb-1">{title}</h3>
      <p className="text-xs text-rose-600 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
