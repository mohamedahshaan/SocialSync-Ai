import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
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
  RefreshCw,
  History,
  FileText,
  Send,
  X,
  Printer,
  ChevronRight,
  Zap,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ChangePlanModal } from '../components/subscription/ChangePlanModal';
import { CancelSubscriptionModal } from '../components/subscription/CancelSubscriptionModal';

export function MyPlanPage() {
  const navigate = useNavigate();
  const { user: authUser, updateUser, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/subscriptions/me');
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.user && updateUser) {
          updateUser(res.data.user);
        }
        if (res.data.pendingCheckout?.reference) {
          api.post('/subscriptions/confirm-payment', { orderId: res.data.pendingCheckout.reference })
            .then((confirmRes) => {
              if (confirmRes?.success && confirmRes.data?.user) {
                if (updateUser) updateUser(confirmRes.data.user);
                if (refreshUser) refreshUser();
                window.dispatchEvent(new CustomEvent('socialsync:plan_updated', { detail: confirmRes.data.user }));
              }
            })
            .catch(() => {});
        }
      } else {
        setError(res.message || 'Failed to load subscription information.');
      }
    } catch (err) {
      setError(err.message || 'Error communicating with subscription service.');
    } finally {
      setLoading(false);
    }
  };

  const pollingTimerRef = useRef(null);

  const startPaymentPolling = (targetOrderId) => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    let attempts = 0;
    const maxActiveAttempts = 12;

    setActionSuccessMessage('Confirming your payment... Awaiting PayHere gateway confirmation');

    const poll = async () => {
      attempts++;
      try {
        const res = await api.post('/subscriptions/confirm-payment', { orderId: targetOrderId || undefined });
        if (res?.success && res.data?.user) {
          if (updateUser) updateUser(res.data.user);
          if (refreshUser) refreshUser();
          loadSubscriptionData();
          const planName = res.data.user.planName ||
            (res.data.user.plan === 'CREATOR' ? 'Creator' : res.data.user.plan === 'PROFESSIONAL' ? 'Professional' : res.data.user.plan);
          const credits = res.data.user.credits;
          setActionSuccessMessage(
            `Payment Successful — ${planName} Plan Activated (${credits} credits assigned)`
          );
          window.dispatchEvent(new CustomEvent('socialsync:plan_updated', { detail: res.data.user }));
          setTimeout(() => setActionSuccessMessage(''), 8000);
          return;
        }

        if (attempts < maxActiveAttempts) {
          setActionSuccessMessage(`Confirming your payment... Awaiting PayHere gateway confirmation (check ${attempts}/${maxActiveAttempts})`);
          const nextInterval = Math.min(2000 + (attempts * 250), 3500);
          pollingTimerRef.current = setTimeout(poll, nextInterval);
        } else {
          setActionSuccessMessage('Payment Confirmation Pending: PayHere is processing your transaction. Your plan will activate automatically once verified.');
          if (refreshUser) refreshUser();
          loadSubscriptionData();
          setTimeout(() => setActionSuccessMessage(''), 10000);
        }
      } catch (err) {
        if (attempts < maxActiveAttempts) {
          const nextInterval = Math.min(2000 + (attempts * 250), 3500);
          pollingTimerRef.current = setTimeout(poll, nextInterval);
        } else {
          setActionSuccessMessage('Payment Confirmation Pending: awaiting server confirmation from PayHere.');
          if (refreshUser) refreshUser();
          loadSubscriptionData();
          setTimeout(() => setActionSuccessMessage(''), 10000);
        }
      }
    };

    poll();
  };

  useEffect(() => {
    loadSubscriptionData();

    // Check for PayHere redirect parameters
    const searchParams = new URLSearchParams(window.location.search);
    const paymentStatus = searchParams.get('payment');
    const orderId = searchParams.get('order_id') || searchParams.get('orderId');

    if (orderId || paymentStatus === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      startPaymentPolling(orderId || null);
    } else if (paymentStatus === 'cancelled') {
      setActionSuccessMessage('Payment was cancelled. You have not been charged.');
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setActionSuccessMessage(''), 6000);
    }

    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, []);

  // Handle body scroll lock and Escape key dismissal for Receipt modal
  useEffect(() => {
    if (!selectedReceipt) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedReceipt(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedReceipt]);

  const handleCheckPaymentStatus = async (orderIdToVerify) => {
    setActionSuccessMessage('Checking payment status with database...');
    try {
      const res = await api.post('/subscriptions/confirm-payment', { orderId: orderIdToVerify });
      if (res?.success && res.data?.user) {
        if (updateUser) updateUser(res.data.user);
        if (refreshUser) refreshUser();
        loadSubscriptionData();
        const planName = res.data.user.planName ||
          (res.data.user.plan === 'CREATOR' ? 'Creator' : res.data.user.plan === 'PROFESSIONAL' ? 'Professional' : res.data.user.plan);
        const credits = res.data.user.credits;
        setActionSuccessMessage(res.message || `🎉 Payment successful! Your ${planName} plan is now active with ${credits} credits.`);
        window.dispatchEvent(new CustomEvent('socialsync:plan_updated', { detail: res.data.user }));
        setTimeout(() => setActionSuccessMessage(''), 10000);
      } else if (res?.status === 'CANCELLED' || res?.expired) {
        setActionSuccessMessage(res.message || 'Checkout session has expired or was cancelled. Your current plan remains unchanged.');
        if (refreshUser) refreshUser();
        loadSubscriptionData();
        setTimeout(() => setActionSuccessMessage(''), 8000);
      } else if (res?.status === 'FAILED') {
        setActionSuccessMessage(res.message || 'Payment transaction failed.');
        if (refreshUser) refreshUser();
        loadSubscriptionData();
        setTimeout(() => setActionSuccessMessage(''), 8000);
      } else {
        startPaymentPolling(orderIdToVerify);
      }
    } catch (err) {
      if (err?.status === 400 || err?.message?.includes('cancelled')) {
        setActionSuccessMessage('Payment checkout was cancelled.');
        if (refreshUser) refreshUser();
        loadSubscriptionData();
      } else {
        setActionSuccessMessage(err?.response?.data?.message || err?.message || 'Payment is still pending gateway verification.');
      }
      setTimeout(() => setActionSuccessMessage(''), 8000);
    }
  };

  const handleCancelPendingCheckout = async (orderIdToCancel) => {
    try {
      await api.post('/subscriptions/cancel-checkout', { orderId: orderIdToCancel });
      setActionSuccessMessage('Pending checkout session has been cancelled.');
      if (refreshUser) refreshUser();
      await loadSubscriptionData();
      setTimeout(() => setActionSuccessMessage(''), 6000);
    } catch (err) {
      setActionSuccessMessage(err?.message || 'Could not cancel checkout.');
      setTimeout(() => setActionSuccessMessage(''), 6000);
    }
  };

  const handlePlanChanged = (result) => {
    if (result?.user && updateUser) {
      updateUser(result.user);
    }
    setActionSuccessMessage(result?.message || 'Your subscription plan has been successfully updated.');
    if (refreshUser) refreshUser();
    loadSubscriptionData();
    setTimeout(() => setActionSuccessMessage(''), 6000);
  };

  const handleCancelled = (result) => {
    setActionSuccessMessage(result?.message || 'Subscription cancellation scheduled. Access continues until your period end.');
    if (refreshUser) refreshUser();
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
  const usage = data?.usage || { connectedAccounts: 0, maxAccounts: 2, isOverLimit: false, totalPosts: 0 };
  const billingHistory = data?.billingHistory || [];
  const planHistory = data?.planHistory || [];
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
            onClick={() => navigate('/packages')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white text-xs font-bold shadow-soft transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Change Plan</span>
          </button>
          {isPaid && !isCancellationScheduled && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold transition-all"
            >
              Cancel Auto-Renew
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
            onClick={() => navigate('/packages')}
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
                <span>Collage Studio:</span>
                <span className="font-bold text-slate-900">
                  {plan.hasCollageStudio ? 'Enabled' : 'Disabled'}
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
            onClick={() => navigate('/packages')}
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

      {/* Publishing History & Activity Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-brand-600 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Publishing History & Account Activity</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Preserved & Intact
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                All previously published posts, broadcast delivery records, and connected social accounts remain fully preserved and uninterrupted across all plan changes and upgrades.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Posts Published</span>
              <span className="text-base font-extrabold text-slate-800">{usage.totalPosts ?? 0}</span>
            </div>
            <button
              onClick={() => navigate('/posts')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>View Post History</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Plan History & Past Tiers Section ("Already Used Plans") */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-brand-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Plan History & Past Tiers</h3>
              <p className="text-xs text-slate-500">Record of current active subscription and previously used plans</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {planHistory.length} Record{planHistory.length === 1 ? '' : 's'}
          </span>
        </div>

        {planHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No previous plan switches recorded. You are currently on the initial {plan.name} plan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 font-semibold">Tier Plan</th>
                  <th className="py-3 px-3 font-semibold">Credits</th>
                  <th className="py-3 px-3 font-semibold">Source</th>
                  <th className="py-3 px-3 font-semibold">Date</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold">Reason / Audit Trail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {planHistory.map((ph) => {
                  const isActive = ph.isActive || !ph.endedAt;
                  const isTransition = ph.previousPlan && ph.previousPlan !== ph.plan;
                  const sourceLabel = ph.source === 'ADMIN_ACTION' || ph.changedById
                    ? 'Admin'
                    : ph.source === 'PAYHERE_PAYMENT'
                    ? 'PayHere'
                    : ph.source === 'SELF_REGISTRATION'
                    ? 'Signup'
                    : 'System';

                  return (
                    <tr key={ph.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            ph.plan === 'PROFESSIONAL'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : ph.plan === 'CREATOR'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isTransition ? `${ph.previousPlan} → ${ph.plan}` : ph.plan}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] font-semibold text-slate-700">
                        {ph.creditsBefore !== null && ph.creditsBefore !== undefined && ph.creditsAfter !== null && ph.creditsAfter !== undefined ? (
                          <span className="text-emerald-600 font-bold">
                            {ph.creditsBefore} → {ph.creditsAfter}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {sourceLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 text-[11px]">
                        {ph.startedAt
                          ? new Date(ph.startedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : '—'}
                      </td>
                      <td className="py-3.5 px-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Active Plan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                            Past Tier
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 text-[11px] max-w-xs truncate" title={ph.reason}>
                        {ph.reason || 'Plan transition recorded'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Billing & Invoice History Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-slate-700" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Billing History & Invoices</h3>
              <p className="text-xs text-slate-500">Record of verified monthly renewals, payments, and receipts</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {billingHistory.length} Invoice{billingHistory.length === 1 ? '' : 's'}
          </span>
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
                  <th className="py-3 px-3 font-semibold">Gateway</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billingHistory.map((item) => {
                  const isVerified = item.status === 'VERIFIED' || item.status === 'COMPLETED';
                  const isPending = item.status === 'PENDING';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-medium text-slate-800">
                        {item.reference}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        {new Date(item.date || item.createdAt).toLocaleDateString('en-US', {
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
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                        {item.gateway || 'PAYHERE'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isVerified
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isVerified && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <button
                              onClick={() => handleVerifyPendingCheckout(item.reference)}
                              className="text-amber-700 hover:text-amber-800 font-bold text-xs bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition-all cursor-pointer"
                            >
                              Verify Now
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedReceipt(item)}
                            className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <span>View Receipt</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Receipt Viewer Modal */}
      {selectedReceipt && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 transition-opacity animate-fade-in"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
            onClick={() => setSelectedReceipt(null)}
            aria-hidden="true"
          />

          {/* Modal Card */}
          <div
            className="relative z-10 bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col my-auto overflow-hidden animate-scale-up"
            style={{ width: 'min(520px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 32px)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-modal-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 sm:p-7 pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 id="receipt-modal-title" className="text-lg font-extrabold text-slate-900">Payment Receipt</h4>
                  <p className="text-xs text-slate-500 font-mono">Ref: {selectedReceipt.reference}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                aria-label="Close receipt modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 sm:p-7 pt-4 space-y-6 flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {selectedReceipt.status}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Subscription Tier:</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.plan} Plan</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="text-base font-extrabold text-slate-900">
                    {selectedReceipt.currency} {selectedReceipt.amount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Transaction Date:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(selectedReceipt.date || selectedReceipt.createdAt).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Payment Gateway:</span>
                  <span className="font-medium text-slate-800">{selectedReceipt.gateway || 'PayHere Sandbox'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Billed Account:</span>
                  <span className="font-medium text-slate-800">{authUser?.email || user.email || 'Subscriber'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 text-[11px] text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Official payment record verified and secured by SocialSync AI.</span>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="flex items-center justify-end gap-3 p-4 sm:px-7 sm:py-4 bg-slate-50/80 border-t border-slate-100 shrink-0">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
