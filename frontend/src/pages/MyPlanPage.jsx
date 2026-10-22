import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Receipt,
  Download,
  AlertTriangle,
  Gift,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { ChangePlanModal } from '../components/subscription/ChangePlanModal';
import { CancelSubscriptionModal } from '../components/subscription/CancelSubscriptionModal';

export function MyPlanPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/subscriptions/me');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load subscription information.');
      }
    } catch (err) {
      setError(err.message || 'Error communicating with subscription service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const handlePlanChanged = (result) => {
    setActionSuccessMessage(result.message || 'Your subscription plan has been successfully updated.');
    loadSubscriptionData();
    setTimeout(() => setActionSuccessMessage(''), 6000);
  };

  const handleCancelled = (result) => {
    setActionSuccessMessage(result.message || 'Subscription cancellation scheduled. Access continues until your period end.');
    loadSubscriptionData();
    setTimeout(() => setActionSuccessMessage(''), 6000);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const user = data?.user || {};
  const plan = data?.plan || { name: 'Free', type: 'FREE', priceLkr: 0, credits: 50, maxConnectedAccounts: 2 };
  const subscription = data?.subscription;
  const usage = data?.usage || { connectedAccounts: 0, maxAccounts: 2, isOverLimit: false };
  const billingHistory = data?.billingHistory || [];
  const allPlans = data?.allPlans || [];
  const gateway = data?.gateway;

  const isPaid = plan.type !== 'FREE';
  const status = subscription?.status || (plan.type === 'FREE' ? 'Free' : 'Active');
  const isCancellationScheduled = subscription?.cancelAtPeriodEnd || status === 'Cancellation Scheduled';

  // Format dates
  const nextBillingFormatted = subscription?.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'N/A';

  const periodEndFormatted = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'N/A';

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Subscription & Plan</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage your billing cycle, credits allowance, payment card, and tier limits.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsChangeModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-soft transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Change Plan</span>
          </button>
          {isPaid && !isCancellationScheduled && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold transition-all"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Cancellation Scheduled Alert Banner */}
      {isCancellationScheduled && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200/80 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Cancellation Scheduled</h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Your subscription will not renew. Your paid features, remaining credits, and limits remain
                fully active until <strong className="text-amber-950">{periodEndFormatted}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsChangeModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-sm"
          >
            Reactivate / Switch Plan
          </button>
        </div>
      )}

      {/* Account Limit Warning Banner (e.g. if downgraded) */}
      {usage.isOverLimit && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Connected Account Quota Exceeded: </span>
            <span>
              You have {usage.connectedAccounts} connected accounts, but your plan allows up to {usage.maxAccounts}.
              Please disconnect {usage.excessAccountsCount} account(s) to publish new posts or connect new channels.
            </span>
          </div>
        </div>
      )}

      {/* Primary Plan Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Current Tier & Status */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Tier</span>
              <span
                className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                  status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : status === 'Cancellation Scheduled'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : status === 'Past Due' || status === 'Payment Failed'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {status}
              </span>
            </div>

            <h3 className="text-2xl font-extrabold text-slate-900">{plan.name}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {isPaid
                ? `LKR ${plan.priceLkr?.toLocaleString()} per month recurring`
                : 'Free tier with standard limits'}
            </p>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Post Scheduling:</span>
                <span className="font-bold text-slate-900">
                  {plan.hasScheduling ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>AI Captions & Hashtags:</span>
                <span className="font-bold text-slate-900">
                  {plan.hasAiCaptions ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsChangeModalOpen(true)}
            className="mt-6 w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
          >
            Upgrade or Switch Tier
          </button>
        </div>

        {/* Card 2: Credits & Quotas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Credits & Usage</span>
              <Sparkles className="w-4 h-4 text-brand-600" />
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-brand-600">{user.credits || 0}</span>
              <span className="text-xs text-slate-400">credits balance</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Used whenever you publish or broadcast across social networks.
            </p>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Connected Channels:</span>
                  <span className={usage.isOverLimit ? 'text-rose-600 font-bold' : ''}>
                    {usage.connectedAccounts} / {usage.maxAccounts} max
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usage.isOverLimit ? 'bg-rose-500' : 'bg-brand-600'
                    }`}
                    style={{
                      width: `${Math.min(100, (usage.connectedAccounts / usage.maxAccounts) * 100)}%`
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Monthly Allocation:</span>
                <span className="font-bold text-slate-900">{plan.credits} credits</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-500 text-center">
            Credits roll into your ledger with full transaction audit logs.
          </div>
        </div>

        {/* Card 3: Billing & Payment Method */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billing & Payment</span>
              <CreditCard className="w-4 h-4 text-slate-600" />
            </div>

            {subscription?.paymentMethod ? (
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{subscription.paymentMethod.brand}</span>
                  <span className="text-emerald-400 font-mono text-[10px]">VERIFIED</span>
                </div>
                <p className="font-mono text-sm tracking-wider">
                  •••• •••• •••• {subscription.paymentMethod.last4}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>{subscription.paymentMethod.cardholderName}</span>
                  <span>
                    Exp: {subscription.paymentMethod.expMonth}/{subscription.paymentMethod.expYear}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-700">No payment method on file</p>
                <p className="text-[11px] text-slate-400">
                  {isPaid ? 'Card requirement pending' : 'Free tier requires no payment card'}
                </p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Next Billing Date:</span>
                <span className="font-bold text-slate-900">{nextBillingFormatted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Recurring Amount:</span>
                <span className="font-bold text-slate-900">
                  {isPaid ? `LKR ${plan.priceLkr?.toLocaleString()}` : 'LKR 0'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted recurring gateway tokens</span>
          </div>
        </div>
      </div>

      {/* Billing & Invoice History Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-slate-700" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Billing History & Invoices</h3>
              <p className="text-xs text-slate-500">Record of verified monthly renewals and plan transactions</p>
            </div>
          </div>
        </div>

        {billingHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No billing transactions recorded yet for this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 font-semibold">Reference</th>
                  <th className="py-3 px-3 font-semibold">Date</th>
                  <th className="py-3 px-3 font-semibold">Plan</th>
                  <th className="py-3 px-3 font-semibold">Amount</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billingHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-800">
                      {item.reference}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-700">
                      {item.plan}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {item.currency} {item.amount?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => alert(`Official Receipt Reference: ${item.reference}\nAmount: ${item.currency} ${item.amount}\nStatus: ${item.status}\nDate: ${new Date(item.createdAt).toLocaleString()}`)}
                        className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        <span>View</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Change Plan Modal */}
      <ChangePlanModal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
        currentPlan={plan.type}
        currentSubscription={subscription}
        allPlans={allPlans}
        connectedAccountsCount={usage.connectedAccounts}
        onPlanChanged={handlePlanChanged}
      />

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        subscription={subscription}
        planName={plan.name}
        onCancelled={handleCancelled}
      />
    </div>
  );
}
