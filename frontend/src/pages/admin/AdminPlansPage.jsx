import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  X,
  CreditCard,
  Users,
  AlertCircle,
  Sparkles,
  Coins,
  Edit2,
  Gift,
  RefreshCw,
  ShieldCheck,
  Calendar,
  Check,
  AlertTriangle,
  ArrowRight,
  Tag
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { Button } from '../../components/common/Button';

export function AdminPlansPage() {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Edit Plan Modal State
  const [editingPlan, setEditingPlan] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    badge: '',
    priceLkr: 0,
    priceUsd: 0,
    originalPriceLkr: 0,
    credits: 0,
    maxConnectedAccounts: 2,
    hasScheduling: false,
    hasAiCaptions: false,
    hasFreeTrial: false,
    trialPeriodDays: 30,
    isActive: true,
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Global Change to Free Modal State
  const [globalFreeModal, setGlobalFreeModal] = useState(null); // { plan, stats, loading, policy, reason, confirmationText }
  const [globalFreeSubmitting, setGlobalFreeSubmitting] = useState(false);

  // Promotional Pricing Modal State
  const [promoModal, setPromoModal] = useState(null); // { plan, isFreePromotion, promotionNote }
  const [promoSubmitting, setPromoSubmitting] = useState(false);

  // Automated billing runner state
  const [billingRunning, setBillingRunning] = useState(false);
  const [billingReport, setBillingReport] = useState(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [plansRes, dashRes, subsRes] = await Promise.all([
        api.get('/admin/plans'),
        api.get('/admin/dashboard'),
        api.get('/admin/subscriptions').catch(() => ({ data: { subscriptions: [] } }))
      ]);

      if (plansRes.success && plansRes.data?.plans) {
        setPlans(plansRes.data.plans);
      }
      if (dashRes.success) {
        setStats(dashRes.data?.summary?.planDistribution || {});
      }
      if (subsRes?.data?.subscriptions) {
        setSubscriptions(subsRes.data.subscriptions);
      }
    } catch (err) {
      console.error('Failed to load admin plans data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setEditFormData({
      name: plan.name || '',
      badge: plan.badge || '',
      priceLkr: plan.priceLkr ?? 0,
      priceUsd: plan.priceUsd ?? 0,
      originalPriceLkr: plan.originalPriceLkr ?? plan.priceLkr ?? 0,
      credits: plan.credits ?? 50,
      maxConnectedAccounts: plan.maxConnectedAccounts ?? 2,
      hasScheduling: Boolean(plan.hasScheduling),
      hasAiCaptions: Boolean(plan.hasAiCaptions),
      hasFreeTrial: Boolean(plan.hasFreeTrial),
      trialPeriodDays: plan.trialPeriodDays || 30,
      isActive: plan.isActive !== false,
      description: plan.description || ''
    });
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      setSaving(true);
      const res = await api.put(`/admin/plans/${editingPlan.planType}`, editFormData);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Package ${editingPlan.name} updated successfully! New price, credits and limits applied.`
        });
        setEditingPlan(null);
        await fetchAllData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update plan'
      });
    } finally {
      setSaving(false);
    }
  };

  // Open "Change All Users to Free" Modal
  const openGlobalFreeModal = async (plan) => {
    setGlobalFreeModal({
      plan,
      loading: true,
      stats: null,
      policy: 'END_OF_PERIOD',
      reason: `Admin global migration from ${plan.name} to Free`,
      confirmationText: ''
    });

    try {
      const res = await api.get(`/admin/plans/${plan.planType}/stats`);
      if (res.success) {
        setGlobalFreeModal(prev => ({
          ...prev,
          loading: false,
          stats: res.data
        }));
      }
    } catch (err) {
      setGlobalFreeModal(prev => ({
        ...prev,
        loading: false,
        stats: { totalAffected: stats[plan.planType] || 0 }
      }));
    }
  };

  // Execute Global Migration to Free
  const handleExecuteGlobalFree = async (e) => {
    e.preventDefault();
    if (!globalFreeModal) return;

    const targetType = globalFreeModal.plan.planType;
    if (globalFreeModal.confirmationText !== `CONFIRM-${targetType}`) {
      alert(`Please type CONFIRM-${targetType} exactly to confirm this global action.`);
      return;
    }

    try {
      setGlobalFreeSubmitting(true);
      const res = await api.post(`/admin/plans/${targetType}/migrate-free`, {
        migrationPolicy: globalFreeModal.policy,
        reason: globalFreeModal.reason,
        confirmationText: globalFreeModal.confirmationText
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: res.message
        });
        setGlobalFreeModal(null);
        await fetchAllData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to migrate users to Free'
      });
    } finally {
      setGlobalFreeSubmitting(false);
    }
  };

  // Open Promotional Pricing Toggle Modal
  const openPromoModal = (plan) => {
    setPromoModal({
      plan,
      isFreePromotion: !plan.isFreePromotion,
      promotionNote: plan.promotionNote || 'Currently Free — Limited Time Free Promotion'
    });
  };

  // Execute Toggle Promotional Pricing
  const handleExecutePromo = async (e) => {
    e.preventDefault();
    if (!promoModal) return;

    try {
      setPromoSubmitting(true);
      const res = await api.post(`/admin/plans/${promoModal.plan.planType}/promotion`, {
        isFreePromotion: promoModal.isFreePromotion,
        promotionNote: promoModal.promotionNote
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: res.message
        });
        setPromoModal(null);
        await fetchAllData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update promotional pricing'
      });
    } finally {
      setPromoSubmitting(false);
    }
  };

  // Trigger automated card billing detection
  const handleTriggerAutoBilling = async () => {
    try {
      setBillingRunning(true);
      const res = await api.post('/admin/subscriptions/process-billing');
      if (res.success) {
        setBillingReport(res.data);
        setNotification({
          type: 'success',
          message: res.message
        });
        await fetchAllData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to process automated billing'
      });
    } finally {
      setBillingRunning(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading package management and subscriber ledger..." />;
  }

  const trialingSubs = subscriptions.filter(s => s.status === 'TRIALING' || s.isFreeTrial);
  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE');

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
            Subscription Plans & Billing Controls
          </h1>
          <p className="text-sm text-[#475569] dark:text-[#CBD5E1] mt-1">
            Configure live package pricing, credit allowances, channel limits, promotional free modes, and global migrations.
          </p>
        </div>

        {/* Action Button: Automated Billing Runner */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleTriggerAutoBilling}
            loading={billingRunning}
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${billingRunning ? 'animate-spin' : ''}`} />
            <span>Detect & Charge Expired Trials</span>
          </Button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Automated Billing Report Modal/Banner */}
      {billingReport && (
        <div className="bg-blue-50/60 dark:bg-[#0b1633] border border-blue-200 dark:border-blue-500/40 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600 dark:text-cyan-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              Automated Card Detection & Billing Execution Results
            </div>
            <button
              onClick={() => setBillingReport(null)}
              className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white text-xs"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white dark:bg-[#111827] p-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-[#475569] dark:text-slate-400 block">Subscriptions Processed</span>
              <span className="text-lg font-bold text-[#0F172A] dark:text-white">{billingReport.processedCount}</span>
            </div>
            <div className="bg-white dark:bg-[#111827] p-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-[#475569] dark:text-slate-400 block">Trials Renewed</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{billingReport.renewedTrialsCount}</span>
            </div>
            <div className="bg-white dark:bg-[#111827] p-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-[#475569] dark:text-slate-400 block">Standard Renewals</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{billingReport.renewedStandardCount}</span>
            </div>
            <div className="bg-white dark:bg-[#111827] p-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-[#475569] dark:text-slate-400 block">Total Charged</span>
              <span className="text-lg font-bold text-cyan-600 dark:text-cyan-300">LKR {billingReport.totalAmountChargedLkr.toLocaleString()}</span>
            </div>
          </div>
          {billingReport.subscriptions?.length > 0 && (
            <div className="pt-2 text-xs text-[#475569] dark:text-slate-300 space-y-1">
              <p className="font-semibold text-[#0F172A] dark:text-slate-400">Cards Automatically Detected & Charged:</p>
              {billingReport.subscriptions.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-[#E2E8F0] dark:border-slate-800/60">
                  <span>{s.userName} ({s.userEmail}) — {s.plan}</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400">{s.card} • LKR {s.amountCharged.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Package Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const userCount = stats[plan.planType] || 0;
          const isCreator = plan.planType === 'CREATOR';
          const isPro = plan.planType === 'PROFESSIONAL';
          const isFree = plan.planType === 'FREE';

          return (
            <div
              key={plan.id || plan.planType}
              className={`rounded-2xl p-6 flex flex-col justify-between transition-all relative border ${
                isCreator
                  ? 'bg-blue-50/40 dark:bg-[#0f1b3b] border-blue-300 dark:border-blue-500/50 shadow-xl shadow-blue-500/10'
                  : 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-6">
                  <span className="bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5 line-clamp-2">
                      {plan.description}
                    </p>
                  </div>
                  <button
                    onClick={() => openEditModal(plan)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-[#475569] hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white transition-colors"
                    title="Edit Package Details & Limits"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Price Display with Strikethrough for Free Promotion */}
                <div className="py-4 border-y border-[#E2E8F0] dark:border-slate-800/80 my-4 space-y-2">
                  <div className="flex items-baseline gap-2">
                    {plan.isFreePromotion && plan.originalPriceLkr > 0 ? (
                      <>
                        <span className="text-lg line-through text-slate-400 dark:text-slate-500 font-bold">
                          LKR {plan.originalPriceLkr?.toLocaleString()}
                        </span>
                        <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          LKR 0
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-extrabold text-[#0F172A] dark:text-white">
                        LKR {plan.priceLkr?.toLocaleString()}
                      </span>
                    )}
                    {!isFree && <span className="text-xs text-[#475569] dark:text-slate-400">/mo</span>}
                  </div>

                  {/* Free Promotion Badge */}
                  {plan.isFreePromotion && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                      <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Free Promotion Active</span>
                    </div>
                  )}

                  {/* 1-Month Free Trial Status Pill */}
                  {!plan.isFreePromotion && (
                    <div className="pt-1">
                      {plan.hasFreeTrial ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
                          <Gift className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          1-Month Free Trial ({plan.trialPeriodDays || 30} days)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-400 text-xs font-medium">
                          Standard Subscription
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Specifications & Quotas */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-[#E2E8F0] dark:border-slate-800/50">
                    <span className="text-[#475569] dark:text-slate-400 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                      Credit Points
                    </span>
                    <span className="font-bold text-[#0F172A] dark:text-white">{plan.credits?.toLocaleString()} pts</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#E2E8F0] dark:border-slate-800/50">
                    <span className="text-[#475569] dark:text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                      Max Connected Accounts
                    </span>
                    <span className="font-bold text-[#0F172A] dark:text-white">{plan.maxConnectedAccounts} channels</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#E2E8F0] dark:border-slate-800/50">
                    <span className="text-[#475569] dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      Post Scheduling
                    </span>
                    <span className={`font-semibold ${plan.hasScheduling ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {plan.hasScheduling ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#475569] dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                      AI Captions & Hashtags
                    </span>
                    <span className={`font-semibold ${plan.hasAiCaptions ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {plan.hasAiCaptions ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (Key Requirements) */}
              <div className="pt-5 mt-5 border-t border-[#E2E8F0] dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[#475569] dark:text-slate-400 mb-2">
                  <span>Assigned Users:</span>
                  <strong className="text-[#0F172A] dark:text-white font-bold">{userCount}</strong>
                </div>

                {/* Paid Plan Admin Actions: Promotional Toggle & Global Change to Free */}
                {!isFree && (
                  <div className="space-y-2 pt-1">
                    {/* 1. Promotional Pricing Toggle */}
                    <button
                      onClick={() => openPromoModal(plan)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border ${
                        plan.isFreePromotion
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>{plan.isFreePromotion ? 'Deactivate Free Promo' : 'Activate Free Promo (LKR 0)'}</span>
                    </button>

                    {/* 2. Global Change to Free Button (Explicit User Request) */}
                    <button
                      onClick={() => openGlobalFreeModal(plan)}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 hover:bg-red-500/20 dark:hover:bg-red-500/25 active:scale-[0.99]"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                      <span>Change All Users to Free</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => openEditModal(plan)}
                  className="w-full py-2 text-center text-xs font-semibold text-[#475569] dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
                >
                  Configure Package Settings →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* GLOBAL CHANGE TO FREE CONFIRMATION MODAL */}
      {globalFreeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111827] border border-red-500/40 rounded-2xl max-w-lg w-full p-6 text-[#0F172A] dark:text-white shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                Change All {globalFreeModal.plan.name} Users to Free
              </h3>
              <button
                onClick={() => setGlobalFreeModal(null)}
                className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 space-y-1">
                <p className="font-semibold text-sm text-red-700 dark:text-red-300">
                  Critical Administrator Action
                </p>
                <p className="leading-relaxed">
                  This action affects all users currently assigned to the <strong>{globalFreeModal.plan.name}</strong> plan.
                </p>
              </div>

              {/* Number of Affected Users */}
              <div className="bg-slate-50 dark:bg-[#1E293B] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] space-y-1">
                <span className="text-[#475569] dark:text-slate-400 block">Total Affected Accounts:</span>
                <span className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
                  {globalFreeModal.loading ? 'Calculating...' : `${globalFreeModal.stats?.totalAffected ?? 0} user accounts`}
                </span>
                <p className="text-[11px] text-[#475569] dark:text-slate-400">
                  Active paid subscriptions: {globalFreeModal.stats?.activeSubscriptionsCount ?? 0}
                </p>
              </div>

              {/* Migration Policy Selector */}
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1.5">
                  Contractual Migration Policy
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
                    <input
                      type="radio"
                      name="policy"
                      value="END_OF_PERIOD"
                      checked={globalFreeModal.policy === 'END_OF_PERIOD'}
                      onChange={() => setGlobalFreeModal({ ...globalFreeModal, policy: 'END_OF_PERIOD' })}
                      className="mt-0.5 text-cyan-500"
                    />
                    <div>
                      <span className="font-bold text-[#0F172A] dark:text-white block">End of Paid Billing Period (Recommended)</span>
                      <span className="text-[#475569] dark:text-slate-400 text-[11px] block">
                        Preserves paid features until the current already-paid month expires, then stops renewals and transitions account to Free.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
                    <input
                      type="radio"
                      name="policy"
                      value="IMMEDIATE"
                      checked={globalFreeModal.policy === 'IMMEDIATE'}
                      onChange={() => setGlobalFreeModal({ ...globalFreeModal, policy: 'IMMEDIATE' })}
                      className="mt-0.5 text-cyan-500"
                    />
                    <div>
                      <span className="font-bold text-[#0F172A] dark:text-white block">Immediate Transition</span>
                      <span className="text-[#475569] dark:text-slate-400 text-[11px] block">
                        Immediately switches all users on this plan to Free and cancels future recurring charges.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">Audit Log Reason</label>
                <input
                  type="text"
                  value={globalFreeModal.reason}
                  onChange={(e) => setGlobalFreeModal({ ...globalFreeModal, reason: e.target.value })}
                  placeholder="e.g. Platform promotion or tier discontinuation"
                  className="w-full bg-slate-50 dark:bg-[#070d1e] border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-[#0F172A] dark:text-white text-xs"
                />
              </div>

              {/* Explicit Confirmation Input */}
              <div className="pt-2">
                <label className="block text-red-600 dark:text-red-300 font-semibold mb-1">
                  Type <span className="font-mono bg-red-100 dark:bg-red-950 px-1 py-0.5 rounded text-red-700 dark:text-white">CONFIRM-{globalFreeModal.plan.planType}</span> to proceed:
                </label>
                <input
                  type="text"
                  value={globalFreeModal.confirmationText}
                  onChange={(e) => setGlobalFreeModal({ ...globalFreeModal, confirmationText: e.target.value })}
                  placeholder={`CONFIRM-${globalFreeModal.plan.planType}`}
                  className="w-full bg-slate-50 dark:bg-[#070d1e] border border-red-500/50 rounded-lg px-3 py-2 text-[#0F172A] dark:text-white font-mono text-xs focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setGlobalFreeModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#475569] dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleExecuteGlobalFree}
                  loading={globalFreeSubmitting}
                  disabled={globalFreeModal.confirmationText !== `CONFIRM-${globalFreeModal.plan.planType}`}
                  variant="primary"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  Confirm Global Migration to Free
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROMOTIONAL PRICING MODAL */}
      {promoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-slate-700 rounded-2xl max-w-md w-full p-6 text-[#0F172A] dark:text-white shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800 mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                {promoModal.isFreePromotion ? 'Activate Free Promotion' : 'Deactivate Free Promotion'}
              </h3>
              <button onClick={() => setPromoModal(null)} className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-[#475569] dark:text-slate-300 leading-relaxed">
                {promoModal.isFreePromotion
                  ? `Activating free promotional mode will update the public pricing page so that ${promoModal.plan.name} displays LKR 0 with the previous price struck through, labeled with a "Free Promotion" badge.`
                  : `Deactivating free promotional mode will restore ${promoModal.plan.name} to its configured price.`}
              </p>

              {promoModal.isFreePromotion && (
                <div>
                  <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">Promotion Label / Note</label>
                  <input
                    type="text"
                    value={promoModal.promotionNote}
                    onChange={(e) => setPromoModal({ ...promoModal, promotionNote: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#070d1e] border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-[#0F172A] dark:text-white text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPromoModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#475569] dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleExecutePromo}
                  loading={promoSubmitting}
                  variant="primary"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  {promoModal.isFreePromotion ? 'Apply Free Promotion' : 'Restore Standard Pricing'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PLAN MODAL */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 text-[#0F172A] dark:text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-slate-800 mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
                Configure Package: {editingPlan.name}
              </h3>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">Plan Display Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    className="w-full bg-slate-50 dark:bg-[#070d1e] border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-[#0F172A] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">Badge</label>
                  <input
                    type="text"
                    value={editFormData.badge}
                    onChange={(e) => setEditFormData({ ...editFormData, badge: e.target.value })}
                    placeholder="Most Popular"
                    className="w-full bg-slate-50 dark:bg-[#070d1e] border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-[#0F172A] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">Price in LKR</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editFormData.priceLkr}
                    onChange={(e) => setEditFormData({ ...editFormData, priceLkr: Number(e.target.value) })}
                    required
                    className="w-full bg-slate-50 dark:bg-[#070d1e] border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-[#0F172A] dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">Original Price (For Strikethrough)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editFormData.originalPriceLkr}
                    onChange={(e) => setEditFormData({ ...editFormData, originalPriceLkr: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-[#070d1e] border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-[#0F172A] dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">Credit Allowance</label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.credits}
                    onChange={(e) => setEditFormData({ ...editFormData, credits: Number(e.target.value) })}
                    required
                    className="w-full bg-slate-50 dark:bg-[#070d1e] border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-[#0F172A] dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">Max Connected Accounts</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editFormData.maxConnectedAccounts}
                    onChange={(e) => setEditFormData({ ...editFormData, maxConnectedAccounts: Number(e.target.value) })}
                    required
                    className="w-full bg-slate-50 dark:bg-[#070d1e] border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-[#0F172A] dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Status & Free Trial Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-[#070d1e] p-2.5 rounded-lg border border-[#E2E8F0] dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="rounded border-[#E2E8F0] dark:border-slate-700 text-blue-600"
                  />
                  <span>Active for New Signups</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-[#070d1e] p-2.5 rounded-lg border border-[#E2E8F0] dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={editFormData.hasFreeTrial}
                    onChange={(e) => setEditFormData({ ...editFormData, hasFreeTrial: e.target.checked })}
                    className="rounded border-[#E2E8F0] dark:border-slate-700 text-blue-600"
                  />
                  <span>1-Month Free Trial</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-[#070d1e] p-2.5 rounded-lg border border-[#E2E8F0] dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={editFormData.hasScheduling}
                    onChange={(e) => setEditFormData({ ...editFormData, hasScheduling: e.target.checked })}
                    className="rounded border-[#E2E8F0] dark:border-slate-700 text-blue-600"
                  />
                  <span>Post Scheduling</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-[#070d1e] p-2.5 rounded-lg border border-[#E2E8F0] dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={editFormData.hasAiCaptions}
                    onChange={(e) => setEditFormData({ ...editFormData, hasAiCaptions: e.target.checked })}
                    className="rounded border-[#E2E8F0] dark:border-slate-700 text-blue-600"
                  />
                  <span>AI Caption Suggestions</span>
                </label>
              </div>

              <div>
                <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-[#070d1e] border border-[#E2E8F0] dark:border-slate-700 rounded-lg p-2.5 text-[#0F172A] dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#475569] dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  loading={saving}
                  variant="primary"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPlansPage;
