import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Check,
  KeyRound,
  RefreshCw,
  Clock,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { api } from '../services/api';
import { setUserPlan } from '../utils/planConfig';
import { PlatformCircle } from '../components/public/PlatformIcon';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [bannerSuccess, setBannerSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password Flow State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState('EMAIL'); // 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Account Linking Modal State
  const [linkingData, setLinkingData] = useState(null); // { email, idToken }
  const [linkPassword, setLinkPassword] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [showLinkPassword, setShowLinkPassword] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/create-post';
  const queryParams = new URLSearchParams(location.search);
  const sessionExpired = queryParams.get('expired') === 'true';
  const planParam = queryParams.get('plan');

  // Handle Google OAuth redirect callback params
  useEffect(() => {
    const googleToken = queryParams.get('googleToken');
    if (googleToken) {
      localStorage.setItem('token', googleToken);
      window.location.href = from === '/dashboard' ? '/create-post' : from;
      return;
    }

    const requiresLinking = queryParams.get('requiresLinking') === 'true';
    const linkEmail = queryParams.get('linkEmail') || queryParams.get('email');
    const idToken = queryParams.get('idToken');
    if (requiresLinking && linkEmail && idToken) {
      setLinkingData({ email: linkEmail, idToken });
    }

    const errorParam = queryParams.get('error');
    if (errorParam === 'google_cancelled') {
      setError('Google sign-in was cancelled.');
    } else if (errorParam === 'google_auth_failed') {
      setError('Failed to authenticate with Google. Please try again.');
    } else if (errorParam === 'account_suspended') {
      setError('Your account has been suspended by an administrator.');
    }

    const accountDeleted = queryParams.get('account_deleted') === 'true';
    if (accountDeleted) {
      setBannerSuccess('Your account and personal data have been permanently deleted. We are sorry to see you go.');
    }

    const emailParam = queryParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    const forgotParam = queryParams.get('forgot') === 'true' || queryParams.get('action') === 'forgot';
    if (forgotParam) {
      setForgotEmail(emailParam || '');
      setForgotStep('EMAIL');
      setForgotModalOpen(true);
    }
  }, []);

  const handleLinkAccount = async (e) => {
    e.preventDefault();
    setLinkError('');
    if (!linkPassword) {
      setLinkError('Please enter your existing password to link Google Sign-In.');
      return;
    }
    try {
      setLinkLoading(true);
      const res = await loginWithGoogle(linkingData.idToken, linkPassword);
      if (res?.success) {
        setLinkingData(null);
        navigate(from === '/dashboard' ? '/create-post' : from, { replace: true });
      }
    } catch (err) {
      setLinkError(err.message || 'Incorrect password. Account linking failed.');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleOpenForgotPassword = (e) => {
    e?.preventDefault();
    setForgotEmail(email.trim());
    setForgotStep('EMAIL');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotError('');
    setResetToken('');
    setForgotModalOpen(true);
  };

  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    setForgotError('');
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid email address.');
      return;
    }
    try {
      setForgotLoading(true);
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setResendCooldown(res.cooldownSeconds || 60);
      setForgotStep('OTP');
    } catch (err) {
      if (err.status === 429) {
        setForgotError(err.message || 'Please wait before requesting another code.');
        if (err.cooldownSeconds) setResendCooldown(err.cooldownSeconds);
      } else {
        setForgotError(err.message || 'Failed to send verification code. Please try again.');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || forgotLoading) return;
    setForgotError('');
    try {
      setForgotLoading(true);
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setResendCooldown(res.cooldownSeconds || 60);
    } catch (err) {
      setForgotError(err.message || 'Failed to resend code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setForgotError('');
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    try {
      setForgotLoading(true);
      const res = await api.post('/auth/verify-reset-otp', {
        email: forgotEmail.trim(),
        otp: forgotOtp.trim()
      });
      if (res.data?.resetToken) {
        setResetToken(res.data.resetToken);
      }
      setForgotStep('NEW_PASSWORD');
    } catch (err) {
      setForgotError(err.message || 'Invalid or expired verification code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    setForgotError('');
    if (!forgotNewPassword || forgotNewPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(forgotNewPassword)) {
      setForgotError('Password must contain at least one symbol (e.g. !@#$%^&*).');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }
    try {
      setForgotLoading(true);
      await api.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        resetToken,
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
        confirmPassword: forgotConfirmPassword
      });
      setForgotStep('SUCCESS');
    } catch (err) {
      setForgotError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleFinishReset = () => {
    setForgotModalOpen(false);
    setEmail(forgotEmail);
    setPassword('');
    setBannerSuccess('Password reset successfully! You can now log in with your new password.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    try {
      setLoading(true);
      const user = await login(email.trim(), password);
      if (planParam) {
        setUserPlan(planParam);
      }

      // If administrator logs in, redirect to admin dashboard unless already headed somewhere specific
      if (['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'].includes(user?.role) && (from === '/dashboard' || from === '/create-post')) {
        navigate('/admin/users', { replace: true });
      } else {
        const dest = from === '/dashboard' ? '/create-post' : from;
        navigate(dest, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
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
              <img
                src="/logo.png"
                alt="SocialSync AI"
                className="w-10 h-10 rounded-xl object-contain drop-shadow-md shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent font-heading">
                  SocialSync AI
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide -mt-0.5">
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
              Welcome Back!
            </h1>
            <p className="text-[#475569] dark:text-slate-300 text-base sm:text-lg mb-8 max-w-md leading-relaxed">
              Sign in to your account and continue creating amazing content.
            </p>

            {/* Value checklist */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-[#475569] dark:text-slate-200 text-sm font-medium">
                  Easy and secure login
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-[#475569] dark:text-slate-200 text-sm font-medium">
                  Access all your connected accounts
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-[#475569] dark:text-slate-200 text-sm font-medium">
                  Continue your content journey
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-[#475569] dark:text-slate-200 text-sm font-medium">
                  Get insights and manage posts
                </span>
              </div>
            </div>

            {/* Row of 6 Social Platform Badges */}
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Instant Multi-Publishing
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
            
            {sessionExpired && (
              <div className="mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span>Your session has expired. Please sign in again.</span>
              </div>
            )}

            {bannerSuccess && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300 text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />
                <span>{bannerSuccess}</span>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 flex items-start gap-2.5 text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    autoComplete="email"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                  />
                </div>
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
                    autoComplete="current-password"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
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
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[#475569] dark:text-[#CBD5E1] select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#E2E8F0] dark:border-[#334155] text-cyan-600 focus:ring-cyan-500 bg-white dark:bg-[#1E293B]"
                  />
                  <span>Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="font-medium text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 text-sm mt-2"
              >
                Sign In
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E2E8F0] dark:border-[#334155]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-[#111827] px-3 text-slate-400 dark:text-slate-500">or continue with</span>
              </div>
            </div>

            {/* Sign in with Google Button */}
            <GoogleSignInButton
              text="Continue with Google"
              onRequiresLinking={(data) => setLinkingData(data)}
              onError={(msg) => setError(msg)}
            />

            {/* Bottom link to Register */}
            <div className="mt-6 text-center text-xs text-[#475569] dark:text-[#CBD5E1]">
              Don't have an account?{' '}
              <Link
                to={`/register${planParam ? `?plan=${planParam}` : ''}`}
                className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
              >
                Create one
              </Link>
            </div>
          </div>
        </div>

      {/* Forgot Password Email OTP Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title={
          forgotStep === 'EMAIL'
            ? 'Reset Your Password'
            : forgotStep === 'OTP'
            ? 'Verify Your Email'
            : forgotStep === 'NEW_PASSWORD'
            ? 'Set New Password'
            : 'Password Reset Successful'
        }
      >
        <div className="space-y-4">
          {forgotError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{forgotError}</span>
            </div>
          )}

          {/* STEP 1: Email Form */}
          {forgotStep === 'EMAIL' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                Enter your registered email address. We will send a secure 6-digit verification code to reset your password.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setForgotModalOpen(false)}
                  disabled={forgotLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={forgotLoading}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  Send Verification Code
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2: OTP Entry */}
          {forgotStep === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                We sent a 6-digit code to <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{forgotEmail}</strong>. Enter it below to verify your account.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-full text-center tracking-[0.4em] font-mono text-2xl py-3 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#475569] dark:text-slate-400 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Code expires in 5 minutes
                  </span>
                  <div>
                    {resendCooldown > 0 ? (
                      <span className="text-slate-400 dark:text-slate-500">
                        Resend code in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={forgotLoading}
                        className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Resend Code
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep('EMAIL');
                    setForgotError('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  ← Change Email
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setForgotModalOpen(false)}
                    disabled={forgotLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={forgotLoading}
                    disabled={forgotOtp.length !== 6}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    Verify Code
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 3: New Password */}
          {forgotStep === 'NEW_PASSWORD' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                Code verified successfully! Choose a strong password for your account (at least 8 characters).
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    minLength={8}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={forgotNewPassword.length >= 8 ? 'text-emerald-500' : 'text-slate-400'}>
                    {forgotNewPassword.length >= 8 ? '✓' : '•'}
                  </span>
                  <span>At least 8 characters long</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={/[^a-zA-Z0-9]/.test(forgotNewPassword) ? 'text-emerald-500' : 'text-slate-400'}>
                    {/[^a-zA-Z0-9]/.test(forgotNewPassword) ? '✓' : '•'}
                  </span>
                  <span>Contains at least one symbol (e.g. !@#$%^&*)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={forgotNewPassword && forgotNewPassword === forgotConfirmPassword ? 'text-emerald-500' : 'text-slate-400'}>
                    {forgotNewPassword && forgotNewPassword === forgotConfirmPassword ? '✓' : '•'}
                  </span>
                  <span>Passwords match</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setForgotModalOpen(false)}
                  disabled={forgotLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={forgotLoading}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  Save New Password
                </Button>
              </div>
            </form>
          )}

          {/* STEP 4: Success Message */}
          {forgotStep === 'SUCCESS' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#0F172A] dark:text-white">
                  Password Updated Successfully!
                </h4>
                <p className="text-xs text-[#475569] dark:text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your password has been securely reset. For your security, any previous active sessions across all devices have been invalidated.
                </p>
              </div>
              <div className="pt-3">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleFinishReset}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Continue to Sign In
                </Button>
              </div>
            </div>
          )}

        </div>
      </Modal>

      {/* Account Linking Modal */}
      {linkingData && (
        <Modal
          isOpen={Boolean(linkingData)}
          onClose={() => setLinkingData(null)}
          title="Link Your Google Account"
        >
          <form onSubmit={handleLinkAccount} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-[#3B5BFF]/10 border border-blue-200 dark:border-[#3B5BFF]/30 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              An account registered to <strong>{linkingData.email}</strong> already exists. For security, please enter your existing password to link your Google Sign-In.
            </div>

            {linkError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{linkError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                Existing Password
              </label>
              <div className="relative">
                <input
                  type={showLinkPassword ? 'text' : 'password'}
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#3B5BFF]"
                />
                <button
                  type="button"
                  onClick={() => setShowLinkPassword(!showLinkPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showLinkPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLinkingData(null)}
                className="w-1/2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={linkLoading}
                className="w-1/2 bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white font-semibold"
              >
                Confirm & Link
              </Button>
            </div>
          </form>
        </Modal>
      )}

      </div>
    </div>
  );
}
export default LoginPage;
