import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Check,
  X,
  CreditCard,
  Gift,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  Clock,
  Layers,
  ChevronDown,
  Info,
  CheckCircle2,
  TrendingUp,
  Flame,
  Crown,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ChangePlanModal } from '../components/subscription/ChangePlanModal';
import { CancelSubscriptionModal } from '../components/subscription/CancelSubscriptionModal';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export function PackagesPage() {
  const { user, refreshUser, updateUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [featureMatrix, setFeatureMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [selectedTargetPlan, setSelectedTargetPlan] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [paymentNotice, setPaymentNotice] = useState(null);
  const [isCheckingPending, setIsCheckingPending] = useState(false);

  const handleSelectPlanForChange = (plan) => {
    if (plan.planType === currentPlanType) return;
    setSelectedTargetPlan(plan);
    setIsChangeModalOpen(true);
  };

  const handleCloseChangeModal = () => {
    setIsChangeModalOpen(false);
    setSelectedTargetPlan(null);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes, featuresRes] = await Promise.all([
        api.get('/plans').catch((e) => {
          console.warn('Failed to fetch /plans:', e);
          return null;
        }),
        api.get('/subscriptions/me').catch((e) => {
          console.warn('Failed to fetch /subscriptions/me:', e);
          return null;
        }),
        api.get('/plans/features').catch(() => null)
      ]);

      if (plansRes?.data?.plans) {
        setPlans(plansRes.data.plans);
        const searchParams = new URLSearchParams(window.location.search);
        const targetPlanParam = searchParams.get('plan') || searchParams.get('upgrade');
        if (targetPlanParam) {
          const matched = plansRes.data.plans.find(
            (p) =>
              p.planType.toLowerCase() === targetPlanParam.toLowerCase() ||
              p.name.toLowerCase() === targetPlanParam.toLowerCase()
          );
          if (matched) {
            setSelectedTargetPlan(matched);
            setIsChangeModalOpen(true);
          }
        }
      }
      if (subRes?.data) {
        setSubscriptionDetails(subRes.data);
        if (subRes.data.user && updateUser) {
          updateUser(subRes.data.user);
        }
        if (subRes.data.pendingCheckout?.reference) {
          api.post('/subscriptions/confirm-payment', { orderId: subRes.data.pendingCheckout.reference })
            .then((confirmRes) => {
              if (confirmRes?.success && confirmRes.data?.user) {
                if (updateUser) updateUser(confirmRes.data.user);
                if (confirmRes.data.subscriptionDetails) {
                  setSubscriptionDetails(confirmRes.data.subscriptionDetails);
                }
                if (refreshUser) refreshUser();
                window.dispatchEvent(new CustomEvent('socialsync:plan_updated', { detail: confirmRes.data.user }));
              }
            })
            .catch(() => {});
        }
      }
      const rawFeatures = featuresRes?.data?.data || featuresRes?.data?.features || featuresRes?.data;
      if (rawFeatures) {
        const featMap = {};
        if (Array.isArray(rawFeatures)) {
          rawFeatures.forEach((f) => {
            if (f.key) featMap[f.key] = f;
          });
        } else if (typeof rawFeatures === 'object') {
          Object.assign(featMap, rawFeatures);
        }
        setFeatureMatrix(featMap);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const isGloballyDisabled = (featureKey) => {
    if (!featureMatrix || !featureMatrix[featureKey]) return false;
    return featureMatrix[featureKey].isGloballyEnabled === false;
  };

  const pollingTimerRef = useRef(null);

  const startPaymentPolling = (targetOrderId) => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    let attempts = 0;
    const maxActiveAttempts = 20; // ~55-60s polling window with progressive backoff

    setPaymentNotice({
      type: 'verifying',
      orderId: targetOrderId,
      title: 'Verifying payment...',
      message: 'Payment received by PayHere. Verifying payment status...'
    });

    const poll = async () => {
      attempts++;
      try {
        const res = await api.post('/subscriptions/confirm-payment', { orderId: targetOrderId || undefined });
        if (res?.success && res.data?.user) {
          if (updateUser) updateUser(res.data.user);
          if (res.data.subscriptionDetails) {
            setSubscriptionDetails(res.data.subscriptionDetails);
          }
          if (refreshUser) refreshUser();
          loadData();

          const planName = res.data.user.planName ||
            (res.data.user.plan === 'CREATOR' ? 'Creator' : res.data.user.plan === 'PROFESSIONAL' ? 'Professional' : res.data.user.plan);
          const credits = res.data.user.credits;

          setPaymentNotice({
            type: 'success',
            orderId: targetOrderId,
            title: `Payment Successful — ${planName} Plan Activated`,
            message: `Your ${planName} plan is now active with ${credits} credits assigned.`
          });

          // Dispatch event to sync other listening components/tabs
          window.dispatchEvent(new CustomEvent('socialsync:plan_updated', { detail: res.data.user }));

          // Auto-dismiss after 8 seconds
          setTimeout(() => {
            setPaymentNotice((prev) => (prev?.type === 'success' ? null : prev));
          }, 8000);
          return;
        }

        if (res?.status === 'CANCELLED' || res?.expired) {
          setPaymentNotice({
            type: 'cancelled',
            orderId: targetOrderId,
            title: 'Checkout Cancelled',
            message: res.message || 'Payment checkout was cancelled or expired. You have not been charged.'
          });
          if (refreshUser) refreshUser();
          loadData();
          setTimeout(() => {
            setPaymentNotice((prev) => (prev?.type === 'cancelled' ? null : prev));
          }, 8000);
          return;
        }

        if (res?.status === 'FAILED') {
          setPaymentNotice({
            type: 'failed',
            orderId: targetOrderId,
            title: 'Payment Failed',
            message: res.message || 'Payment transaction failed or was declined. Your current plan remains unchanged.'
          });
          if (refreshUser) refreshUser();
          loadData();
          return;
        }

        if (attempts < maxActiveAttempts) {
          setPaymentNotice({
            type: 'verifying',
            orderId: targetOrderId,
            title: 'Verifying payment...',
            message: `Awaiting PayHere gateway confirmation (checking status... attempt ${attempts}/${maxActiveAttempts})`
          });
          const nextInterval = Math.min(1800 + (attempts * 150), 3200);
          pollingTimerRef.current = setTimeout(poll, nextInterval);
        } else {
          setPaymentNotice({
            type: 'pending_retry',
            orderId: targetOrderId,
            title: 'Payment Confirmation Pending',
            message: 'PayHere is processing your transaction, but server confirmation is taking a few moments. Click "Check Status Now" to check again. Your plan and credits will activate as soon as confirmation arrives.'
          });
          if (refreshUser) refreshUser();
          loadData();
        }
      } catch (err) {
        const errStatus = err?.response?.status || err?.status;
        if ((errStatus === 400 || err?.status === 'CANCELLED') && (err?.message?.includes('cancelled') || err?.error === 'CANCELLED')) {
          setPaymentNotice({
            type: 'cancelled',
            orderId: targetOrderId,
            title: 'Checkout Cancelled',
            message: 'Payment checkout was cancelled.'
          });
          if (refreshUser) refreshUser();
          loadData();
          setTimeout(() => {
            setPaymentNotice((prev) => (prev?.type === 'cancelled' ? null : prev));
          }, 8000);
          return;
        }

        if (attempts < maxActiveAttempts) {
          const nextInterval = Math.min(2000 + (attempts * 200), 3500);
          pollingTimerRef.current = setTimeout(poll, nextInterval);
        } else {
          setPaymentNotice({
            type: 'pending_retry',
            orderId: targetOrderId,
            title: 'Payment Confirmation Pending',
            message: 'Payment is awaiting server-side confirmation from PayHere. Click "Check Status Now" to retry.'
          });
          if (refreshUser) refreshUser();
          loadData();
        }
      }
    };

    poll();
  };

  useEffect(() => {
    loadData();

    // Check for PayHere redirect parameters
    const searchParams = new URLSearchParams(window.location.search);
    const paymentStatus = searchParams.get('payment');
    const orderId = searchParams.get('order_id') || searchParams.get('orderId');

    // Clean URL query parameters safely without losing state
    if (paymentStatus || orderId) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (paymentStatus === 'cancelled') {
      setPaymentNotice({
        type: 'cancelled',
        orderId,
        message: 'Payment checkout was cancelled. You have not been charged.'
      });
      if (orderId) {
        api.post('/subscriptions/cancel-checkout', { orderId }).catch(() => {});
      }
      if (refreshUser) refreshUser();
      loadData();
    } else if (orderId || paymentStatus === 'success') {
      startPaymentPolling(orderId || null);
    }

    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, []);

  const handleCheckPaymentStatus = async (orderIdToVerify) => {
    setIsCheckingPending(true);
    setActionNotice('Checking payment status with gateway...');
    let retryCount = 0;
    const maxRetry = 5;

    const executeCheck = async () => {
      retryCount++;
      try {
        const res = await api.post('/subscriptions/confirm-payment', { orderId: orderIdToVerify });
        if (res?.success && res.data?.user) {
          setIsCheckingPending(false);
          setActionNotice('');
          if (updateUser) updateUser(res.data.user);
          if (res.data.subscriptionDetails) {
            setSubscriptionDetails(res.data.subscriptionDetails);
          }
          if (refreshUser) refreshUser();
          loadData();
          const planName = res.data.user.planName ||
            (res.data.user.plan === 'CREATOR' ? 'Creator' : res.data.user.plan === 'PROFESSIONAL' ? 'Professional' : res.data.user.plan);
          const credits = res.data.user.credits;
          setPaymentNotice({
            type: 'success',
            orderId: orderIdToVerify,
            title: `Payment Successful — ${planName} Plan Activated`,
            message: `Your ${planName} plan is now active with ${credits} credits assigned.`
          });
          window.dispatchEvent(new CustomEvent('socialsync:plan_updated', { detail: res.data.user }));
          setTimeout(() => {
            setPaymentNotice((prev) => (prev?.type === 'success' ? null : prev));
          }, 8000);
          return;
        }

        if (res?.status === 'CANCELLED' || res?.expired) {
          setIsCheckingPending(false);
          setActionNotice('');
          setPaymentNotice({
            type: 'cancelled',
            orderId: orderIdToVerify,
            title: 'Checkout Cancelled',
            message: res.message || 'Checkout session has expired or was cancelled. Your current plan remains unchanged.'
          });
          if (refreshUser) refreshUser();
          loadData();
          setTimeout(() => {
            setPaymentNotice((prev) => (prev?.type === 'cancelled' ? null : prev));
          }, 8000);
          return;
        }

        if (res?.status === 'FAILED') {
          setIsCheckingPending(false);
          setActionNotice('');
          setPaymentNotice({
            type: 'failed',
            orderId: orderIdToVerify,
            title: 'Payment Failed',
            message: res.message || 'Payment transaction failed or was declined.'
          });
          if (refreshUser) refreshUser();
          loadData();
          return;
        }

        if (retryCount < maxRetry) {
          setTimeout(executeCheck, 2000);
        } else {
          setIsCheckingPending(false);
          setActionNotice('');
          setPaymentNotice({
            type: 'pending_retry',
            orderId: orderIdToVerify,
            title: 'Payment Confirmation Pending',
            message: 'Server has not yet received confirmation from PayHere. If you completed payment, it may take 1-2 minutes for PayHere to deliver notifications. Click "Check Status Now" to check again.'
          });
        }
      } catch (err) {
        if (retryCount < maxRetry) {
          setTimeout(executeCheck, 2000);
        } else {
          setIsCheckingPending(false);
          setActionNotice('');
          setPaymentNotice({
            type: 'pending_retry',
            orderId: orderIdToVerify,
            title: 'Payment Status Check',
            message: err?.message || 'Could not verify payment at this moment. Please click "Check Status Now" to try again.'
          });
        }
      }
    };

    executeCheck();
  };

  const handleCancelPendingCheckout = async (orderIdToCancel) => {
    setIsCheckingPending(true);
    try {
      await api.post('/subscriptions/cancel-checkout', { orderId: orderIdToCancel });
      setActionNotice('Pending checkout session has been cancelled.');
      setPaymentNotice(null);
      if (refreshUser) refreshUser();
      await loadData();
    } catch (err) {
      setActionNotice(err?.message || 'Could not cancel checkout.');
    } finally {
      setIsCheckingPending(false);
    }
  };

  const handlePlanChanged = (result) => {
    if (result?.user && updateUser) {
      updateUser(result.user);
    }
    setActionNotice(result?.message || 'Plan successfully updated.');
    if (refreshUser) refreshUser();
    loadData();
    setTimeout(() => setActionNotice(''), 6000);
  };

  const handleCancelled = (result) => {
    setActionNotice(result.message || 'Subscription cancellation scheduled. Access continues until your period end.');
    if (refreshUser) refreshUser();
    loadData();
    setTimeout(() => setActionNotice(''), 6000);
  };

  const currentPlanType = subscriptionDetails?.plan?.type || user?.plan || 'FREE';
  const sub = subscriptionDetails?.subscription;
  const isPaid = currentPlanType !== 'FREE';
  const isCancellationScheduled = sub?.cancelAtPeriodEnd || sub?.status === 'Cancellation Scheduled';

  // Standard fallback plans (Free: 200, Creator: 500, Professional: 1500)
  const defaultPlans = [
    {
      planType: 'FREE',
      name: 'Free',
      priceLkr: 0,
      priceUsd: 0,
      credits: 200,
      maxConnectedAccounts: 2,
      hasScheduling: false,
      hasAiCaptions: false,
      hasCollageStudio: false,
      isFreePromotion: false,
      description: 'Perfect for getting started with multi-channel publishing.'
    },
    {
      planType: 'CREATOR',
      name: 'Creator',
      badge: 'Most Popular',
      priceLkr: 1000,
      priceUsd: 9.99,
      credits: 500,
      maxConnectedAccounts: 4,
      hasScheduling: true,
      hasAiCaptions: false,
      hasCollageStudio: true,
      isFreePromotion: false,
      description: 'For growing influencers and content creators scaling their audience.'
    },
    {
      planType: 'PROFESSIONAL',
      name: 'Professional',
      priceLkr: 2500,
      priceUsd: 19.99,
      credits: 1500,
      maxConnectedAccounts: 6,
      hasScheduling: true,
      hasAiCaptions: true,
      hasCollageStudio: true,
      isFreePromotion: false,
      description: 'Full AI caption automation and highest account allowances.'
    }
  ];

  const activePlans = plans.length > 0 ? plans : defaultPlans;

  return (
    <ErrorBoundary>
      <div className="space-y-4 sm:space-y-5 animate-fade-in pb-16 max-w-7xl mx-auto">
        {/* Prominent Payment Return Notice */}
        {paymentNotice && (
          <div
            className={`p-4 sm:p-5 rounded-2xl border text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fade-in ${
              paymentNotice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : paymentNotice.type === 'verifying'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                : (paymentNotice.type === 'pending' || paymentNotice.type === 'pending_retry')
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : paymentNotice.type === 'cancelled'
                ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              {paymentNotice.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              {paymentNotice.type === 'verifying' && (
                <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 animate-spin" />
              )}
              {(paymentNotice.type === 'pending' || paymentNotice.type === 'pending_retry') && (
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
              )}
              {paymentNotice.type === 'cancelled' && (
                <Info className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0" />
              )}
              {paymentNotice.type === 'failed' && (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <div className="space-y-0.5">
                <div className="font-bold text-xs sm:text-sm">
                  {paymentNotice.title || (
                    paymentNotice.type === 'success' ? 'Payment Verified & Plan Activated' :
                    paymentNotice.type === 'verifying' ? 'Confirming your payment...' :
                    (paymentNotice.type === 'pending' || paymentNotice.type === 'pending_retry') ? 'Payment Received; Confirmation Pending' :
                    paymentNotice.type === 'cancelled' ? 'Checkout Cancelled' : 'Payment Verification Issue'
                  )}
                </div>
                <p className="text-[11px] sm:text-xs opacity-90 leading-relaxed">
                  {paymentNotice.message}
                </p>
                {paymentNotice.orderId && (
                  <span className="text-[10px] font-mono opacity-75">
                    Order Ref: #{paymentNotice.orderId}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {(paymentNotice.type === 'pending_retry' || (paymentNotice.type === 'pending' && paymentNotice.orderId)) && (
                <button
                  onClick={() => handleCheckPaymentStatus(paymentNotice.orderId)}
                  disabled={isCheckingPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPending ? 'animate-spin' : ''}`} />
                  <span>Check Status Now</span>
                </button>
              )}
              <button
                onClick={() => setPaymentNotice(null)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Action Notification */}
        {actionNotice && !paymentNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice('')} className="text-emerald-700 dark:text-emerald-300 hover:underline font-bold text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && plans.length === 0 && (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
              <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
              <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
            </div>
          </div>
        )}

      {/* ========================================================
          1. HERO HEADER (PROMINENT & EYE-CATCHING)
      ======================================================== */}
      <div className="relative text-center space-y-1 sm:space-y-1.5 -mt-3 sm:-mt-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F172A] dark:text-white tracking-tight leading-tight">
          Choose the Perfect Plan for Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED]">Social Reach</span>
        </h1>

        <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
          Switch plans anytime. Your credits update instantly when you upgrade or downgrade.
        </p>
      </div>

      {/* ========================================================
          2. CURRENT ACTIVE TIER OVERVIEW BAR (COMPACT)
      ======================================================== */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-3.5 sm:p-4 shadow-soft border border-[#E2E8F0] dark:border-[#334155] flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all hover:shadow-md">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#3B5BFF] dark:text-[#818cf8]">
              Your Current Status
            </span>
            <span
              className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                sub?.status === 'Active'
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                  : isCancellationScheduled
                  ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                  : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#334155]'
              }`}
            >
              {sub?.status || (currentPlanType === 'FREE' ? 'Free Tier Active' : 'Active')}
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white tracking-tight">
            {subscriptionDetails?.plan?.name || currentPlanType} Package
          </h2>

          <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] max-w-lg leading-relaxed">
            {isPaid
              ? sub?.isFreeTrial
                ? `1-Month Free Trial active. No charges until ${
                    sub?.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'
                  }. Renews at LKR ${subscriptionDetails?.plan?.priceLkr?.toLocaleString()}/mo afterward unless cancelled.`
                : isCancellationScheduled
                ? `Cancellation scheduled. Full ${subscriptionDetails?.plan?.name || currentPlanType} access remains active until ${
                    sub?.cancellationEffectiveDate || sub?.currentPeriodEnd ? new Date(sub.cancellationEffectiveDate || sub.currentPeriodEnd).toLocaleDateString() : 'N/A'
                  }.`
                : `Billed LKR ${subscriptionDetails?.plan?.priceLkr?.toLocaleString()} per month. Next renewal date: ${
                    sub?.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'
                  }.`
              : 'Free package with 200 monthly credits and up to 2 connected social channels.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl px-3 py-1.5 text-center min-w-[85px]">
            <span className="text-[8.5px] text-[#475569] dark:text-slate-400 block uppercase font-bold tracking-wider">
              Available Credits
            </span>
            <span className="text-sm sm:text-base font-black text-[#3B5BFF] dark:text-[#818cf8] flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 fill-current text-amber-500" />
              {subscriptionDetails?.user?.credits ?? user?.credits ?? 200}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl px-3 py-1.5 text-center min-w-[85px]">
            <span className="text-[8.5px] text-[#475569] dark:text-slate-400 block uppercase font-bold tracking-wider">
              Channels
            </span>
            <span className="text-sm sm:text-base font-black text-[#0F172A] dark:text-white">
              {subscriptionDetails?.usage?.connectedAccounts ?? 0} / {subscriptionDetails?.plan?.maxConnectedAccounts ?? 2}
            </span>
          </div>

          <button
            onClick={() => {
              const el = document.getElementById('packages-pricing-grid');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white text-xs font-bold shadow-sm shadow-[#3B5BFF]/25 transition-all flex items-center gap-1.5 hover:scale-[1.01] active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Switch / Upgrade Plan</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          3. 3 PACKAGES PRICING CARDS (3 DISTINCT STYLES)
      ======================================================== */}
      <div id="packages-pricing-grid" className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch scroll-mt-6">
        {activePlans.map((plan) => {
          const isCurrent = plan.planType === currentPlanType;
          const isFree = plan.planType === 'FREE';
          const isCreator = plan.planType === 'CREATOR';
          const isPro = plan.planType === 'PROFESSIONAL';
          const isAdminUser = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);
          const isPromo = !isAdminUser && Boolean(plan.isPromoActive && plan.promoStatus === 'ACTIVE');
          const displayPrice = `LKR ${plan.priceLkr?.toLocaleString()}`;

          // Distinct styling classes per tier
          let cardThemeClasses = '';
          let checkmarkColor = 'text-slate-500 dark:text-slate-400';

          if (isCreator) {
            // Style 2: CREATOR - Electric Blue & Indigo (Flagship / Most Popular)
            checkmarkColor = 'text-[#3B5BFF] dark:text-[#60a5fa]';
            cardThemeClasses = isCurrent
              ? 'border-2 border-[#3B5BFF] bg-gradient-to-b from-blue-50/70 via-white to-blue-50/30 dark:from-[#0d152a] dark:via-[#111827] dark:to-[#172554]/30 ring-2 ring-[#3B5BFF]/30 shadow-lg'
              : 'border-2 border-[#3B5BFF] dark:border-[#3B5BFF]/85 bg-gradient-to-b from-[#3B5BFF]/[0.05] via-white to-blue-50/30 dark:from-[#0b1329] dark:via-[#111827] dark:to-[#172554]/20 shadow-md hover:shadow-xl hover:shadow-[#3B5BFF]/15 hover:-translate-y-1 ring-1 ring-[#3B5BFF]/20';
          } else if (isPro) {
            // Style 3: PROFESSIONAL - Royal Purple & Violet (Power / AI Suite)
            checkmarkColor = 'text-[#7C3AED] dark:text-[#c084fc]';
            cardThemeClasses = isCurrent
              ? 'border-2 border-[#7C3AED] bg-gradient-to-b from-purple-50/70 via-white to-purple-50/30 dark:from-[#1c0e35] dark:via-[#111827] dark:to-[#2e1065]/30 ring-2 ring-[#7C3AED]/30 shadow-lg'
              : 'border-2 border-[#7C3AED] dark:border-[#9333EA]/80 bg-gradient-to-b from-purple-50/50 via-white to-violet-50/20 dark:from-[#170a2c] dark:via-[#111827] dark:to-[#2e1065]/20 shadow-md hover:shadow-xl hover:shadow-purple-500/15 hover:-translate-y-1 ring-1 ring-[#7C3AED]/20';
          } else {
            // Style 1: FREE - Clean Minimal Slate
            checkmarkColor = 'text-slate-500 dark:text-slate-400';
            cardThemeClasses = isCurrent
              ? 'border-2 border-slate-400 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-900/60 ring-2 ring-slate-300 dark:ring-slate-700 shadow-sm'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md';
          }

          return (
            <div
              key={plan.planType}
              className={`relative rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 ${cardThemeClasses}`}
            >
              {/* Badges on Top */}
              {isCurrent && (
                <div className="absolute -top-3 right-5">
                  <span className={`text-white text-[9.5px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm ${
                    isCreator
                      ? 'bg-gradient-to-r from-[#3B5BFF] to-[#2563EB]'
                      : isPro
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA]'
                      : 'bg-slate-700 dark:bg-slate-600'
                  }`}>
                    Current Active Tier
                  </span>
                </div>
              )}

              {!isCurrent && isPromo && (
                <div className="absolute -top-3 right-5">
                  <span className="bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] text-white text-[9.5px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md flex items-center gap-1 animate-pulse">
                    <Gift className="w-3 h-3" /> {plan.promoTitle || '1 Month Free Trial'}
                  </span>
                </div>
              )}

              {!isCurrent && !isPromo && isCreator && (
                <div className="absolute -top-3 right-5">
                  <span className="bg-gradient-to-r from-[#3B5BFF] to-[#2563EB] text-white text-[9.5px] font-black uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-md shadow-blue-500/25 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-300 fill-amber-300" /> Most Popular
                  </span>
                </div>
              )}

              {!isCurrent && !isPromo && isPro && (
                <div className="absolute -top-3 right-5">
                  <span className="bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#C026D3] text-white text-[9.5px] font-black uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-md shadow-purple-500/25 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-300 fill-amber-300" /> Complete AI Suite
                  </span>
                </div>
              )}

              <div>
                {/* Plan Header & Icon */}
                <div className="flex items-center gap-2 mb-1.5">
                  {isFree && (
                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {isCreator && (
                    <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-[#3B5BFF]">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {isPro && (
                    <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-[#7C3AED]">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <h3 className={`text-xl font-black ${
                    isPro
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#A855F7] dark:from-[#C084FC] dark:to-[#E879F9]'
                      : isCreator
                      ? 'text-[#0F172A] dark:text-white'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}>
                    {plan.name}
                  </h3>
                </div>

                <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] mb-4 leading-relaxed min-h-[30px]">
                  {plan.description}
                </p>

                {/* Price Box */}
                <div className="mb-4 pb-4 border-b border-[#E2E8F0] dark:border-[#334155]">
                  {isPromo ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through font-medium">
                          LKR {(plan.originalMonthlyPriceLkr || plan.originalPriceLkr || plan.priceLkr).toLocaleString()}
                        </span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-[#4DBD45]/15 text-[#4DBD45] border border-[#4DBD45]/30">
                          {plan.promoTitle || '1 Month Free'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-[#4DBD45]">LKR 0.00</span>
                        <span className="text-xs text-[#475569] dark:text-[#CBD5E1] font-semibold">/ first month</span>
                      </div>
                      <span className="text-[10px] text-[#475569] dark:text-[#CBD5E1] block mt-1 leading-tight">
                        Renews at {displayPrice}/mo after 30-day trial. Cancel anytime.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-3xl font-black tracking-tight ${
                        isPro
                          ? 'text-[#0F172A] dark:text-white'
                          : isCreator
                          ? 'text-[#0F172A] dark:text-white'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}>
                        {displayPrice}
                      </span>
                      {plan.planType !== 'FREE' && (
                        <span className="text-xs text-[#475569] dark:text-[#CBD5E1] font-semibold">/ month</span>
                      )}
                    </div>
                  )}

                  {/* Highlights Pill */}
                  <div className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    isPro
                      ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-800/60'
                      : isCreator
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/60'
                      : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Zap className={`w-3.5 h-3.5 ${
                        isPro
                          ? 'text-[#7C3AED] fill-[#7C3AED]'
                          : isCreator
                          ? 'text-[#3B5BFF] fill-[#3B5BFF]'
                          : 'text-amber-500 fill-amber-500'
                      }`} />
                      <span className="text-[11px] font-bold text-[#0F172A] dark:text-white">Credits Allowance:</span>
                    </div>
                    <span className={`text-xs font-black ${
                      isPro
                        ? 'text-[#7C3AED] dark:text-purple-300'
                        : isCreator
                        ? 'text-[#3B5BFF] dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {plan.credits?.toLocaleString()} credits
                    </span>
                  </div>
                </div>

                {/* Feature Checklist */}
                <div className="space-y-2.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    {isCreator || isPro ? (
                      <>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${checkmarkColor} shrink-0`} />
                        <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
                          Priority publishing dispatch
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="text-slate-400 dark:text-slate-500 line-through">
                          Priority dispatch
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${checkmarkColor} shrink-0`} />
                    <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                      Up to <strong>{plan.maxConnectedAccounts}</strong> connected channels
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${checkmarkColor} shrink-0`} />
                    <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
                      {plan.planType === 'PROFESSIONAL'
                        ? 'Choose all 6 accounts to share'
                        : `Choose any ${plan.maxConnectedAccounts || (plan.planType === 'CREATOR' ? 4 : 2)} accounts to share`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${checkmarkColor} shrink-0`} />
                    <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                      All 6 social media networks
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${checkmarkColor} shrink-0`} />
                    <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                      Publishing history & logs
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {plan.hasScheduling ? (
                      <>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${checkmarkColor} shrink-0`} />
                        <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold flex items-center flex-wrap gap-1">
                          Smart post scheduling & calendar
                          {isGloballyDisabled('scheduling') && (
                            <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              Paused by admin
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="text-slate-400 dark:text-slate-500 line-through">
                          Smart post scheduling
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {plan.hasCollageStudio ?? (isCreator || isPro) ? (
                      <>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${checkmarkColor} shrink-0`} />
                        <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold flex items-center flex-wrap gap-1">
                          Photo Collage Studio (Merge up to 6 photos)
                          {isGloballyDisabled('collageStudio') && (
                            <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              Paused by admin
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="text-slate-400 dark:text-slate-500 line-through">
                          Photo Collage Studio
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {plan.hasAiCaptions ? (
                      <>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${checkmarkColor} shrink-0`} />
                        <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold flex items-center flex-wrap gap-1">
                          AI caption generator & Vision Studio
                          {isGloballyDisabled('aiCaptions') && (
                            <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              Paused by admin
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="text-slate-400 dark:text-slate-500 line-through">
                          AI caption suggestions
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-[#1E293B] text-slate-400 dark:text-slate-500 cursor-not-allowed border border-[#E2E8F0] dark:border-[#334155]"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlanForChange(plan)}
                    className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs hover:scale-[1.01] active:scale-95 ${
                      isCreator
                        ? 'bg-gradient-to-r from-[#3B5BFF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white shadow-md shadow-[#3B5BFF]/25'
                        : isPro
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA] hover:from-[#6D28D9] hover:to-[#7E22CE] text-white shadow-md shadow-[#7C3AED]/25'
                        : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/15'
                    }`}
                  >
                    <span>
                      {plan.planType === 'FREE'
                        ? 'Switch to Free Tier'
                        : isPromo
                        ? `Claim 1-Month Free (${plan.name})`
                        : `Upgrade to ${plan.name}`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================
          PAYHERE PAYMENT INFORMATION & OFFICIAL BANNER
      ======================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left py-2 sm:py-3 gap-3 sm:gap-5">
        <p className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-wide whitespace-nowrap">
          Secure Online Payments by
        </p>
        <a
          href="https://www.payhere.lk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block transition-transform hover:scale-[1.02] active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]/50 rounded-lg shrink-0"
        >
          <img
            src="https://www.payhere.lk/downloads/images/payhere_long_banner_dark.png"
            alt="PayHere"
            width="400"
            className="w-full max-w-[360px] sm:max-w-[400px] h-auto object-contain drop-shadow-xs"
          />
        </a>
      </div>

      {/* ========================================================
          4. SIDE-BY-SIDE FEATURE COMPARISON MATRIX
      ======================================================== */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-5">
        <div>
          <h3 className="text-lg font-black text-[#0F172A] dark:text-[#F8FAFC]">
            Complete Feature Comparison Matrix
          </h3>
          <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
            Side-by-side capabilities, allowances, and features across all tiers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-[#CBD5E1]">
                <th className="py-3 px-3 font-bold">Feature</th>
                <th className="py-3 px-3 font-bold text-center">Free Plan</th>
                <th className="py-3 px-3 font-bold text-center text-blue-600 dark:text-cyan-400">Creator Plan</th>
                <th className="py-3 px-3 font-bold text-center text-purple-600 dark:text-purple-400">Professional Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">Monthly Price</td>
                <td className="py-3.5 px-3 text-center text-[#475569] dark:text-[#CBD5E1] font-bold">LKR 0</td>
                <td className="py-3.5 px-3 text-center text-[#475569] dark:text-[#CBD5E1] font-bold">LKR 1,000 / mo</td>
                <td className="py-3.5 px-3 text-center text-[#475569] dark:text-[#CBD5E1] font-bold">LKR 2,500 / mo</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">Monthly Credits Allowance</td>
                <td className="py-3.5 px-3 text-center text-[#475569] dark:text-[#CBD5E1] font-extrabold">200 credits</td>
                <td className="py-3.5 px-3 text-center text-blue-600 dark:text-cyan-400 font-extrabold">500 credits</td>
                <td className="py-3.5 px-3 text-center text-purple-600 dark:text-purple-400 font-extrabold">1500 credits</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">Connected Channels Limit</td>
                <td className="py-3.5 px-3 text-center text-[#475569] dark:text-[#CBD5E1]">Max 2</td>
                <td className="py-3.5 px-3 text-center text-[#475569] dark:text-[#CBD5E1]">Max 4</td>
                <td className="py-3.5 px-3 text-center text-[#475569] dark:text-[#CBD5E1]">Max 6</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">Supported Platforms (FB, IG, LI, YT, TikTok, Threads)</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ All 6</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ All 6</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ All 6</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">Priority Publishing Dispatch</td>
                <td className="py-3.5 px-3 text-center text-slate-400 dark:text-slate-500">Standard</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Priority</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ High Priority</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">Publishing History & Logs</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Enabled</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Enabled</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Enabled</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Post Scheduling & Calendar
                  {isGloballyDisabled('scheduling') && (
                    <span className="ml-2 text-[11px] font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Paused by admin
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-3 text-center text-slate-400 dark:text-slate-500">✗ Disabled</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                  {isGloballyDisabled('scheduling') ? (
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-normal">Paused</span>
                  ) : (
                    '✓ Enabled'
                  )}
                </td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                  {isGloballyDisabled('scheduling') ? (
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-normal">Paused</span>
                  ) : (
                    '✓ Enabled'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  Photo Collage Studio (Merge up to 6 photos)
                  {isGloballyDisabled('collageStudio') && (
                    <span className="ml-2 text-[11px] font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Paused by admin
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-3 text-center text-slate-400 dark:text-slate-500">✗ Disabled</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                  {isGloballyDisabled('collageStudio') ? (
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-normal">Paused</span>
                  ) : (
                    '✓ Enabled'
                  )}
                </td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                  {isGloballyDisabled('collageStudio') ? (
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-normal">Paused</span>
                  ) : (
                    '✓ Enabled'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  AI Caption Generator & Vision Studio
                  {isGloballyDisabled('aiCaptions') && (
                    <span className="ml-2 text-[11px] font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Paused by admin
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-3 text-center text-slate-400 dark:text-slate-500">✗ Disabled</td>
                <td className="py-3.5 px-3 text-center text-slate-400 dark:text-slate-500">✗ Disabled</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                  {isGloballyDisabled('aiCaptions') ? (
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-normal">Paused</span>
                  ) : (
                    '✓ Enabled'
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          5. PRICING & CREDITS FAQ
      ======================================================== */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
          <h3 className="text-base font-black text-[#0F172A] dark:text-[#F8FAFC]">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white">How do credits work when publishing?</h4>
            <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
              Every broadcast to your connected social channels automatically consumes credits from your account balance. When cancelling a scheduled post, deducted credits are automatically restored to your account.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white">Can I change my plan anytime?</h4>
            <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
              Yes! Upgrades happen immediately with prorated credit allocation. If you choose to downgrade, your current paid privileges and higher limits remain active until the end of your billing cycle.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white">What happens if a scheduled post is cancelled?</h4>
            <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
              Credits deducted when creating a scheduled broadcast are automatically refunded to your credit balance immediately upon cancelling the scheduled publication.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white">Do credits roll over month to month?</h4>
            <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
              Monthly allowances (200 for Free, 500 for Creator, and 1500 for Professional) refresh at each monthly billing cycle, ensuring you always have sufficient bandwidth for your publishing campaigns.
            </p>
          </div>
        </div>
      </div>

      {/* Change Plan Modal */}
      <ChangePlanModal
        isOpen={isChangeModalOpen}
        onClose={handleCloseChangeModal}
        currentPlan={currentPlanType}
        targetPlan={selectedTargetPlan}
        currentSubscription={sub}
        allPlans={activePlans}
        connectedAccountsCount={subscriptionDetails?.usage?.connectedAccounts || 0}
        onPlanChanged={handlePlanChanged}
      />

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        subscription={sub}
        planName={subscriptionDetails?.plan?.name || currentPlanType}
        onCancelled={handleCancelled}
      />
    </div>
    </ErrorBoundary>
  );
}

export default PackagesPage;
