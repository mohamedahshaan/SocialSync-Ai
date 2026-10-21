import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

/**
 * CreditBalanceIndicator
 *
 * Prominent circular credit balance indicator for the SocialSync AI sidebar.
 * Features a top-centered large gradient ring, centered typography,
 * dynamic plan allowance support, and smooth animated progress.
 */
export function CreditBalanceIndicator({ onClose }) {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);

  // Dynamically load active plans from API/database so plan names
  // and credit limits are NEVER hardcoded.
  useEffect(() => {
    let isMounted = true;
    async function fetchPlans() {
      try {
        const res = await api.get('/plans');
        if (isMounted && res.success && Array.isArray(res.data?.plans)) {
          setPlans(res.data.plans);
        }
      } catch (err) {
        console.warn('Could not fetch dynamic plans for credit indicator:', err?.message);
      }
    }

    fetchPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  // Match the active user plan dynamically against registered plans in the database
  const userPlanType = user?.plan || '';
  const matchedPlan = plans.find((p) => p.planType === userPlanType);

  // Applicable credit allowance:
  // 1. user.planAllowance from authenticated user session (/auth/me, login, register)
  // 2. matchedPlan.credits dynamically retrieved from /api/plans
  // 3. null if not yet available
  const rawAllowance = user?.planAllowance ?? matchedPlan?.credits ?? null;
  const applicableAllowance =
    typeof rawAllowance === 'number' && Number.isFinite(rawAllowance) && rawAllowance > 0
      ? rawAllowance
      : null;

  // Dynamic plan display name (never hardcoded)
  const currentPlanName =
    user?.planName ||
    matchedPlan?.name ||
    (userPlanType ? userPlanType.charAt(0) + userPlanType.slice(1).toLowerCase() : '');

  // Remaining credit balance from live application state
  const remainingCredits = typeof user?.credits === 'number' ? user.credits : 0;

  // Circular ring calculation:
  // (remaining credits / applicable plan credit allowance) × 100
  // Clamped between 0% and 100%
  let remainingPercent = 0;
  if (applicableAllowance !== null && applicableAllowance > 0) {
    const rawCalculated = (remainingCredits / applicableAllowance) * 100;
    remainingPercent = Math.min(100, Math.max(0, rawCalculated));
  }

  // SVG Geometry for prominent circular progress ring
  // Diameter: 84px, Radius: 35px, Center: (42, 42)
  const radius = 35;
  const strokeWidth = 5.5;
  const circumference = 2 * Math.PI * radius; // ~219.911

  // Calculate strokeDashoffset based on clamped percentage:
  // 100% remaining -> strokeDashoffset = 0 (full gradient ring)
  // 0% remaining -> strokeDashoffset = circumference (empty progress ring)
  const strokeDashoffset = circumference - (remainingPercent / 100) * circumference;

  const creditString = remainingCredits.toLocaleString();
  const centerFontSizeClass =
    creditString.length > 5
      ? 'text-xs'
      : creditString.length > 4
      ? 'text-sm'
      : creditString.length > 3
      ? 'text-base'
      : 'text-lg';

  return (
    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-xs flex flex-col items-center text-center transition-colors">
      {/* Prominent Circular Gradient Progress Ring on Top */}
      <div className="relative w-[84px] h-[84px] shrink-0 flex items-center justify-center mb-2.5">
        <svg
          className="w-[84px] h-[84px] transform -rotate-90"
          viewBox="0 0 84 84"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="credit-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>

          {/* Muted lavender track visible behind the progress arc */}
          <circle
            cx="42"
            cy="42"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-[#EDE9FE] dark:text-[#3B2D54]/50"
          />

          {/* Smoothly decreasing gradient arc as credits are consumed */}
          {applicableAllowance !== null && (
            <circle
              cx="42"
              cy="42"
              r={radius}
              stroke="url(#credit-ring-gradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>

        {/* Remaining credit balance in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-1">
          <span
            className={`font-black tracking-tight leading-none text-[#0F172A] dark:text-[#F8FAFC] ${centerFontSizeClass}`}
            title={`${creditString} credits remaining`}
          >
            {creditString}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
            credits
          </span>
        </div>
      </div>

      {/* Plan Name & Clean Allowance Information under the ring */}
      <div className="w-full">
        <div
          className="text-sm font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight truncate"
          title={currentPlanName ? `${currentPlanName} Plan` : 'Loading plan...'}
        >
          {currentPlanName ? `${currentPlanName} Plan` : 'Active Plan'}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
          {applicableAllowance !== null
            ? `${Math.round(remainingPercent)}% remaining this cycle`
            : 'Active subscription cycle'}
        </div>
      </div>

      {/* Functional View credit details link with matching gradient */}
      <Link
        to="/packages"
        onClick={onClose}
        className="w-full mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-center text-xs font-bold transition-all hover:opacity-85 group"
      >
        <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 dark:from-purple-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent inline-flex items-center gap-1.5">
          <span>View credit details</span>
          <span
            className="transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            &rarr;
          </span>
        </span>
      </Link>
    </div>
  );
}

export default CreditBalanceIndicator;
