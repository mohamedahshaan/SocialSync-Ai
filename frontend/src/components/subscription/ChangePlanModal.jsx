import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  AlertTriangle,
  Zap,
  Crown,
  Users,
  Loader2,
  MapPin,
  Phone,
  User as UserIcon,
  Building,
  Clock,
  Wand2
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function ChangePlanModal({
  isOpen,
  onClose,
  currentPlan = 'FREE',
  currentSubscription = null,
  allPlans = [],
  connectedAccountsCount = 0,
  targetPlan = null,
  onPlanChanged
}) {
  const { user, updateUser, refreshUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(targetPlan || null);
  const [step, setStep] = useState('select'); // 'select' | 'payment_confirm' | 'downgrade_confirm' | 'awaiting_payment'
  const [timing, setTiming] = useState('IMMEDIATE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [activeOrderId, setActiveOrderId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [trialConsentAgreed, setTrialConsentAgreed] = useState(false);
  const modalContainerRef = useRef(null);

  // Billing contact details state - strictly prefilled from user profile (no dummy fallbacks)
  const [billingContact, setBillingContact] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    country: 'Sri Lanka'
  });

  // Pre-fill values from the authenticated user's saved profile when available
  useEffect(() => {
    if (user) {
      const nameParts = (user.name || '').trim().split(/\s+/);
      const defaultFirst = nameParts[0] || '';
      const defaultLast = nameParts.slice(1).join(' ') || '';

      setBillingContact({
        firstName: defaultFirst,
        lastName: defaultLast,
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || 'Sri Lanka'
      });
    }
  }, [user]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Standard fallback plans
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
      credits: 1500,
      maxConnectedAccounts: 6,
      hasScheduling: true,
      hasAiCaptions: true,
      isFreePromotion: false,
      description: 'Full AI capabilities and team automation for high volume publishing.'
    }
  ];

  const planList = allPlans && allPlans.length > 0 ? allPlans : defaultPlans;

  // Sync state whenever modal opens or targetPlan changes
  useEffect(() => {
    if (isOpen) {
      setError('');
      setValidationErrors({});
      setTrialConsentAgreed(false);
      if (targetPlan) {
        setSelectedPlan(targetPlan);
        const isDowngrade =
          targetPlan.planType === 'FREE' ||
          (currentPlan === 'PROFESSIONAL' && targetPlan.planType === 'CREATOR');
        setStep(isDowngrade ? 'downgrade_confirm' : 'payment_confirm');
      } else {
        setSelectedPlan(null);
        setStep('select');
      }
    }
  }, [isOpen, targetPlan, currentPlan]);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  // Background poller while in awaiting_payment state to auto-detect verified status
  useEffect(() => {
    let poller = null;
    if (isOpen && step === 'awaiting_payment' && activeOrderId) {
      let checks = 0;
      poller = setInterval(async () => {
        checks++;
        if (checks > 25) {
          clearInterval(poller);
          return;
        }
        try {
          const res = await api.get('/subscriptions/me');
          if (res?.data?.plan?.type === selectedPlan?.planType) {
            clearInterval(poller);
            if (updateUser) updateUser(res.data.user);
            if (refreshUser) refreshUser();
            if (onPlanChanged) onPlanChanged(res.data);
            onClose();
          }
        } catch {
          // Continue polling
        }
      }, 3000);
    }
    return () => {
      if (poller) clearInterval(poller);
    };
  }, [isOpen, step, activeOrderId, selectedPlan]);

  const verifyAndActivatePayment = async (orderIdToConfirm, isSilent = false) => {
    const targetOrderId = orderIdToConfirm || activeOrderId;
    if (!targetOrderId) return false;
    if (!isSilent) setVerifying(true);
    setError('');
    try {
      const confirmRes = await api.post('/subscriptions/confirm-payment', {
        orderId: targetOrderId
      });
      if (confirmRes?.success && confirmRes.data?.user) {
        if (updateUser) updateUser(confirmRes.data.user);
        if (refreshUser) refreshUser();
        if (onPlanChanged) {
          onPlanChanged(confirmRes.data);
        }
        onClose();
        return true;
      }
    } catch (err) {
      console.warn('Payment verification attempt:', err);
      if (!isSilent) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Payment not yet confirmed by gateway. Please complete the checkout in PayHere and click Verify again.'
        );
      }
    } finally {
      if (!isSilent) setVerifying(false);
    }
    return false;
  };

  const handleInputChange = (field, value) => {
    setBillingContact((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (error) setError('');
  };

  const validateBillingForm = () => {
    const errors = {};
    if (!billingContact.firstName?.trim()) {
      errors.firstName = 'First name is required.';
    }
    const phoneTrimmed = billingContact.phone?.trim() || '';
    if (!phoneTrimmed) {
      errors.phone = 'Phone number is required by PayHere.';
    } else if (!/^[0-9+\-\s()]{7,20}$/.test(phoneTrimmed)) {
      errors.phone = 'Please enter a valid phone number.';
    }
    const cityTrimmed = billingContact.city?.trim() || '';
    if (!cityTrimmed) {
      errors.city = 'City is required by PayHere.';
    } else if (cityTrimmed.length < 2) {
      errors.city = 'City must be at least 2 characters.';
    }
    const addressTrimmed = billingContact.address?.trim() || '';
    if (!addressTrimmed) {
      errors.address = 'Street address is required by PayHere.';
    } else if (addressTrimmed.length < 3) {
      errors.address = 'Street address must be at least 3 characters.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSelectPlan = (plan) => {
    if (plan.planType === currentPlan) return;
    setSelectedPlan(plan);
    setError('');
    setValidationErrors({});

    const isDowngrade =
      plan.planType === 'FREE' ||
      (currentPlan === 'PROFESSIONAL' && plan.planType === 'CREATOR');

    setStep(isDowngrade ? 'downgrade_confirm' : 'payment_confirm');
  };

  const handleBackToSelect = () => {
    if (targetPlan) {
      onClose();
    } else {
      setStep('select');
      setError('');
      setValidationErrors({});
    }
  };

  const isAdminUser = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);
  const isSelectedPromo = !isAdminUser && Boolean(
    selectedPlan?.isPromoActive && selectedPlan?.promoStatus === 'ACTIVE'
  );

  const expectedFirstChargeDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  })();

  const handleConfirmChange = async () => {
    if (!selectedPlan) return;

    // 1. FREE PLAN SWITCH
    if (selectedPlan.planType === 'FREE') {
      setLoading(true);
      setError('');
      try {
        const res = await api.post('/subscriptions/change-plan', {
          targetPlan: 'FREE',
          timing
        });
        if (res.success) {
          if (res.data?.user && updateUser) updateUser(res.data.user);
          if (refreshUser) refreshUser();
          if (onPlanChanged) onPlanChanged(res.data);
          onClose();
        } else {
          setError(res.message || 'Failed to update plan.');
        }
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Failed to update plan.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // 2. PROMOTIONAL ONE-MONTH FREE TRIAL ACTIVATION
    if (isSelectedPromo) {
      if (!trialConsentAgreed) {
        setError('Please check the box to agree to the recurring subscription terms and trial duration before activating.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await api.post('/subscriptions/activate-trial', {
          planType: selectedPlan.planType,
          consentAgreed: true
        });
        if (res.success) {
          if (res.data?.user && updateUser) updateUser(res.data.user);
          if (refreshUser) refreshUser();
          if (onPlanChanged) onPlanChanged(res.data);
          window.dispatchEvent(new CustomEvent('socialsync:plan_updated', { detail: res.data.user }));
          onClose();
        } else {
          setError(res.message || 'Failed to activate promotional free trial.');
        }
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Failed to activate promotional free trial.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // 3. REGULAR PAID UPGRADE (Creator or Professional)
    // Step 3.1: Validate required billing fields before checkout
    const isValid = validateBillingForm();
    if (!isValid) {
      setError('Please provide all required billing contact fields before proceeding to PayHere.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const trimmedPhone = billingContact.phone.trim();
      const trimmedAddress = billingContact.address.trim();
      const trimmedCity = billingContact.city.trim();
      const trimmedFirstName = billingContact.firstName.trim();
      const trimmedLastName = billingContact.lastName.trim();

      // Step 3.2: Call backend authoritative checkout-session endpoint
      const sessionRes = await api.post('/subscriptions/checkout-session', {
        plan: selectedPlan.planType,
        amount: selectedPlan.priceLkr,
        currency: 'LKR',
        billingCycle: 'ONE_TIME',
        returnUrl: `${window.location.origin}/packages?payment=success`,
        cancelUrl: `${window.location.origin}/packages?payment=cancelled`,
        customer: {
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: user?.email,
          phone: trimmedPhone,
          address: trimmedAddress,
          city: trimmedCity,
          country: billingContact.country || 'Sri Lanka'
        }
      });

      if (sessionRes?.success && sessionRes.data?.payhere?.hash) {
        const payhereData = sessionRes.data.payhere;
        const formAction = payhereData.actionUrl || 'https://sandbox.payhere.lk/pay/checkout';

        // Update local user context with the saved billing details for instant continuity
        if (updateUser) {
          updateUser({
            ...user,
            phone: trimmedPhone,
            address: trimmedAddress,
            city: trimmedCity,
            country: billingContact.country || 'Sri Lanka'
          });
        }

        // Step 3.3: Submit via standard PayHere HTML form POST to hosted sandbox checkout URL
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = formAction;
        form.style.display = 'none';

        const postFields = {
          merchant_id: payhereData.merchant_id,
          return_url: payhereData.return_url,
          cancel_url: payhereData.cancel_url,
          notify_url: payhereData.notify_url,
          order_id: payhereData.order_id,
          items: payhereData.items,
          currency: payhereData.currency,
          amount: payhereData.amount,
          first_name: payhereData.first_name,
          last_name: payhereData.last_name,
          email: payhereData.email,
          phone: payhereData.phone,
          address: payhereData.address,
          city: payhereData.city,
          country: payhereData.country,
          hash: payhereData.hash,
          custom_1: payhereData.custom_1,
          custom_2: payhereData.custom_2
        };

        if (payhereData.recurrence) postFields.recurrence = payhereData.recurrence;
        if (payhereData.duration) postFields.duration = payhereData.duration;

        Object.entries(postFields).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = String(v);
            form.appendChild(input);
          }
        });

        document.body.appendChild(form);
        form.submit();
        return;
      } else {
        const errMessage =
          sessionRes?.message ||
          sessionRes?.data?.message ||
          'Unable to initialize PayHere checkout session. Please check your connection and try again.';
        setError(errMessage);
        setLoading(false);
      }
    } catch (err) {
      console.error('[PAYHERE_CHECKOUT_ERROR]', err?.response?.data || err?.message);
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to start PayHere hosted checkout.';
      setError(backendMessage);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop: subtle dark tint with minimal 2px blur */}
      <div
        className="fixed inset-0 transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)'
        }}
        onClick={!loading ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Window: completely sharp, no inherited blur, viewport-aware max-height, sticky header & footer */}
      <div
        ref={modalContainerRef}
        className="relative z-10 w-full flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0F172A] text-left align-middle shadow-2xl transition-all border border-slate-200/90 dark:border-slate-800 overflow-hidden overflow-x-hidden my-auto"
        style={{
          width: 'min(680px, calc(100vw - 32px))',
          maxHeight: 'calc(100dvh - 32px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
          {/* ========================================================
              1. STICKY HEADER (Always visible)
          ======================================================== */}
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-white dark:bg-[#0F172A]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100/80 dark:border-indigo-900/40 shadow-xs">
                {step === 'select' ? (
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                ) : step === 'downgrade_confirm' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <Crown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <div>
                <h3 id="modal-title" className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {step === 'select'
                    ? 'Choose Your Subscription Plan'
                    : step === 'downgrade_confirm'
                    ? `Switch to ${selectedPlan?.name} Tier`
                    : isSelectedPromo
                    ? `Activate 1-Month Free Trial: ${selectedPlan?.name}`
                    : `Upgrade to ${selectedPlan?.name || 'Selected'} Plan`}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {step === 'select'
                    ? 'Select the plan that best fits your publishing scale.'
                    : step === 'downgrade_confirm'
                    ? 'Review adjustments to your account allowances and active features.'
                    : isSelectedPromo
                    ? 'Enjoy 1 calendar month of full access. Zero charge today.'
                    : 'Review plan features and continue to PayHere Sandbox checkout.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Close dialog"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg p-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ========================================================
              2. SCROLLABLE BODY
          ======================================================== */}
          <div className="px-5 py-3.5 overflow-y-auto flex-1 space-y-3 text-slate-800 dark:text-slate-200">
            {/* Global Error Banner */}
            {error && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs rounded-2xl flex items-start justify-between gap-2.5 animate-fade-in shadow-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
                {step === 'payment_confirm' && (
                  <button
                    type="button"
                    onClick={handleConfirmChange}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* --------------------------------------------------------
                VIEW A: PLAN SELECTOR (Fallback if targetPlan not set)
            -------------------------------------------------------- */}
            {step === 'select' && (
              <div className="space-y-3">
                {planList.map((plan) => {
                  const isCurrent = plan.planType === currentPlan;
                  const isPromo = !isAdminUser && Boolean(plan.isPromoActive && plan.promoStatus === 'ACTIVE');

                  return (
                    <div
                      key={plan.planType}
                      onClick={() => !isCurrent && handleSelectPlan(plan)}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                        isCurrent
                          ? 'border-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/20 cursor-default'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {plan.name}
                          </span>
                          {isCurrent && (
                            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Current Plan
                            </span>
                          )}
                          {isPromo && !isCurrent && (
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                              <Gift className="w-2.5 h-2.5" /> Free Promotion
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md whitespace-nowrap">
                            <Zap className="w-3 h-3 text-sky-500 fill-current" />
                            {plan.credits} credits
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md whitespace-nowrap">
                            <Users className="w-3 h-3 text-purple-500" />
                            {plan.maxConnectedAccounts} channels
                          </span>
                          {plan.hasScheduling && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md whitespace-nowrap">
                              <Clock className="w-3 h-3 text-amber-500" />
                              Scheduling
                            </span>
                          )}
                          {plan.hasAiCaptions && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md whitespace-nowrap">
                              <Wand2 className="w-3 h-3 text-pink-500" />
                              AI Vision
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-slate-900 dark:text-white">
                          {plan.planType === 'FREE' ? (
                            'Free'
                          ) : isPromo && !isCurrent ? (
                            <>
                              <span className="text-xs line-through text-slate-400 mr-1.5">
                                LKR {plan.priceLkr?.toLocaleString()}
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                                LKR 0
                              </span>
                              <span className="text-[11px] font-normal text-slate-400">/1st mo</span>
                            </>
                          ) : (
                            <>
                              LKR {plan.priceLkr?.toLocaleString()}
                              <span className="text-[11px] font-normal text-slate-400">/mo</span>
                            </>
                          )}
                        </div>
                        {!isCurrent && (
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-end gap-1 mt-1">
                            Select <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* --------------------------------------------------------
                VIEW B: PAYMENT CONFIRMATION (Creator & Professional)
            -------------------------------------------------------- */}
            {step === 'payment_confirm' && selectedPlan && (
              <div className="space-y-3">
                {/* 1. Visually Stunning Executive Plan Summary Box */}
                <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/90 via-blue-50/40 to-purple-50/30 dark:from-indigo-950/40 dark:via-slate-900/70 dark:to-purple-950/30 p-4 sm:p-5 shadow-sm transition-all">
                  {/* Top Section: Plan Identity & Price */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-indigo-100/80 dark:border-indigo-900/40">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform ${
                          selectedPlan.planType === 'PROFESSIONAL'
                            ? 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-indigo-500/25 ring-2 ring-purple-400/20'
                            : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/25 ring-2 ring-blue-400/20'
                        }`}
                      >
                        {selectedPlan.planType === 'PROFESSIONAL' ? (
                          <Crown className="w-6 h-6" />
                        ) : (
                          <Zap className="w-6 h-6 fill-current" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {selectedPlan.name} Plan
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-2xs ${
                              isSelectedPromo
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                : selectedPlan.planType === 'PROFESSIONAL'
                                ? 'bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-950/80 dark:to-indigo-950/80 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80'
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80'
                            }`}
                          >
                            {isSelectedPromo ? (
                              <>
                                <Gift className="w-3 h-3 text-emerald-600" />
                                1-Month Free Promo
                              </>
                            ) : selectedPlan.planType === 'PROFESSIONAL' ? (
                              <>
                                <Sparkles className="w-3 h-3 text-purple-600" />
                                Full AI Suite
                              </>
                            ) : (
                              'Creator Growth'
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          {selectedPlan.planType === 'PROFESSIONAL'
                            ? 'Complete multi-network publishing suite with AI Vision & priority dispatch.'
                            : 'Essential publishing tools and expanded channels for creators.'}
                        </p>
                      </div>
                    </div>

                    {/* Price Block */}
                    <div className="text-left sm:text-right shrink-0 pt-1 sm:pt-0 sm:pl-3">
                      {isSelectedPromo ? (
                        <div>
                          <div className="text-xs line-through text-slate-400 font-semibold">
                            LKR {selectedPlan.priceLkr?.toLocaleString()}
                          </div>
                          <div className="flex sm:flex-col items-baseline sm:items-end gap-1.5 sm:gap-0">
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                              LKR 0.00
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              First month free
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex sm:flex-col items-baseline sm:items-end gap-1.5 sm:gap-0">
                          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                            LKR {selectedPlan.priceLkr?.toLocaleString() || '1,000'}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            per month
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Section: Plan Specifications & Entitlement Details */}
                  <div className="pt-3.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* 1. Monthly Credits */}
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 shadow-2xs min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4 fill-current" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {selectedPlan.credits?.toLocaleString()} Credits
                          </span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider truncate">
                            Monthly Quota
                          </span>
                        </div>
                      </div>

                      {/* 2. Connected Channels */}
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 shadow-2xs min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {selectedPlan.maxConnectedAccounts} Channels
                          </span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider truncate">
                            Multi-Platform
                          </span>
                        </div>
                      </div>

                      {/* 3. Scheduling */}
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 shadow-2xs min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            Automated
                          </span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider truncate">
                            Scheduling
                          </span>
                        </div>
                      </div>

                      {/* 4. AI Suite or Photo Studio */}
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 shadow-2xs min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                          <Wand2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {selectedPlan.hasAiCaptions ? 'AI Vision' : 'Photo Studio'}
                          </span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider truncate">
                            {selectedPlan.hasAiCaptions ? 'Captions Suite' : 'Collage Studio'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Free Trial Specific Disclosures & Timeline */}
                {isSelectedPromo && (
                  <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 dark:from-slate-900/80 dark:via-slate-900/50 dark:to-indigo-950/20 p-3.5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40 pb-2">
                      <h5 className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Trial Timeline & Billing Disclosure
                      </h5>
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 px-2 py-0.5 rounded-full">
                        1 Calendar Month
                      </span>
                    </div>

                    {/* Timeline visualization */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Today's Charge</span>
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">LKR 0.00</div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Immediate {selectedPlan.credits} credits granted</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">First Charge Date</span>
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">{expectedFirstChargeDate}</div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Renews at LKR {selectedPlan.priceLkr?.toLocaleString()}/mo</p>
                      </div>
                    </div>

                    {/* Terms Bullets */}
                    <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 bg-slate-50/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Zero charge today:</strong> Your card will not be charged during the 1-month trial period.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Full feature access:</strong> Enjoy {selectedPlan.credits} credits, {selectedPlan.maxConnectedAccounts} accounts, and premium features right away.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Cancel anytime:</strong> Cancel before {expectedFirstChargeDate} in your account settings. You retain access until the trial ends without unexpected fees.</span>
                      </li>
                    </ul>

                    {/* Explicit Consent Checkbox */}
                    <div className="p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900/80 bg-white dark:bg-slate-900 flex items-start gap-2.5">
                      <input
                        id="trial-consent"
                        type="checkbox"
                        checked={trialConsentAgreed}
                        onChange={(e) => setTrialConsentAgreed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="trial-consent" className="text-[11px] text-slate-700 dark:text-slate-300 select-none cursor-pointer leading-relaxed">
                        I agree to the recurring billing terms. I understand my free trial lasts 1 calendar month, after which regular monthly billing of <strong>LKR {selectedPlan.priceLkr?.toLocaleString()}/month</strong> begins on <strong>{expectedFirstChargeDate}</strong> unless I cancel before that date.
                      </label>
                    </div>
                  </div>
                )}

                {/* 3. Billing Contact Information Form */}
                <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Billing Contact Details
                    </h5>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 px-1.5 py-0.5 rounded-md shrink-0">
                      Auto-saved
                    </span>
                  </div>

                  {/* Contact Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* First Name */}
                    <div>
                      <label htmlFor="billing-first-name" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="billing-first-name"
                        type="text"
                        value={billingContact.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="First Name"
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${
                          validationErrors.firstName
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-400'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                        } text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                      />
                      {validationErrors.firstName && (
                        <p className="text-[10px] text-rose-500 font-medium mt-0.5">{validationErrors.firstName}</p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label htmlFor="billing-last-name" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                        Last Name
                      </label>
                      <input
                        id="billing-last-name"
                        type="text"
                        value={billingContact.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Last Name"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label htmlFor="billing-phone" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="billing-phone"
                          type="tel"
                          value={billingContact.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="Phone Number"
                          className={`w-full text-xs px-3 py-2 rounded-lg border ${
                            validationErrors.phone
                              ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-400'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                          } text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                        />
                      </div>
                      {validationErrors.phone && (
                        <p className="text-[10px] text-rose-500 font-medium mt-0.5">{validationErrors.phone}</p>
                      )}
                    </div>

                    {/* City */}
                    <div>
                      <label htmlFor="billing-city" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                        City <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="billing-city"
                        type="text"
                        value={billingContact.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="City"
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${
                          validationErrors.city
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-400'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                        } text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                      />
                      {validationErrors.city && (
                        <p className="text-[10px] text-rose-500 font-medium mt-0.5">{validationErrors.city}</p>
                      )}
                    </div>

                    {/* Street Address */}
                    <div className="sm:col-span-2">
                      <label htmlFor="billing-address" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                        Street Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="billing-address"
                        type="text"
                        value={billingContact.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Street Address"
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${
                          validationErrors.address
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-400'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                        } text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                      />
                      {validationErrors.address && (
                        <p className="text-[10px] text-rose-500 font-medium mt-0.5">{validationErrors.address}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Gateway & Security Notice */}
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2 font-sans select-none shrink-0">
                    <span className="font-black text-base italic tracking-tight">
                      <span className="text-[#0052CC]">Pay</span>
                      <span className="text-[#FF8A00]">Here</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Sandbox
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 text-right">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>No card details stored on SocialSync • PCI compliant</span>
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------
                VIEW C: DOWNGRADE CONFIRMATION
            -------------------------------------------------------- */}
            {step === 'downgrade_confirm' && selectedPlan && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Switching to {selectedPlan.name} Tier
                    </h4>
                    <p className="text-xs text-amber-900 dark:text-amber-200 mt-1 leading-relaxed">
                      {selectedPlan.planType === 'FREE'
                        ? 'You are switching to the Free package. Paid auto-renewals will stop.'
                        : `You are changing your tier from ${currentPlan} to ${selectedPlan.name}.`}
                    </p>
                  </div>
                </div>

                {connectedAccountsCount > selectedPlan.maxConnectedAccounts && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Connected Accounts Notice</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      You currently have <strong>{connectedAccountsCount} connected accounts</strong>, which exceeds the{' '}
                      <strong>{selectedPlan.maxConnectedAccounts} account limit</strong> of {selectedPlan.name}.
                    </p>
                    <p className="text-[10px] text-rose-700 dark:text-rose-300">
                      Existing connections remain active, but adding new channels or publishing beyond the limit will be restricted until your total is within {selectedPlan.maxConnectedAccounts}.
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Terms & Retained Access</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                    {selectedPlan.planType === 'FREE' ? (
                      <>
                        <li>Your paid privileges remain active until the end of your current paid billing period.</li>
                        <li>No further renewals will be charged to your payment method.</li>
                        <li>Monthly publishing allowance will adjust to 200 credits at the next cycle.</li>
                        <li>All past posts, analytics, and social connections remain safely preserved.</li>
                      </>
                    ) : (
                      <>
                        <li>New allowance of {selectedPlan.credits} credits per cycle will take effect.</li>
                        <li>Post scheduling remains enabled for your scheduled queue.</li>
                        {!selectedPlan.hasAiCaptions && (
                          <li>AI caption suggestions will no longer be available under {selectedPlan.name}.</li>
                        )}
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              3. STICKY FOOTER (Always visible, action buttons)
          ======================================================== */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0B1120] flex items-center justify-between gap-2.5 shrink-0">
            {step === 'select' ? (
              <div className="w-full flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : step === 'downgrade_confirm' ? (
              <div className="w-full flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToSelect}
                  disabled={loading}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {targetPlan ? 'Cancel' : '← Back to Plans'}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmChange}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
                  >
                    {loading ? 'Updating...' : `Confirm Switch to ${selectedPlan?.name}`}
                  </button>
                </div>
              </div>
            ) : (
              /* payment_confirm view */
              <div className="w-full flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                {isSelectedPromo ? (
                  <button
                    type="button"
                    onClick={handleConfirmChange}
                    disabled={loading || !trialConsentAgreed}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:via-teal-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 active:scale-[0.99] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Activating Free Trial...</span>
                      </div>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-white" />
                        <span>Activate 1-Month Free Trial ({selectedPlan.name})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmChange}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 active:scale-[0.99] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Redirecting to PayHere...</span>
                      </div>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        <span>Continue to PayHere →</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
  }
