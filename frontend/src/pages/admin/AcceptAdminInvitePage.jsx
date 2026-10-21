import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Clock,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function AcceptAdminInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setValidationError('No invitation token was provided in the link.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await api.get(`/auth/admin-invite/${encodeURIComponent(token)}`);
        if (res.success && res.data) {
          setInvitationData(res.data);
          if (res.data.existingName) {
            setName(res.data.existingName);
          }
        } else {
          setValidationError(res.message || 'Invitation is invalid or has expired.');
        }
      } catch (err) {
        setValidationError(err.message || 'This invitation is invalid, revoked, or has expired.');
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!invitationData?.hasExistingAccount) {
      if (!name || name.trim().length < 2) {
        setFormError('Please enter your full name (minimum 2 characters).');
        return;
      }
      if (!password || password.length < 8) {
        setFormError('Password must be at least 8 characters long.');
        return;
      }
      if (!/[^a-zA-Z0-9]/.test(password)) {
        setFormError('Password must contain at least one symbol (e.g. !@#$%^&*).');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }
    } else {
      if (!password) {
        setFormError('Please enter your existing account password to confirm elevation.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/admin-invite/accept', {
        token,
        name: name.trim(),
        password,
        confirmPassword
      });

      if (res.success && res.data?.token) {
        setSuccessMessage(res.message || 'Administrator privileges activated!');

        // Update local auth context
        if (authLogin) {
          authLogin(res.data.user, res.data.token);
        } else {
          localStorage.setItem('socialsync_token', res.data.token);
          localStorage.setItem('socialsync_user', JSON.stringify(res.data.user));
        }

        setTimeout(() => {
          navigate('/admin/users', { replace: true });
        }, 1500);
      } else {
        setFormError(res.message || 'Failed to activate administrator privileges.');
      }
    } catch (err) {
      setFormError(err.message || 'Error occurred while activating administrator account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080D19] flex items-center justify-center p-4 sm:p-6 text-[#0F172A] dark:text-[#F8FAFC]">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3B5BFF] to-[#7C3AED] text-white shadow-lg shadow-[#3B5BFF]/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent font-heading">
              SocialSync AI
            </h1>
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#3B5BFF] dark:text-[#818cf8]">
              Governance Console Onboarding
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-8 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-center space-y-3 shadow-soft">
            <div className="w-8 h-8 border-3 border-[#3B5BFF] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#475569] dark:text-slate-400 font-semibold">
              Verifying cryptographic invitation token...
            </p>
          </div>
        )}

        {/* Validation Error State */}
        {!loading && validationError && (
          <div className="p-8 rounded-3xl bg-white dark:bg-[#111827] border border-rose-200 dark:border-rose-900/60 text-center space-y-4 shadow-soft">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-rose-600">
                Invalid or Expired Invitation
              </h2>
              <p className="text-xs text-[#475569] dark:text-slate-400 leading-relaxed">
                {validationError}
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#3B5BFF] hover:text-[#7C3AED] hover:underline"
              >
                <span>Return to Administrator Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Valid Invitation Setup Form */}
        {!loading && invitationData && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-xl space-y-6">
            {/* Invitation Details Banner */}
            <div className="p-4 rounded-2xl bg-[#3B5BFF]/5 dark:bg-[#3B5BFF]/15 border border-[#3B5BFF]/20 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#3B5BFF] dark:text-[#818cf8]">
                  {invitationData.roleName}
                </span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Verified Invitation
                </span>
              </div>
              <p className="text-[#475569] dark:text-slate-300">
                Invited by <strong className="text-[#0F172A] dark:text-white">{invitationData.invitedByName}</strong> for{' '}
                <strong className="text-[#0F172A] dark:text-white">{invitationData.email}</strong>
              </p>
            </div>

            {/* Success Confirmation */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successMessage} Redirecting to dashboard...</span>
              </div>
            )}

            {/* Error Message */}
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {invitationData.hasExistingAccount ? (
                /* Existing User Password Authentication */
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
                    An existing account with email <strong>{invitationData.email}</strong> was found. Please enter your existing account password to confirm identity and activate administrative access.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                      Account Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* New Account Setup */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                      Create Administrator Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        placeholder="Minimum 8 characters with a symbol"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      At least 8 characters with a symbol
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || Boolean(successMessage)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] hover:opacity-95 text-white font-extrabold text-xs shadow-lg shadow-[#3B5BFF]/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Verifying & Activating...'
                    : invitationData.hasExistingAccount
                    ? 'Authenticate & Activate Admin Privileges'
                    : 'Create Account & Enter Admin Panel'}
                </span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default AcceptAdminInvitePage;
