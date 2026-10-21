import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Gift,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Tag,
  Clock,
  ShieldCheck,
  Save,
  RotateCcw,
  Percent,
  Check,
  Info
} from 'lucide-react';
import { api } from '../../services/api';

export function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(null);
  const [actionNotice, setActionNotice] = useState({ type: '', text: '' });

  // Plan editing local draft states keyed by planType
  const [planDrafts, setPlanDrafts] = useState({});

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/promotions');
      if (res.success && res.data) {
        const promoList = res.data.promotions || [];
        setPromotions(promoList);

        // Initialize draft states
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
        setPlanDrafts(drafts);
      }
    } catch (err) {
      console.error('Failed to load promotions:', err);
      setActionNotice({ type: 'error', text: err.message || 'Failed to fetch plan promotion settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const showNotice = (type, text) => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice({ type: '', text: '' }), 6000);
  };

  const handleDraftChange = (planType, field, value) => {
    setPlanDrafts((prev) => ({
      ...prev,
      [planType]: {
        ...prev[planType],
        [field]: value
      }
    }));
  };

  const handleSavePromotion = async (planType) => {
    const draft = planDrafts[planType];
    if (!draft) return;

    if (draft.promoStartDate && draft.promoEndDate && draft.promoStartDate > draft.promoEndDate) {
      showNotice('error', 'Offer start date must be on or before the end date.');
      return;
    }

    setSavingPlan(planType);
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
        showNotice('success', `Promotional campaign for ${planType} plan successfully updated!`);
        loadPromotions();
      } else {
        showNotice('error', res.message || 'Failed to update promotion settings.');
      }
    } catch (err) {
      showNotice('error', err.message || 'Error occurred while updating promotion.');
    } finally {
      setSavingPlan(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#4DBD45]/15 text-[#4DBD45] border border-[#4DBD45]/30">
            <span className="w-2 h-2 rounded-full bg-[#4DBD45] animate-pulse" />
            Live & Active
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#3B5BFF]/15 text-[#3B5BFF] dark:text-[#818cf8] border border-[#3B5BFF]/30">
            <Clock className="w-3.5 h-3.5" />
            Scheduled
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            Offer Expired
          </span>
        );
      case 'LIMIT_REACHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            Limit Reached
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-[#475569] dark:text-slate-400 border border-slate-500/20">
            Disabled / Inactive
          </span>
        );
    }
  };

  const paidPromos = promotions.filter((p) => p.isPaid);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Hero Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#3B5BFF]/10 via-[#7C3AED]/10 to-transparent border border-[#3B5BFF]/20 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B5BFF]/15 border border-[#3B5BFF]/30 text-[#3B5BFF] dark:text-[#818cf8] text-xs font-bold">
            <Gift className="w-3.5 h-3.5 text-[#3B5BFF]" />
            <span>Campaign Management Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white tracking-tight">
            Plan Offers & "1 Month Free" Promotions
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300 max-w-2xl leading-relaxed">
            Configure standalone "1 Month Free" promotional campaigns for individual paid plans. Changes apply independently without affecting other subscription tiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xs border border-[#3B5BFF]/30 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3B5BFF] to-[#7C3AED] text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-[#475569] dark:text-slate-400 uppercase tracking-wider font-bold block">
                Zero-Value Checkout
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                LKR 0.00 First Month
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-sm animate-fade-in ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-semibold">{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice({ type: '', text: '' })}
            className="font-bold underline text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {paidPromos.map((plan) => {
          const draft = planDrafts[plan.planType] || {};
          const isSaving = savingPlan === plan.planType;
          const isEnabled = Boolean(draft.promoEnabled);

          return (
            <div
              key={plan.planType}
              className={`rounded-3xl border transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between shadow-soft ${
                isEnabled
                  ? 'border-[#3B5BFF]/60 bg-gradient-to-b from-[#3B5BFF]/5 via-white to-white dark:from-[#1e1b4b]/20 dark:via-[#111827] dark:to-[#111827] ring-1 ring-[#3B5BFF]/20'
                  : 'border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827]'
              }`}
            >
              {/* Header */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#3B5BFF] dark:text-[#818cf8]">
                      Tier: {plan.planType}
                    </span>
                    <h3 className="text-2xl font-black text-[#0F172A] dark:text-white">
                      {plan.name} Plan
                    </h3>
                  </div>

                  <div>{getStatusBadge(plan.status)}</div>
                </div>

                {/* Pricing Comparison Preview */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#475569] dark:text-slate-400 block font-semibold">
                      Standard Monthly Rate:
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        isEnabled
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-[#0F172A] dark:text-white'
                      }`}
                    >
                      LKR {plan.priceLkr?.toLocaleString()} / mo
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-[#475569] dark:text-slate-400 block font-semibold">
                      Promotional Price:
                    </span>
                    <span
                      className={`text-xl font-black ${
                        isEnabled
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {isEnabled ? 'LKR 0.00' : '—'}
                    </span>
                  </div>
                </div>

                {/* Main Toggle: 1 Month Free */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#3B5BFF]/5 dark:bg-[#3B5BFF]/10 border border-[#3B5BFF]/20">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white block flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-[#3B5BFF]" />
                      "1 Month Free" Promotion Status
                    </span>
                    <span className="text-[11px] text-[#475569] dark:text-slate-400 block">
                      When enabled, eligible subscribers are charged LKR 0.00 for the first 30 days.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDraftChange(plan.planType, 'promoEnabled', !draft.promoEnabled)
                    }
                    className="cursor-pointer focus:outline-hidden"
                  >
                    {isEnabled ? (
                      <ToggleRight className="w-10 h-10 text-emerald-600 dark:text-emerald-400 transition-transform" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-slate-400 hover:text-slate-500" />
                    )}
                  </button>
                </div>

                {/* Promotion Form Fields */}
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Start Date */}
                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#3B5BFF]" />
                        Campaign Start Date
                      </label>
                      <input
                        type="date"
                        value={draft.promoStartDate || ''}
                        onChange={(e) =>
                          handleDraftChange(plan.planType, 'promoStartDate', e.target.value)
                        }
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                      />
                      <span className="text-[10px] text-[#475569] dark:text-slate-400 block mt-0.5">
                        Leave blank to start immediately
                      </span>
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#3B5BFF]" />
                        Campaign Expiry Date
                      </label>
                      <input
                        type="date"
                        value={draft.promoEndDate || ''}
                        onChange={(e) =>
                          handleDraftChange(plan.planType, 'promoEndDate', e.target.value)
                        }
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                      />
                      <span className="text-[10px] text-[#475569] dark:text-slate-400 block mt-0.5">
                        Leave blank for indefinite duration
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Eligibility Rule */}
                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#3B5BFF]" />
                        Eligibility Rule
                      </label>
                      <select
                        value={draft.promoEligibility || 'ONCE_PER_USER'}
                        onChange={(e) =>
                          handleDraftChange(plan.planType, 'promoEligibility', e.target.value)
                        }
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                      >
                        <option value="ONCE_PER_USER">Once Per User Account</option>
                        <option value="NEW_USERS_ONLY">New Subscribers Only (No Prior Subs)</option>
                        <option value="ALL_USERS">All Subscribers (Subject to limit)</option>
                      </select>
                    </div>

                    {/* Redemption Cap */}
                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#3B5BFF]" />
                        Max Redemptions (0 = Unlimited)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={draft.promoMaxRedemptions ?? 0}
                        onChange={(e) =>
                          handleDraftChange(plan.planType, 'promoMaxRedemptions', e.target.value)
                        }
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Promo Title & Description */}
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                      Promotional Offer Badge Title
                    </label>
                    <input
                      type="text"
                      placeholder="1 Month Free"
                      value={draft.promoTitle || ''}
                      onChange={(e) =>
                        handleDraftChange(plan.planType, 'promoTitle', e.target.value)
                      }
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                      Terms & Renewal Explanation (Shown at Checkout)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enjoy your first month completely free. Cancel anytime before renewal."
                      value={draft.promoDescription || ''}
                      onChange={(e) =>
                        handleDraftChange(plan.planType, 'promoDescription', e.target.value)
                      }
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white"
                    />
                  </div>

                  {/* Redemptions Counter Banner */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between text-xs">
                    <span className="text-[#475569] dark:text-slate-400 font-semibold">
                      Recorded Redemptions:
                    </span>
                    <span className="font-extrabold text-[#0F172A] dark:text-white">
                      {plan.promoCurrentRedemptions || 0}{' '}
                      {draft.promoMaxRedemptions > 0 ? `/ ${draft.promoMaxRedemptions}` : 'claimed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-6 border-t border-[#E2E8F0] dark:border-[#334155] mt-6 flex items-center justify-between gap-4">
                <span className="text-[11px] text-[#475569] dark:text-slate-400">
                  Plan ID: <strong className="text-[#0F172A] dark:text-white">{plan.planType}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => handleSavePromotion(plan.planType)}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white text-xs font-black shadow-md shadow-[#3B5BFF]/20 flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving Changes...' : `Save ${plan.name} Campaign`}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminPromotionsPage;
