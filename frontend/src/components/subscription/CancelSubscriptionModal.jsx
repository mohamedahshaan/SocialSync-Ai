import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Calendar, ShieldCheck, X } from 'lucide-react';
import { api } from '../../services/api';

export function CancelSubscriptionModal({ isOpen, onClose, subscription, planName, onCancelled }) {
  const [reason, setReason] = useState('Found another alternative');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent page background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPeriodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'the end of your current billing period';

  const handleConfirmCancel = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/subscriptions/cancel', { reason });
      if (res.success) {
        if (onCancelled) onCancelled(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to cancel subscription.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while processing cancellation.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))'
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity animate-fade-in"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Window */}
      <div
        className="w-full flex flex-col overflow-hidden rounded-3xl bg-white dark:bg-[#111827] text-left align-middle shadow-2xl transition-all relative z-10 animate-fade-in border border-[#E2E8F0] dark:border-[#334155]"
        style={{
          width: 'min(500px, calc(100vw - 32px))',
          maxHeight: 'calc(100dvh - 32px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (shrink-0) */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0 bg-white dark:bg-[#111827]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Cancel Auto-Renew ({planName || 'Paid'})</h3>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Stop automatic monthly recurring renewals on PayHere</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-lg p-1 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 text-sm">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Retention Notice */}
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold text-xs">
              <Calendar className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>Access Continues Until: {currentPeriodEnd}</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Your paid features, credit allowance, and connected accounts will remain fully accessible until{' '}
              <strong className="font-semibold text-amber-950 dark:text-amber-100">{currentPeriodEnd}</strong>. No future renewal
              charges will be billed to your payment method.
            </p>
          </div>

          {/* Reassurance Policy */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-2 text-xs text-[#475569] dark:text-[#CBD5E1]">
            <div className="flex items-center gap-2 text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
              <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Data & Connection Protection</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[#475569] dark:text-slate-400 text-[12px]">
              <li>Your connected social channels and publishing history will never be deleted.</li>
              <li>After your paid cycle ends, your account smoothly converts to the Free plan.</li>
              <li>You can reactivate your paid subscription anytime with a single click.</li>
            </ul>
          </div>

          {/* Cancellation Reason Feedback */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Please let us know why you are cancelling (optional):
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl px-3 py-2.5 text-[#0F172A] dark:text-[#F8FAFC] focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              <option value="Temporary break / no posts needed">Temporary break / no posts needed</option>
              <option value="Switching to a different workflow">Switching to a different workflow</option>
              <option value="Pricing / budget constraints">Pricing / budget constraints</option>
              <option value="Need features not yet supported">Need features not yet supported</option>
              <option value="Found another alternative">Found another alternative</option>
              <option value="Other reason">Other reason</option>
            </select>
          </div>
        </div>

        {/* Action Buttons Footer (shrink-0) */}
        <div className="shrink-0 px-6 py-4 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50/70 dark:bg-[#0B1120]/60 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#283548] transition-colors cursor-pointer"
          >
            Keep My Subscription
          </button>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Processing...' : 'Confirm & Stop Auto-Renew'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
