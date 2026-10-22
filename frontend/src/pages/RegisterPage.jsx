import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Calendar,
  Check,
  HelpCircle,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { PLANS, setUserPlan } from '../utils/planConfig';
import { PlatformCircle } from '../components/public/PlatformIcon';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Card details for 1-Month Free Trial option
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dynamicPlans, setDynamicPlans] = useState([]);

  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const planKey = (queryParams.get('plan') || 'free').toUpperCase();

  // Fetch dynamic package plans from backend to get latest prices and free trial toggles
  useEffect(() => {
    let isMounted = true;
    api.get('/plans')
      .then(res => {
        if (isMounted && res.data?.plans) {
          setDynamicPlans(res.data.plans);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const activePlanMeta = dynamicPlans.find(p => p.planType === planKey) || {
    planType: planKey,
    name: planKey === 'CREATOR' ? 'Creator' : planKey === 'PROFESSIONAL' ? 'Professional' : 'Free',
    priceLkr: planKey === 'CREATOR' ? 1000 : planKey === 'PROFESSIONAL' ? 2500 : 0,
    credits: planKey === 'CREATOR' ? 250 : planKey === 'PROFESSIONAL' ? 1000 : 100,
    hasFreeTrial: false
  };

  const isFreePlan = planKey === 'FREE';
  const hasTrialOption = !isFreePlan && Boolean(activePlanMeta.hasFreeTrial);

  const validateForm = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      errors.terms = 'You must agree to the Terms & Conditions and Privacy Policy';
    }

    if (hasTrialOption && cardNumber.replace(/\s/g, '').length < 13) {
      errors.card = 'Please enter a valid card number for the 1-month free trial';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const expParts = cardExp.split('/');
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        plan: planKey,
        ...(hasTrialOption ? {
          cardData: {
            cardNumber: cardNumber.replace(/\s/g, ''),
            cardholderName: cardholderName || name.trim(),
            expMonth: expParts[0] || '12',
            expYear: expParts[1] ? `20${expParts[1]}` : '2028',
            cvc: cardCvc
          }
        } : {})
      };

      await register(payload);
      setUserPlan(planKey);
      navigate('/create-post');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-center p-4 lg:p-8 font-sans relative overflow-hidden transition-colors duration-200">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Floating Theme Toggle */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] shadow-sm hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        
        {/* LEFT COLUMN: Branding & value props */}
        <div className="lg:col-span-6 flex flex-col justify-between py-6 px-4 lg:px-8 space-y-8">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-500 p-0.5 shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full bg-[#080D19] rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-white dark:via-slate-100 dark:to-cyan-300 bg-clip-text text-transparent font-heading">
                  SocialSync AI
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase -mt-0.5">
                  Connect • Create • Publish
                </span>
              </div>
            </div>

            {/* Back to Home Link */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-[#475569] dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors mb-6 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-tight mb-4">
              Create Your Account
            </h1>
            <p className="text-[#475569] dark:text-slate-300 text-base sm:text-lg mb-8 max-w-md leading-relaxed">
              Join thousands of creators and businesses managing their social media with AI.
            </p>

            {/* Value checklist */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-[#475569] dark:text-slate-200 text-sm font-medium">
                  {activePlanMeta.credits || 100} free credits on signup
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-[#475569] dark:text-slate-200 text-sm font-medium">
                  {hasTrialOption ? '1-Month Free Trial option with automatic detection' : 'No credit card required for Free Tier'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-[#475569] dark:text-slate-200 text-sm font-medium">
                  Setup in under 60 seconds
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-[#475569] dark:text-slate-200 text-sm font-medium">
                  All 6 social media platforms supported
                </span>
              </div>
            </div>

            {/* Row of 6 Social Platform Badges */}
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Supported Networks
              </p>
              <div className="flex items-center gap-2.5">
                {[
                  { key: 'FACEBOOK', name: 'Facebook' },
                  { key: 'INSTAGRAM', name: 'Instagram' },
                  { key: 'LINKEDIN', name: 'LinkedIn' },
                  { key: 'YOUTUBE', name: 'YouTube' },
                  { key: 'TIKTOK', name: 'TikTok' },
                  { key: 'THREADS', name: 'Threads' }
                ].map((p) => (
                  <PlatformCircle
                    key={p.key}
                    platform={p.key}
                    size="w-9 h-9"
                    iconSize="w-4 h-4"
                    className="shadow-md shadow-black/40 ring-1 ring-white/20 hover:scale-110 transition-transform cursor-pointer"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Form Card */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#334155]">
            
            {/* Top Selected Plan Banner */}
            {!isFreePlan && (
              <div className="mb-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 block">
                      Selected Plan
                    </span>
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      {activePlanMeta.name} {hasTrialOption ? '(1-Month Free Trial)' : `(LKR ${activePlanMeta.priceLkr.toLocaleString()})`}
                    </span>
                  </div>
                </div>
                <Link
                  to="/register"
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline px-2 py-1 rounded bg-white dark:bg-[#1E293B] shadow-sm border border-[#E2E8F0] dark:border-[#334155]"
                >
                  Clear
                </Link>
              </div>
            )}

            {serverError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 flex items-start gap-2.5 text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mohamed Ahshaan"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors ${
                      fieldErrors.name
                        ? 'border-red-400 bg-red-50/20'
                        : 'border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B]'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors ${
                      fieldErrors.email
                        ? 'border-red-400 bg-red-50/20'
                        : 'border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B]'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password with Eye Toggle */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors ${
                      fieldErrors.password
                        ? 'border-red-400 bg-red-50/20'
                        : 'border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm Password with Eye Toggle */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors ${
                      fieldErrors.confirmPassword
                        ? 'border-red-400 bg-red-50/20'
                        : 'border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* 1-Month Free Trial: Payment Card on File Detection */}
              {hasTrialOption && (
                <div className="pt-2 pb-1 border-t border-[#E2E8F0] dark:border-[#334155]">
                  <div className="bg-cyan-50/70 dark:bg-[#1E293B] border border-cyan-200 dark:border-[#334155] rounded-xl p-3 mb-3 text-xs text-cyan-900 dark:text-cyan-200">
                    <div className="flex items-center gap-1.5 font-bold mb-1 text-cyan-800 dark:text-cyan-300">
                      <CreditCard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      1-Month Free Trial — Payment Card on File
                    </div>
                    <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                      Your card will <strong className="text-[#0F172A] dark:text-white">not be charged today</strong>. Automatic subscription billing of <strong>LKR {activePlanMeta.priceLkr.toLocaleString()}/month</strong> begins only after 30 days. Cancel anytime before trial ends.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="•••• •••• •••• 4242"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                          Expiry (MM/YY)
                        </label>
                        <input
                          type="text"
                          value={cardExp}
                          onChange={(e) => setCardExp(e.target.value)}
                          placeholder="12/28"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                          CVC / CVV
                        </label>
                        <input
                          type="password"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                  {fieldErrors.card && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.card}</p>
                  )}
                </div>
              )}

              {/* Agree to terms checkbox */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-[#E2E8F0] dark:border-[#334155] text-cyan-600 focus:ring-cyan-500 bg-white dark:bg-[#1E293B]"
                />
                <label htmlFor="agreeTerms" className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-normal">
                  I agree to the{' '}
                  <Link to="/terms" className="text-cyan-600 dark:text-cyan-400 hover:underline">
                    Terms & Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy-policy" className="text-cyan-600 dark:text-cyan-400 hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {fieldErrors.terms && (
                <p className="text-red-500 text-xs">{fieldErrors.terms}</p>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 text-sm mt-2"
              >
                {hasTrialOption ? 'Start 1-Month Free Trial' : 'Create Account & Get Started'}
              </Button>
            </form>

            {/* Bottom link to Login */}
            <div className="mt-6 text-center text-xs text-[#475569] dark:text-[#CBD5E1]">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
export default RegisterPage;
