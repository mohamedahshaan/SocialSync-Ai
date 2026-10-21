import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
  ArrowLeft,
  Check,
  X,
  KeyRound,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/common/Button';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [emailAssociated, setEmailAssociated] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const { isDark, toggleTheme } = useTheme();

  // Validate token on component mount
  useEffect(() => {
    let isMounted = true;
    async function validateToken() {
      if (!token) {
        if (isMounted) {
          setVerifying(false);
          setTokenValid(false);
          setTokenError('No password reset token was provided in the link.');
        }
        return;
      }

      try {
        setVerifying(true);
        const res = await api.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        if (isMounted) {
          setTokenValid(true);
          if (res.data?.email) setEmailAssociated(res.data.email);
        }
      } catch (err) {
        if (isMounted) {
          setTokenValid(false);
          setTokenError(
            err.message || 'This password reset link is invalid, expired, or has already been used.'
          );
        }
      } finally {
        if (isMounted) setVerifying(false);
      }
    }

    validateToken();
    return () => { isMounted = false; };
  }, [token]);

  // Validation criteria
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasSymbol = /[^a-zA-Z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!hasMinLength) {
      setFormError('New password must be at least 8 characters long.');
      return;
    }

    if (!hasSymbol) {
      setFormError('Password must contain at least one symbol (e.g. !@#$%^&*).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/auth/reset-password', {
        token,
        newPassword,
        confirmPassword
      });

      setResetSuccess(true);
    } catch (err) {
      setFormError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setSubmitting(false);
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
                Set New Password
              </span>
            </div>
          </div>

          {/* 1. Loading State */}
          {verifying && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin text-[#3B5BFF] mx-auto" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Verifying password reset authorization...
              </p>
            </div>
          )}

          {/* 2. Token Error State */}
          {!verifying && !tokenValid && !resetSuccess && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-200 mb-1">Invalid or Expired Link</p>
                  <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                    {tokenError}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  to="/forgot-password"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#3B5BFF]/20 transition-all"
                >
                  Request a New Reset Link
                </Link>

                <Link
                  to="/login"
                  className="w-full py-2.5 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E293B] text-xs font-semibold flex items-center justify-center transition-colors"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* 3. Success State */}
          {resetSuccess && (
            <div className="py-4 text-center space-y-5 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#0F172A] dark:text-white mb-1.5">
                  Password Updated!
                </h2>
                <p className="text-xs text-[#475569] dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Your password has been successfully reset. All previous sessions across all devices have been signed out for your protection.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => navigate('/login', { replace: true })}
                className="w-full py-3 bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] text-white font-semibold rounded-xl shadow-lg shadow-[#3B5BFF]/20 text-sm"
              >
                Sign In with New Password
              </Button>
            </div>
          )}

          {/* 4. Reset Form */}
          {!verifying && tokenValid && !resetSuccess && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight mb-1">
                  Create New Password
                </h1>
                <p className="text-xs text-[#475569] dark:text-slate-400 mb-4">
                  {emailAssociated ? (
                    <>Resetting password for <strong className="text-[#0F172A] dark:text-white">{emailAssociated}</strong></>
                  ) : (
                    'Enter and confirm your new secure password below.'
                  )}
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 flex items-start gap-2.5 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3B5BFF] focus:border-[#3B5BFF] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3B5BFF] focus:border-[#3B5BFF] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1E293B]/70 border border-[#E2E8F0] dark:border-[#334155] space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  {hasMinLength ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className={hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasLetter ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className={hasLetter ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                    Contains letters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasSymbol ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className={hasSymbol ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                    Contains at least one symbol (!@#$%^&*)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordsMatch ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className={passwordsMatch ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={!hasMinLength || !hasSymbol || !passwordsMatch}
                className="w-full py-3 bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white font-semibold rounded-xl shadow-lg shadow-[#3B5BFF]/20 text-sm mt-2"
              >
                Reset Password & Invalidate Sessions
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
