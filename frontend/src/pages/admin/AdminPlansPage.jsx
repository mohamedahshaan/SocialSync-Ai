import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers,
  CheckCircle2,
  X,
  CreditCard,
  Users,
  AlertCircle,
  Sparkles,
  Edit2,
  Gift,
  RefreshCw,
  ShieldCheck,
  Calendar,
  Check,
  ArrowRight,
  Tag,
  Info,
  Save,
  Flame,
  Crown
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { Button } from '../../components/common/Button';

export function AdminPlansPage() {


  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Promotions State
  const [promotions, setPromotions] = useState([]);
  const [promoDrafts, setPromoDrafts] = useState({});
  const [savingPromoPlan, setSavingPromoPlan] = useState(null);

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
    hasCollageStudio: false,
    hasPriorityDispatch: false,
    hasFreeTrial: false,
    trialPeriodDays: 30,
    isActive: true,
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Promotional Pricing Modal State
  const [promoModal, setPromoModal] = useState(null);
  const [promoSubmitting, setPromoSubmitting] = useState(false);

  // Automated billing runner state
  const [billingRunning, setBillingRunning] = useState(false);
  const [billingReport, setBillingReport] = useState(null);

  // Close modals on Escape key press and lock background scroll
  useEffect(() => {
    const isAnyModalOpen = Boolean(editingPlan || promoModal);
    if (!isAnyModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!saving) setEditingPlan(null);
        if (!promoSubmitting) setPromoModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingPlan, promoModal, saving, promoSubmitting]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [plansRes, dashRes, subsRes, promosRes] = await Promise.all([
        api.get('/admin/plans'),
        api.get('/admin/dashboard'),
        api.get('/admin/subscriptions').catch(() => ({ data: { subscriptions: [] } })),
        api.get('/admin/promotions').catch(() => null)
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
      if (promosRes?.success && promosRes.data?.promotions) {
        const promoList = promosRes.data.promotions;
        setPromotions(promoList);
        const drafts = {};
        promoList.forEach((p) => {
          drafts[p.planType] = {
            promoEnabled: Boolean(p.promoEnabled),
            promoPriceLkr: p.promoPriceLkr ?? 0.0,
            promoStartDate: p.promoStartDate ? p.promoStartDate.substring(0, 10) : '',
            promoEndDate: p.promoEndDate ? p.promoEndDate.substring(0, 10) : '',
            promoEligibility: p.promoEligibility || 'ONCE_PER_USER',
            promoMaxRedemptions: p.promoMaxRedemptions || 0,
            promoTitle: p.promoTitle || '1 Month Free',
            promoDescription:
              p.promoDescription || 'Enjoy your first month completely free. Cancel anytime before renewal.'
          };
        });
        setPromoDrafts(drafts);
      }
    } catch (err) {
      console.error('Failed to load plans management data:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to fetch plan configurations'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Promotion Draft Changes
  const handlePromoDraftChange = (planType, field, value) => {
    setPromoDrafts((prev) => ({
      ...prev,
      [planType]: {
        ...prev[planType],
        [field]: value
      }
    }));
  };

  const handleSavePromotion = async (planType) => {
    const draft = promoDrafts[planType];
    if (!draft) return;

    if (draft.promoStartDate && draft.promoEndDate && draft.promoStartDate > draft.promoEndDate) {
      setNotification({ type: 'error', message: 'Offer start date must be on or before the end date.' });
      return;
    }

    setSavingPromoPlan(planType);
    try {
      const res = await api.put(`/admin/promotions/${planType}`, {
        promoEnabled: draft.promoEnabled,
        promoPriceLkr: 0.0,
        promoStartDate: draft.promoStartDate ? new Date(draft.promoStartDate).toISOString() : null,
        promoEndDate: draft.promoEndDate ? new Date(`${draft.promoEndDate}T23:59:59.999Z`).toISOString() : null,
        promoEligibility: draft.promoEligibility,
        promoMaxRedemptions: parseInt(draft.promoMaxRedemptions, 10) || 0,
        promoTitle: draft.promoTitle,
        promoDescription: draft.promoDescription
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Promotional settings for ${planType} saved successfully.`
        });
        await fetchAllData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || `Failed to update promotions for ${planType}`
      });
    } finally {
      setSavingPromoPlan(null);
    }
  };

  // Automated billing runner
  const handleTriggerAutoBilling = async () => {
    try {
      setBillingRunning(true);
      const res = await api.post('/admin/subscriptions/process-billing');
      if (res.success && res.data) {
        setBillingReport(res.data);
        setNotification({
          type: 'success',
          message: `Automated card detection complete! Processed ${res.data.processedCount} subscriptions, charged LKR ${res.data.totalAmountChargedLkr.toLocaleString()}.`
        });
        await fetchAllData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Billing check failed'
      });
    } finally {
      setBillingRunning(false);
    }
  };

  // Plan Edit Modal
  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setEditFormData({
      name: plan.name || '',
      badge: plan.badge || '',
      priceLkr: plan.priceLkr || 0,
      priceUsd: plan.priceUsd || 0,
      originalPriceLkr: plan.originalPriceLkr || plan.priceLkr || 0,
      credits: plan.credits || 0,
      maxConnectedAccounts: plan.maxConnectedAccounts || 2,
      hasScheduling: Boolean(plan.hasScheduling),
      hasAiCaptions: Boolean(plan.hasAiCaptions),
      hasCollageStudio: Boolean(plan.hasCollageStudio),
      hasPriorityDispatch: Boolean(plan.hasPriorityDispatch),
      hasFreeTrial: Boolean(plan.hasFreeTrial),
      trialPeriodDays: plan.trialPeriodDays || 30,
      isActive: plan.isActive !== undefined ? plan.isActive : true,
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
          message: `Package plan ${editingPlan.name} updated successfully.`
        });
        setEditingPlan(null);
        await fetchAllData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update plan configuration'
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle Promotional Pricing
  const openPromoModal = (plan) => {
    setPromoModal({
      plan,
      isFreePromotion: !plan.isFreePromotion,
      promotionNote: plan.promotionNote || 'Currently Free — Limited Time Free Promotion'
    });
  };

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
        message: err.message || 'Failed to update promotion state'
      });
    } finally {
      setPromoSubmitting(false);
    }
  };

  if (loading && plans.length === 0) {
    return <LoadingState message="Loading plans and monetization architecture..." />;
  }

  const tabs = [
    { id: 'plans', label: 'Plan Configurations', icon: Layers },
    { id: 'promotions', label: 'Offers & Promotions', icon: Gift }
  ];

  return (
    <div className="space-y-6 font-sans pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
              Plans & Monetization Central
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Authoritative SaaS Engine
            </span>
          </div>
          <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-1">
            Centralized management for subscription tiers and promotional offers.
          </p>
        </div>

        {/* Action Button: Automated Billing Runner */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleTriggerAutoBilling}
            loading={billingRunning}
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${billingRunning ? 'animate-spin' : ''}`} />
            <span>Detect & Charge Expired Trials</span>
          </Button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/10 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Package Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        {plans.map((plan) => {
          const userCount = stats[plan.planType] || 0;
          const isCreator = plan.planType === 'CREATOR';
          const isPro = plan.planType === 'PROFESSIONAL';
          const isFree = plan.planType === 'FREE';

          return (
            <div
              key={plan.id || plan.planType}
              className={`rounded-3xl p-6 flex flex-col justify-between transition-all relative border ${
                isCreator
                  ? 'bg-blue-50/40 dark:bg-[#0f1b3b] border-blue-300 dark:border-blue-500/50 shadow-xl shadow-blue-500/10'
                  : isPro
                  ? 'bg-purple-50/40 dark:bg-[#1b0d30] border-purple-300 dark:border-purple-500/50 shadow-xl shadow-purple-500/10'
                  : 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#334155] shadow-soft'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isPro && <Crown className="w-5 h-5 text-purple-600" />}
                    {isCreator && <Flame className="w-5 h-5 text-blue-600" />}
                    {isFree && <Layers className="w-5 h-5 text-slate-500" />}
                    <h3 className="text-xl font-black text-[#0F172A] dark:text-white">{plan.name}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {plan.planType}
                  </span>
                </div>

                <p className="text-xs text-[#475569] dark:text-slate-400 mb-4 min-h-[32px]">
                  {plan.description}
                </p>

                {/* Price Box */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] mb-4">
                  <div className="flex items-baseline justify-between gap-1.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-[#0F172A] dark:text-white">
                        LKR {Number(plan.priceLkr || 0).toLocaleString()}
                      </span>
                      {!isFree && <span className="text-xs text-slate-400">/ month</span>}
                    </div>
                    {plan.isFreePromotion && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Free Promo Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Specifications */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#E2E8F0] dark:border-slate-800">
                    <span className="text-slate-400">Monthly Credits:</span>
                    <strong className="text-[#0F172A] dark:text-white font-mono">{plan.credits?.toLocaleString()} pts</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E2E8F0] dark:border-slate-800">
                    <span className="text-slate-400">Max Social Accounts:</span>
                    <strong className="text-[#0F172A] dark:text-white">{plan.maxConnectedAccounts} channels</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E2E8F0] dark:border-slate-800">
                    <span className="text-slate-400">Scheduling:</span>
                    <span className={`font-semibold ${plan.hasScheduling ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {plan.hasScheduling ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E2E8F0] dark:border-slate-800">
                    <span className="text-slate-400">Collage Studio:</span>
                    <span className={`font-semibold ${plan.hasCollageStudio ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {plan.hasCollageStudio ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">AI Captions & Vision:</span>
                    <span className={`font-semibold ${plan.hasAiCaptions ? 'text-purple-600' : 'text-slate-400'}`}>
                      {plan.hasAiCaptions ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 mt-4 border-t border-[#E2E8F0] dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Assigned Users:</span>
                  <strong className="text-[#0F172A] dark:text-white font-bold">{userCount}</strong>
                </div>

                {!isFree && (
                  <button
                    onClick={() => openPromoModal(plan)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border cursor-pointer ${
                      plan.isFreePromotion
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>{plan.isFreePromotion ? 'Deactivate Free Promo' : 'Activate Free Promo (LKR 0)'}</span>
                  </button>
                )}

                <button
                  onClick={() => openEditModal(plan)}
                  className="w-full py-2 text-center text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Configure Plan Fields →
                </button>
              </div>
            </div>
          );
        })}
      </div>



      {/* ========================================================
          MODAL: EDIT PACKAGE PLAN
      ======================================================== */}
      {editingPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
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
            onClick={() => !saving && setEditingPlan(null)}
            aria-hidden="true"
          />

          <div
            className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl w-full p-6 shadow-2xl space-y-4 animate-scale-up relative z-10 flex flex-col overflow-hidden"
            style={{
              width: 'min(540px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0">
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                Configure {editingPlan.name} Plan
              </h3>
              <button
                onClick={() => !saving && setEditingPlan(null)}
                className="text-slate-400 hover:text-black dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs overflow-y-auto flex-1 min-h-0 pr-0.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. Most Popular"
                    value={editFormData.badge}
                    onChange={(e) => setEditFormData({ ...editFormData, badge: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Price (LKR / Month)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editFormData.priceLkr}
                    onChange={(e) => setEditFormData({ ...editFormData, priceLkr: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-[#0F172A] dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Credits Allowance</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editFormData.credits}
                    onChange={(e) => setEditFormData({ ...editFormData, credits: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-[#0F172A] dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Max Connected Accounts</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  required
                  value={editFormData.maxConnectedAccounts}
                  onChange={(e) => setEditFormData({ ...editFormData, maxConnectedAccounts: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#334155] shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ========================================================
          MODAL: TOGGLE PROMO (LKR 0)
      ======================================================== */}
      {promoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
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
            onClick={() => !promoSubmitting && setPromoModal(null)}
            aria-hidden="true"
          />

          <div
            className="bg-white dark:bg-[#111827] border border-blue-500/40 rounded-3xl w-full p-6 shadow-2xl space-y-4 animate-scale-up relative z-10 flex flex-col overflow-hidden"
            style={{
              width: 'min(480px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-blue-600 pb-3 border-b border-blue-500/20 shrink-0">
              <Tag className="w-5 h-5" />
              <h3 className="text-base font-bold">
                {promoModal.isFreePromotion ? 'Activate Free Mode' : 'Deactivate Free Mode'}
              </h3>
            </div>
            <div className="space-y-4 text-xs overflow-y-auto flex-1 min-h-0 pr-0.5">
              <p className="text-xs text-slate-400 leading-relaxed">
                {promoModal.isFreePromotion
                  ? `Activate limited-time free mode for ${promoModal.plan.name} (LKR 0). Users can subscribe without card charges.`
                  : `Deactivate free mode for ${promoModal.plan.name}. Standard pricing (LKR ${promoModal.plan.priceLkr}/mo) will resume.`}
              </p>
              <form onSubmit={handleExecutePromo} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Promotion Note</label>
                  <input
                    type="text"
                    value={promoModal.promotionNote}
                    onChange={(e) => setPromoModal((prev) => ({ ...prev, promotionNote: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-500/20 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPromoModal(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={promoSubmitting}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {promoSubmitting ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPlansPage;
