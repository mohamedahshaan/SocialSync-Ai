import React, { useState } from 'react';
import { AlertTriangle, Calendar, ShieldCheck, X } from 'lucide-react';
import { api } from '../../services/api';

export function CancelSubscriptionModal({ isOpen, onClose, subscription, planName, onCancelled }) {
  const [reason, setReason] = useState('Found another alternative');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal Window */}
        <div className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-white dark:bg-[#111827] p-6 sm:p-8 text-left align-middle shadow-2xl transition-all relative z-10 animate-fade-in border border-[#E2E8F0] dark:border-[#334155]">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#334155]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Cancel {planName || 'Paid'} Subscription</h3>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Stop automatic recurring renewals</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-lg p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-5 space-y-4 text-sm">
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

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0] dark:border-[#334155]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#283548] transition-colors"
            >
              Keep My Subscription
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
