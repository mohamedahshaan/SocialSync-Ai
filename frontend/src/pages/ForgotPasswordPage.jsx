import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Send,
  LogIn
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/common/Button';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isGoogleOnly, setIsGoogleOnly] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsGoogleOnly(false);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/forgot-password', { email: cleanEmail });

      if (res.cooldownSeconds) {
        setCooldown(res.cooldownSeconds);
      }
      setSuccessMessage(
        res.message || 'If an account exists for this email address, a password reset link has been sent.'
      );
    } catch (err) {
      if (err.isGoogleOnly || err.data?.isGoogleOnly || err.message?.includes('Google Sign-In')) {
        setIsGoogleOnly(true);
        setErrorMessage(
          'This account was registered using Google Sign-In and does not have a local password. Please sign in directly with Google below.'
        );
      } else if (err.status === 429) {
        setErrorMessage(err.message || 'Too many requests. Please wait before trying again.');
        if (err.cooldownSeconds) setCooldown(err.cooldownSeconds);
      } else {
        setErrorMessage(err.message || 'Failed to submit request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-center p-4 lg:p-8 font-sans relative overflow-hidden transition-colors duration-200">
      {/* Background glow brand effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#3B5BFF]/10 dark:bg-[#3B5BFF]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />

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

      <div className="max-w-md w-full z-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-[#475569] dark:text-slate-400 hover:text-[#3B5BFF] dark:hover:text-[#818cf8] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Sign In
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155]">
          {/* Logo & Header */}
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/logo.png"
              alt="SocialSync AI"
              className="w-10 h-10 rounded-xl object-contain drop-shadow-md shrink-0"
            />
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent block leading-tight font-heading">
                SocialSync AI
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide block -mt-0.5">
                Account Recovery
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight mb-2">
            Reset Password
          </h1>
          <p className="text-sm text-[#475569] dark:text-slate-400 mb-6 leading-relaxed">
            Enter your registered email address and we'll send you a secure link to reset your password.
          </p>

          {/* Success Notification */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-sm flex items-start gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200 mb-1">Check Your Email</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                  {successMessage}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-2">
                  Didn't receive it? Check your spam folder or wait for the cooldown timer before requesting another link.
                </p>
              </div>
            </div>
          )}

          {/* Google Account Special Notice */}
          {isGoogleOnly && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-[#3B5BFF]/10 border border-blue-200 dark:border-[#3B5BFF]/30 text-blue-900 dark:text-blue-200 text-sm animate-fadeIn">
              <div className="flex items-center gap-2 font-bold mb-1.5 text-[#3B5BFF] dark:text-[#818cf8]">
                <Sparkles className="w-4 h-4 text-[#3B5BFF]" />
                Google Sign-In Account Detected
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                This account was created using Google Sign-In. You don't have a separate password. Use the button below to sign in immediately:
              </p>
              <GoogleSignInButton text="Sign in with Google" />
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && !isGoogleOnly && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 flex items-start gap-2.5 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    disabled={loading || cooldown > 0}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3B5BFF] focus:border-[#3B5BFF] transition-colors disabled:opacity-60"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={cooldown > 0}
                className="w-full py-3 bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white font-semibold rounded-xl shadow-lg shadow-[#3B5BFF]/25 text-sm flex items-center justify-center gap-2"
              >
                {cooldown > 0 ? (
                  <>
                    <Clock className="w-4 h-4" />
                    Resend link in {cooldown}s
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Password Reset Link
                  </>
                )}
              </Button>
            </form>
          )}

          {/* If already submitted, allow requesting again after cooldown */}
          {successMessage && (
            <div className="space-y-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={cooldown > 0 || loading}
                onClick={handleSubmit}
                className="w-full py-2.5 text-xs font-semibold rounded-xl border border-[#E2E8F0] dark:border-[#334155]"
              >
                {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Request Another Reset Link'}
              </Button>

              <Link
                to="/login"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-[#283548] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4 text-[#3B5BFF]" />
                Return to Sign In
              </Link>
            </div>
          )}

          {/* Footer Assistance */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#334155] text-center text-xs text-[#475569] dark:text-slate-400">
            Remember your password?{' '}
            <Link to="/login" className="text-[#3B5BFF] hover:text-[#7C3AED] font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
