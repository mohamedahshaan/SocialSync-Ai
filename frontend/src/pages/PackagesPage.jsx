import React, { useState, useEffect } from 'react';
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
  Flame
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ChangePlanModal } from '../components/subscription/ChangePlanModal';
import { CancelSubscriptionModal } from '../components/subscription/CancelSubscriptionModal';

export function PackagesPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        api.get('/plans'),
        api.get('/subscriptions/me')
      ]);

      if (plansRes.data?.plans) setPlans(plansRes.data.plans);
      if (subRes.data) setSubscriptionDetails(subRes.data);
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePlanChanged = (result) => {
    setActionNotice(result.message || 'Plan successfully updated.');
    loadData();
    setTimeout(() => setActionNotice(''), 6000);
  };

  const handleCancelled = (result) => {
    setActionNotice(result.message || 'Subscription cancellation scheduled. Access continues until your period end.');
    loadData();
    setTimeout(() => setActionNotice(''), 6000);
  };

  const currentPlanType = subscriptionDetails?.plan?.type || user?.plan || 'FREE';
  const sub = subscriptionDetails?.subscription;
  const isPaid = currentPlanType !== 'FREE';
  const isCancellationScheduled = sub?.cancelAtPeriodEnd || sub?.status === 'Cancellation Scheduled';

  // Standard fallback plans (Free: 200, Creator: 500, Professional: 1000)
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
      isFreePromotion: false,
      description: 'For growing influencers and content creators scaling their audience.'
    },
    {
      planType: 'PROFESSIONAL',
      name: 'Professional',
      priceLkr: 2500,
      priceUsd: 19.99,
      credits: 1000,
      maxConnectedAccounts: 6,
      hasScheduling: true,
      hasAiCaptions: true,
      isFreePromotion: false,
      description: 'Full AI caption automation and highest account allowances.'
    }
  ];

  const activePlans = plans.length > 0 ? plans : defaultPlans;

  return (
    <div className="space-y-10 animate-fade-in pb-20 max-w-7xl mx-auto">
      {/* Action Notification */}
      {actionNotice && (
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

      {/* ========================================================
          1. HERO HEADER WITH BADGE & CURRENCY SWITCHER
      ======================================================== */}
      <div className="relative text-center space-y-4 pt-4 sm:pt-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-600 dark:text-cyan-400 text-xs font-bold tracking-wide shadow-xs">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Simple, Transparent Subscription Plans</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight">
          Choose the Perfect Plan for Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500">Social Reach</span>
        </h1>

        <p className="text-sm sm:text-base text-[#475569] dark:text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
          Broadcast seamlessly across all 6 supported social networks. Upgrade or downgrade anytime with instant credit allocation.
        </p>
      </div>

      {/* ========================================================
          2. CURRENT ACTIVE TIER OVERVIEW BAR
      ======================================================== */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-7 shadow-soft border border-[#E2E8F0] dark:border-[#334155] flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-cyan-400">
              Your Current Status
            </span>
            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
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

          <h2 className="text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">
            {subscriptionDetails?.plan?.name || currentPlanType} Package
          </h2>

          <p className="text-xs text-[#475569] dark:text-[#CBD5E1] max-w-lg leading-relaxed">
            {isPaid
              ? `Billed LKR ${subscriptionDetails?.plan?.priceLkr?.toLocaleString()} per month. Next renewal date: ${
                  sub?.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'
                }.`
              : 'Free package with 200 monthly credits and up to 2 connected social channels.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl px-5 py-3 text-center min-w-[110px]">
            <span className="text-[10px] text-[#475569] dark:text-slate-400 block uppercase font-bold tracking-wider">
              Available Credits
            </span>
            <span className="text-xl font-black text-blue-600 dark:text-cyan-400 flex items-center justify-center gap-1">
              <Zap className="w-4 h-4 fill-current text-amber-500" />
              {subscriptionDetails?.user?.credits ?? user?.credits ?? 200}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl px-5 py-3 text-center min-w-[110px]">
            <span className="text-[10px] text-[#475569] dark:text-slate-400 block uppercase font-bold tracking-wider">
              Channels
            </span>
            <span className="text-xl font-black text-[#0F172A] dark:text-white">
              {subscriptionDetails?.usage?.connectedAccounts ?? 0} / {subscriptionDetails?.plan?.maxConnectedAccounts ?? 2}
            </span>
          </div>

          <button
            onClick={() => setIsChangeModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Switch / Upgrade Plan</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          3. 3 PACKAGES PRICING CARDS
      ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-7 items-stretch">
        {activePlans.map((plan) => {
          const isCurrent = plan.planType === currentPlanType;
          const isCreator = plan.planType === 'CREATOR';
          const isPro = plan.planType === 'PROFESSIONAL';
          const isPromo = Boolean(plan.isFreePromotion);

          const displayPrice = `LKR ${plan.priceLkr?.toLocaleString()}`;

          return (
            <div
              key={plan.planType}
              className={`relative rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 border ${
                isCurrent
                  ? 'border-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/20 ring-2 ring-cyan-500/30 shadow-lg'
                  : isCreator
                  ? 'border-blue-500/50 dark:border-cyan-500/50 bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-[#111c33] dark:via-[#111827] dark:to-[#111827] shadow-xl ring-1 ring-blue-500/20 hover:scale-[1.01]'
                  : isPro
                  ? 'border-purple-300 dark:border-purple-800/60 bg-gradient-to-b from-purple-50/30 via-white to-white dark:from-[#1d122e] dark:via-[#111827] dark:to-[#111827] shadow-lg hover:border-purple-400 dark:hover:border-purple-700'
                  : 'border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] shadow-soft hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Badges on Top */}
              {isCurrent && (
                <div className="absolute -top-3.5 right-6">
                  <span className="bg-cyan-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                    Current Active Tier
                  </span>
                </div>
              )}

              {isPromo && !isCurrent && (
                <div className="absolute -top-3.5 right-6">
                  <span className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Gift className="w-3 h-3" /> 1-Month Free Promotion
                  </span>
                </div>
              )}

              {!isCurrent && !isPromo && plan.hasFreeTrial && (
                <div className="absolute -top-3.5 right-6">
                  <span className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Gift className="w-3 h-3" /> 1-Month Free Option
                  </span>
                </div>
              )}

              {!isCurrent && !isPromo && !plan.hasFreeTrial && plan.badge && (
                <div className="absolute -top-3.5 right-6">
                  <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {plan.badge}
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                    {plan.name}
                  </h3>
                </div>

                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mb-6 leading-relaxed min-h-[36px]">
                  {plan.description}
                </p>

                {/* Price Box */}
                <div className="mb-6 pb-6 border-b border-[#E2E8F0] dark:border-[#334155]">
                  {isPromo ? (
                    <div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 line-through block">
                        LKR {(plan.originalPriceLkr || (isCreator ? 1000 : 2500)).toLocaleString()}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">LKR 0</span>
                        <span className="text-xs text-[#475569] dark:text-[#CBD5E1] font-semibold">/ first month</span>
                      </div>
                    </div>
                  ) : plan.hasFreeTrial ? (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">LKR 0</span>
                        <span className="text-xs text-[#475569] dark:text-[#CBD5E1] font-semibold">/ first month</span>
                      </div>
                      <span className="text-[11px] text-[#475569] dark:text-[#CBD5E1] block mt-1">
                        Then {displayPrice}/month automatically
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                        {displayPrice}
                      </span>
                      {plan.planType !== 'FREE' && (
                        <span className="text-xs text-[#475569] dark:text-[#CBD5E1] font-semibold">/ month</span>
                      )}
                    </div>
                  )}

                  {/* Highlights Pill */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-[#0F172A] dark:text-white">Credits Allowance:</span>
                    </div>
                    <span className="text-sm font-black text-blue-600 dark:text-cyan-400">
                      {plan.credits?.toLocaleString()} credits
                    </span>
                  </div>
                </div>

                {/* Feature Checklist */}
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                      Up to <strong>{plan.maxConnectedAccounts}</strong> connected channels
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                      All 6 social media networks
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                      Publishing history & logs
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {plan.hasScheduling ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
                          Smart post scheduling & calendar
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="text-slate-400 dark:text-slate-500 line-through">
                          Smart post scheduling
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {plan.hasAiCaptions ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
                          AI caption generator & Gemini Vision
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="text-slate-400 dark:text-slate-500 line-through">
                          AI caption suggestions
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {isCreator || isPro ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                          Priority publishing dispatch
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="text-slate-400 dark:text-slate-500 line-through">
                          Priority dispatch
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#1E293B] text-slate-400 dark:text-slate-500 cursor-not-allowed border border-[#E2E8F0] dark:border-[#334155]"
                  >
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsChangeModalOpen(true)}
                    className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:scale-[1.01] active:scale-95 ${
                      isCreator
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-500/25'
                        : isPro
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25'
                        : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/20'
                    }`}
                  >
                    <span>
                      {plan.planType === 'FREE'
                        ? 'Switch to Free Tier'
                        : plan.hasFreeTrial || isPromo
                        ? `Start 1-Month Free (${plan.name})`
                        : `Upgrade to ${plan.name}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
                <td className="py-3.5 px-3 text-center text-purple-600 dark:text-purple-400 font-extrabold">1,000 credits</td>
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
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">Publishing History & Logs</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Enabled</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Enabled</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Enabled</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">Post Scheduling & Calendar</td>
                <td className="py-3.5 px-3 text-center text-slate-400 dark:text-slate-500">✗ Disabled</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Enabled</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Enabled</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">AI Caption Generator & Vision Studio</td>
                <td className="py-3.5 px-3 text-center text-slate-400 dark:text-slate-500">✗ Disabled</td>
                <td className="py-3.5 px-3 text-center text-slate-400 dark:text-slate-500">✗ Disabled</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Enabled</td>
              </tr>
              <tr>
                <td className="py-3.5 px-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">Priority Queue Processing</td>
                <td className="py-3.5 px-3 text-center text-slate-400 dark:text-slate-500">Standard</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Priority</td>
                <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ High Priority</td>
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
              Monthly allowances (200 for Free, 500 for Creator, and 1,000 for Professional) refresh at each monthly billing cycle, ensuring you always have sufficient bandwidth for your publishing campaigns.
            </p>
          </div>
        </div>
      </div>

      {/* Change Plan Modal */}
      <ChangePlanModal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
        currentPlan={currentPlanType}
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
  );
}

export default PackagesPage;
