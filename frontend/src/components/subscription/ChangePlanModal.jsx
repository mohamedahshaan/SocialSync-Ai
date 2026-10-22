import React, { useState } from 'react';
import {
  X,
  Check,
  AlertCircle,
  CreditCard,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
  Gift,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';

export function ChangePlanModal({
  isOpen,
  onClose,
  currentPlan = 'FREE',
  currentSubscription = null,
  allPlans = [],
  connectedAccountsCount = 0,
  onPlanChanged
}) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'payment_confirm' | 'downgrade_confirm'
  const [timing, setTiming] = useState('IMMEDIATE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment form state for card authorized transitions
  const [cardData, setCardData] = useState({
    cardholderName: '',
    cardNumber: '',
    expMonth: '12',
    expYear: '2028',
    cvc: ''
  });

  if (!isOpen) return null;

  // Standard fallback plans if allPlans array is empty
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
      description: 'Essential multi-network publishing for solo creators.'
    },
    {
      planType: 'CREATOR',
      name: 'Creator',
      priceLkr: 1000,
      priceUsd: 9.99,
      credits: 500,
      maxConnectedAccounts: 4,
      hasScheduling: true,
      hasAiCaptions: false,
      isFreePromotion: false,
      description: 'Ideal for scaling influencers and expanding brand reach.'
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
      description: 'Full AI capabilities and team automation for high volume publishing.'
    }
  ];

  const planList = allPlans && allPlans.length > 0 ? allPlans : defaultPlans;

  const handleSelectPlan = (plan) => {
    if (plan.planType === currentPlan) return;
    setSelectedPlan(plan);
    setError('');

    // Determine next step
    if (plan.planType === 'FREE') {
      setStep('downgrade_confirm');
    } else if (currentPlan === 'PROFESSIONAL' && plan.planType === 'CREATOR') {
      setStep('downgrade_confirm');
    } else {
      // Upgrade from FREE -> CREATOR/PRO or CREATOR -> PRO
      setStep('payment_confirm');
    }
  };

  const handleBackToSelect = () => {
    setStep('select');
    setError('');
  };

  const handleConfirmChange = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError('');

    try {
      // Basic card check if upgrading to a paid plan
      if (selectedPlan.planType !== 'FREE' && (!currentSubscription || !currentSubscription.paymentMethod)) {
        if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length < 15) {
          setError('Please provide a valid 16-digit payment card number.');
          setLoading(false);
          return;
        }
        if (!cardData.cardholderName.trim()) {
          setError('Cardholder name is required.');
          setLoading(false);
          return;
        }
      }

      const payload = {
        targetPlan: selectedPlan.planType,
        timing,
        cardData: selectedPlan.planType !== 'FREE' ? cardData : null
      };

      const res = await api.post('/subscriptions/change-plan', payload);
      if (res.success) {
        if (onPlanChanged) onPlanChanged(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to update plan.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while updating subscription.');
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (val) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    return raw.replace(/(\d{4})/g, '$1 ').trim();
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
        <div className="w-full max-w-4xl transform overflow-hidden rounded-3xl bg-white dark:bg-[#111827] p-6 sm:p-8 text-left align-middle shadow-2xl transition-all relative z-10 animate-fade-in border border-[#E2E8F0] dark:border-[#334155]">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#334155]">
            <div>
              <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                {step === 'select' ? 'Change Subscription Plan' : `Confirm Plan Change: ${selectedPlan?.name}`}
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                {step === 'select'
                  ? 'Switch your SocialSync AI tier at any time. Limits and credits update automatically.'
                  : 'Review the transition details, billing terms, and account limits before confirming.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-lg p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: PLAN SELECTION GRID */}
          {step === 'select' && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              {planList.map((plan) => {
                const isCurrent = plan.planType === currentPlan;
                const isPromo = Boolean(plan.isFreePromotion);

                return (
                  <div
                    key={plan.planType}
                    className={`relative rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                      isCurrent
                        ? 'border-brand-500/80 bg-brand-50/20 dark:bg-brand-950/30 ring-2 ring-brand-500/20 shadow-sm'
                        : 'border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                    }`}
                  >
                    {/* Current Plan Badge */}
                    {isCurrent && (
                      <span className="absolute -top-2.5 right-4 bg-brand-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Current Plan
                      </span>
                    )}

                    {/* Free Promo Badge */}
                    {isPromo && !isCurrent && (
                      <span className="absolute -top-2.5 right-4 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Gift className="w-3 h-3" /> Free Promo
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">{plan.name}</h4>
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        {isPromo ? (
                          <div className="space-y-0.5">
                            <span className="text-xs text-[#475569] dark:text-slate-400 line-through">
                              LKR {plan.originalPriceLkr || (plan.planType === 'CREATOR' ? 1000 : 2500)}
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">LKR 0</span>
                              <span className="text-xs text-[#475569] dark:text-slate-400">/ month</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                              LKR {plan.priceLkr?.toLocaleString()}
                            </span>
                            {plan.planType !== 'FREE' && (
                              <span className="text-xs text-[#475569] dark:text-slate-400">/ month</span>
                            )}
                          </div>
                        )}
                        <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] mt-1 line-clamp-2">{plan.description}</p>
                      </div>

                      {/* Feature checklist */}
                      <div className="space-y-2 py-3 border-t border-[#E2E8F0] dark:border-[#334155] text-xs">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                          <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                            <strong>{plan.credits}</strong> credits / period
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                          <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                            Up to <strong>{plan.maxConnectedAccounts}</strong> connected accounts
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {plan.hasScheduling ? (
                            <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className={plan.hasScheduling ? 'text-[#0F172A] dark:text-[#F8FAFC]' : 'text-slate-400 line-through'}>
                            Post scheduling
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {plan.hasAiCaptions ? (
                            <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className={plan.hasAiCaptions ? 'text-[#0F172A] dark:text-[#F8FAFC]' : 'text-slate-400 line-through'}>
                            AI caption suggestions
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#334155]">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold cursor-not-allowed"
                        >
                          Current Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelectPlan(plan)}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                            plan.planType === 'FREE'
                              ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-[#F8FAFC]'
                              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/20'
                          }`}
                        >
                          <span>{plan.planType === 'FREE' ? 'Switch to Free' : `Select ${plan.name}`}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 2: UPGRADE & PAYMENT CONFIRMATION */}
          {step === 'payment_confirm' && selectedPlan && (
            <div className="mt-6 space-y-5 animate-fade-in">
              {/* Transition Summary Banner */}
              <div className="p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/50 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Upgrading to {selectedPlan.name} Plan
                  </h4>
                  <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-0.5 leading-relaxed">
                    You are switching from <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{currentPlan}</span> to{' '}
                    <span className="font-semibold text-brand-600 dark:text-brand-400">{selectedPlan.name}</span>. Your credit allowance
                    increases to <strong>{selectedPlan.credits} credits</strong> and account limit expands to{' '}
                    <strong>{selectedPlan.maxConnectedAccounts} accounts</strong>.
                  </p>
                </div>
              </div>

              {/* Recurring Payment Disclosure */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#475569] dark:text-[#CBD5E1]">
                  <span className="font-semibold">Billing Frequency:</span>
                  <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">Monthly Recurring</span>
                </div>
                <div className="flex items-center justify-between text-[#475569] dark:text-[#CBD5E1]">
                  <span className="font-semibold">Plan Amount:</span>
                  <span className="font-extrabold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                    LKR {selectedPlan.priceLkr?.toLocaleString()} / month
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#475569] dark:text-[#CBD5E1]">
                  <span className="font-semibold">Effective Timing:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Immediate Activation</span>
                </div>
                <p className="text-[11px] text-[#475569] dark:text-slate-400 pt-2 border-t border-[#E2E8F0] dark:border-[#334155] leading-relaxed">
                  By confirming, you authorize SocialSync AI to charge your payment method{' '}
                  <strong>LKR {selectedPlan.priceLkr?.toLocaleString()}</strong> monthly on a recurring basis. You may
                  cancel anytime from your account settings before the next renewal date.
                </p>
              </div>

              {/* Payment Method Entry (if no saved method) */}
              <div className="border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 bg-white dark:bg-[#111827] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <h5 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">Payment Method (Recurring Card)</h5>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#475569] dark:text-slate-400">
                    <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>256-bit Encrypted</span>
                  </div>
                </div>

                {currentSubscription?.paymentMethod ? (
                  <div className="p-3 bg-slate-50 dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-6 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-200">
                        {currentSubscription.paymentMethod.brand}
                      </div>
                      <div>
                        <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                          •••• •••• •••• {currentSubscription.paymentMethod.last4}
                        </p>
                        <p className="text-[10px] text-[#475569] dark:text-slate-400">
                          Expires {currentSubscription.paymentMethod.expMonth}/{currentSubscription.paymentMethod.expYear}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Card on File
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={cardData.cardholderName}
                        onChange={(e) => setCardData({ ...cardData, cardholderName: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="4242 •••• •••• 4242"
                        value={cardData.cardNumber}
                        onChange={(e) => setCardData({ ...cardData, cardNumber: formatCardNumber(e.target.value) })}
                        maxLength={19}
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Exp Month</label>
                        <select
                          value={cardData.expMonth}
                          onChange={(e) => setCardData({ ...cardData, expMonth: e.target.value })}
                          className="w-full text-xs px-2.5 py-2 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-xl"
                        >
                          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Exp Year</label>
                        <select
                          value={cardData.expYear}
                          onChange={(e) => setCardData({ ...cardData, expYear: e.target.value })}
                          className="w-full text-xs px-2.5 py-2 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-xl"
                        >
                          {[2026, 2027, 2028, 2029, 2030, 2031, 2032].map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">CVC / CVV</label>
                        <input
                          type="password"
                          placeholder="•••"
                          value={cardData.cvc}
                          onChange={(e) => setCardData({ ...cardData, cvc: e.target.value.slice(0, 4) })}
                          maxLength={4}
                          className="w-full text-xs px-3 py-2 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-xl font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0] dark:border-[#334155]">
                <button
                  type="button"
                  onClick={handleBackToSelect}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
                >
                  Back to Plans
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#283548]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmChange}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 flex items-center gap-1.5"
                  >
                    {loading ? 'Authorizing...' : `Confirm & Upgrade (${selectedPlan.name})`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DOWNGRADE CONFIRMATION (e.g. Pro -> Creator or Creator/Pro -> Free) */}
          {step === 'downgrade_confirm' && selectedPlan && (
            <div className="mt-6 space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Switching to {selectedPlan.name} Plan
                  </h4>
                  <p className="text-xs text-amber-900 dark:text-amber-200 mt-0.5 leading-relaxed">
                    {selectedPlan.planType === 'FREE'
                      ? 'You are switching to the Free plan. Future recurring billing will stop immediately.'
                      : `You are moving from ${currentPlan} to ${selectedPlan.name}.`}
                  </p>
                </div>
              </div>

              {/* Connected accounts check */}
              {connectedAccountsCount > selectedPlan.maxConnectedAccounts && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Account Limit Guidance</span>
                  </div>
                  <p className="leading-relaxed">
                    You currently have <strong>{connectedAccountsCount} connected accounts</strong>, which exceeds the{' '}
                    <strong>{selectedPlan.maxConnectedAccounts} account limit</strong> of the {selectedPlan.name} plan.
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    Your existing accounts will NOT be deleted. However, you will not be able to connect new accounts or
                    publish to excess accounts until you bring your total within the plan limit.
                  </p>
                </div>
              )}

              {/* Policy explanation */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-2 text-xs text-[#475569] dark:text-[#CBD5E1]">
                <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>Downgrade Terms & Retained Access</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[#475569] dark:text-slate-400 text-[12px]">
                  {selectedPlan.planType === 'FREE' ? (
                    <>
                      <li>Your paid features remain active until the end of your currently paid cycle.</li>
                      <li>No further renewals will be charged to your card.</li>
                      <li>Your posts, analytics, and social connections are safely preserved.</li>
                    </>
                  ) : (
                    <>
                      <li>New allowance of {selectedPlan.credits} credits per billing cycle will take effect.</li>
                      <li>Post scheduling remains enabled.</li>
                      {!selectedPlan.hasAiCaptions && (
                        <li>AI caption suggestions will no longer be available.</li>
                      )}
                    </>
                  )}
                </ul>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0] dark:border-[#334155]">
                <button
                  type="button"
                  onClick={handleBackToSelect}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
                >
                  Back to Plans
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#283548]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmChange}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20"
                  >
                    {loading ? 'Updating...' : `Confirm Switch to ${selectedPlan.name}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
