import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  Share2,
  CheckCircle2,
  XCircle,
  Coins,
  Layers,
  History,
  CreditCard,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Clock,
  KeyRound,
  Trash2,
  Plus,
  Minus,
  Copy,
  Check,
  Sparkles,
  Crown,
  ShieldAlert,
  Radio,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { PlatformIcon } from '../../components/public/PlatformIcon';
import { useAuth } from '../../context/AuthContext';
import {
  formatSriLankaDateTime,
  formatSriLankaDate,
  formatSriLankaTime
} from '../../utils/timezone';

export function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentAdmin } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  // Action Modals: 'plan' | 'credits' | 'status' | 'resetPassword'
  const [actionModal, setActionModal] = useState(null);
  const [creditMode, setCreditMode] = useState('INCREASE'); // 'INCREASE' | 'DECREASE'
  const [actionInput, setActionInput] = useState({ value: '', reason: '' });
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Permanent Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/admin/users/${id}`);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load user details');
      }
    } catch (err) {
      setError(err.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserDetails();
  }, [id]);

  const handleBackToUsers = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate('/admin/users');
    }
  };

  const handleCopyText = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenCreditModal = (mode = 'INCREASE') => {
    setCreditMode(mode);
    setActionModal('credits');
    setActionInput({
      value: '50',
      reason: mode === 'INCREASE' ? 'Admin discretionary credit grant' : 'Admin discretionary credit deduction'
    });
  };

  const handleExecuteAction = async (e) => {
    e.preventDefault();
    try {
      setActionSubmitting(true);
      if (actionModal === 'plan') {
        await api.patch(`/admin/users/${id}/plan`, {
          plan: actionInput.value,
          reason: actionInput.reason
        });
      } else if (actionModal === 'credits') {
        const rawAmount = parseInt(actionInput.value, 10);
        if (isNaN(rawAmount) || rawAmount <= 0) {
          alert('Please enter a valid credit amount greater than 0.');
          return;
        }
        const isDecrease = creditMode === 'DECREASE';
        const currentCredits = data?.user?.credits || 0;
        if (isDecrease && currentCredits < rawAmount) {
          alert(`Cannot deduct ${rawAmount} credits. User currently only has ${currentCredits} credits.`);
          return;
        }
        const finalAmount = isDecrease ? -rawAmount : rawAmount;
        await api.post(`/admin/users/${id}/credits`, {
          amount: finalAmount,
          reason: actionInput.reason?.trim() || (isDecrease ? 'Admin discretionary credit deduction' : 'Admin discretionary credit grant')
        });
      } else if (actionModal === 'status') {
        await api.patch(`/admin/users/${id}/status`, {
          status: actionInput.value,
          reason: actionInput.reason
        });
      } else if (actionModal === 'resetPassword') {
        const res = await api.post(`/admin/users/${id}/initiate-password-reset`, {
          reason: actionInput.reason || 'Administrator initiated secure password reset'
        });
        alert(res.message || 'Password reset verification email dispatched to user.');
      }

      setActionModal(null);
      setActionInput({ value: '', reason: '' });
      await loadUserDetails();
    } catch (err) {
      alert(err.message || 'Failed to update user');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleDeleteUser = async (e) => {
    e?.preventDefault?.();
    try {
      setDeleting(true);
      const res = await api.delete(`/admin/users/${id}`, {
        data: { reason: 'Administrator permanent account deletion' }
      });
      if (res.success) {
        setDeleteModalOpen(false);
        alert(res.message || `Account has been permanently deleted.`);
        handleBackToUsers();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete user account');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <LoadingState message="Loading live user profile & governance records..." />
      </div>
    );
  }

  if (error || !data?.user) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center space-y-4 max-w-xl mx-auto my-12">
        <AlertTriangle className="w-10 h-10 mx-auto text-rose-400" />
        <h3 className="text-base font-bold text-white">Failed to load user profile</h3>
        <p className="text-xs text-rose-300/80">{error || 'User not found in database.'}</p>
        <button
          type="button"
          onClick={handleBackToUsers}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Users</span>
        </button>
      </div>
    );
  }

  const { user, recentPosts, auditLogs } = data;
  const isProtectedAdmin = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'].includes(user.role) || user.id === currentAdmin?.id;

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & PROMINENT BACK BUTTON */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Prominent Back Button */}
        <div>
          <button
            type="button"
            onClick={handleBackToUsers}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold text-[#0F172A] dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40 shadow-xs transition-all group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Users</span>
          </button>
        </div>

        {/* User Hero Banner */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-soft">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-cyan-500/20 shrink-0">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">
                  {user.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  user.status === 'ACTIVE'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                }`}>
                  {user.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-cyan-700 dark:text-cyan-300">
                  {user.plan} PLAN
                </span>
                {['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'].includes(user.role) && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {user.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : user.role === 'SUPPORT_ADMIN' ? 'SUPPORT' : 'ADMIN'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#475569] dark:text-slate-400 font-mono">
                <span>{user.email}</span>
                <button
                  type="button"
                  onClick={() => handleCopyText(user.email, 'hero-email')}
                  className="text-slate-400 hover:text-cyan-500 cursor-pointer"
                  title="Copy email"
                >
                  {copiedField === 'hero-email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0] dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleOpenCreditModal('INCREASE')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Grant Credits</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionModal('plan');
                setActionInput({ value: user.plan, reason: 'Administrator plan adjustment' });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white transition-colors cursor-pointer"
            >
              <span>Change Plan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionModal('status');
                setActionInput({
                  value: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                  reason: user.status === 'ACTIVE' ? 'Administrative suspension' : 'Reactivated by admin'
                });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                user.status === 'ACTIVE'
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <span>{user.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionModal('resetPassword');
                setActionInput({ value: '', reason: 'Administrator initiated secure password reset' });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors cursor-pointer"
              title="Send secure 6-digit password reset OTP email"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Reset Password</span>
            </button>

            {!isProtectedAdmin && (
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
                title="Permanently delete user account"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete User</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-soft">
          <p className="text-[11px] text-[#475569] dark:text-slate-400 font-medium">Credits Balance</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Coins className="w-5 h-5 text-amber-500" />
            <p className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
              {user.credits ?? 0}
            </p>
            <span className="text-xs text-slate-400 font-semibold">pts</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-soft">
          <p className="text-[11px] text-[#475569] dark:text-slate-400 font-medium">Active Plan Tier</p>
          <p className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-white mt-1">
            {user.plan}
          </p>
          <span className="text-[10px] text-slate-400 block font-medium">
            {user.plan === 'PROFESSIONAL' ? 'LKR 2,500/mo' : user.plan === 'CREATOR' ? 'LKR 1,000/mo' : 'Free Tier'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-soft">
          <p className="text-[11px] text-[#475569] dark:text-slate-400 font-medium">Connected Channels</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white mt-1">
            {user.socialAccounts?.length || 0}
          </p>
          <span className="text-[10px] text-slate-400 block font-medium">Active social accounts</span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-soft">
          <p className="text-[11px] text-[#475569] dark:text-slate-400 font-medium">Email Verification</p>
          <div className="mt-1">
            {user.isEmailVerified ? (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" /> Pending
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">
            {user.emailVerifiedAt ? formatSriLankaDate(user.emailVerifiedAt) : 'Unconfirmed'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2-COLUMN MAIN CONTENT (SECTIONS A, B, C, D) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT COLUMN: SECTION A & SECTION B */}
        <div className="space-y-6">

          {/* SECTION A — PROFILE INFORMATION */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-500" />
                <h2 className="font-bold text-sm text-[#0F172A] dark:text-white tracking-tight">
                  Section A — Profile Information
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                ID: {user.id.substring(0, 10)}…
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold block uppercase">Full Name</label>
                <div className="font-bold text-[#0F172A] dark:text-white mt-0.5 text-sm">
                  {user.name}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block uppercase">Email Address</label>
                <div className="flex items-center gap-1.5 mt-0.5 font-mono text-xs">
                  <span className="text-slate-800 dark:text-slate-200 select-all">{user.email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(user.email, 'profile-email')}
                    className="text-slate-400 hover:text-cyan-500 cursor-pointer"
                    title="Copy email"
                  >
                    {copiedField === 'profile-email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block uppercase">User ID</label>
                <div className="flex items-center gap-1.5 mt-0.5 font-mono text-xs">
                  <span className="text-slate-800 dark:text-slate-200 select-all truncate max-w-[160px]">{user.id}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(user.id, 'profile-id')}
                    className="text-slate-400 hover:text-cyan-500 cursor-pointer"
                    title="Copy user ID"
                  >
                    {copiedField === 'profile-id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block uppercase">Verification Status</label>
                <div className="mt-1">
                  {user.isEmailVerified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified {user.emailVerifiedAt ? `(${formatSriLankaDate(user.emailVerifiedAt)})` : ''}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Unverified Email</span>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block uppercase">Registration Date & Time</label>
                <div className="font-mono text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                  {formatSriLankaDateTime(user.createdAt)}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block uppercase">Registration Method / Source</label>
                <div className="mt-0.5">
                  {user.registrationSource === 'ADMIN_CREATED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                      Admin Created {user.createdByAdmin ? `(by ${user.createdByAdmin.name})` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                      Self-Registration
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B — SUBSCRIPTION & PLAN */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-500" />
                <h2 className="font-bold text-sm text-[#0F172A] dark:text-white tracking-tight">
                  Section B — Subscription & Plan
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionModal('plan');
                  setActionInput({ value: user.plan, reason: 'Administrator plan adjustment' });
                }}
                className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                Change Tier
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold block uppercase">Current Plan</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 border ${
                    user.plan === 'PROFESSIONAL'
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                      : user.plan === 'CREATOR'
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}>
                    {user.plan === 'PROFESSIONAL' && <Crown className="w-3.5 h-3.5 text-purple-500" />}
                    {user.plan === 'CREATOR' && <Sparkles className="w-3.5 h-3.5 text-cyan-500" />}
                    {user.plan === 'FREE' && <Layers className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{user.plan}</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block uppercase">Plan Price</label>
                <div className="font-bold text-sm text-[#0F172A] dark:text-white mt-1">
                  {user.plan === 'PROFESSIONAL' ? 'LKR 2,500 / month' : user.plan === 'CREATOR' ? 'LKR 1,000 / month' : 'LKR 0 (Free)'}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block uppercase">Subscription Status</label>
                <div className="font-semibold text-xs text-slate-700 dark:text-slate-300 mt-1">
                  {user.subscription?.status || (user.plan === 'FREE' ? 'FREE TIER' : 'ACTIVE')}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block uppercase">Subscription Start Date</label>
                <div className="font-mono text-xs text-slate-700 dark:text-slate-300 mt-1">
                  {user.subscription?.currentPeriodStart
                    ? formatSriLankaDate(user.subscription.currentPeriodStart)
                    : formatSriLankaDate(user.createdAt)}
                </div>
              </div>

              {user.subscription?.currentPeriodEnd && (
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block uppercase">Renewal / Expiry Date</label>
                  <div className="font-mono text-xs text-slate-700 dark:text-slate-300 mt-1">
                    {formatSriLankaDateTime(user.subscription.currentPeriodEnd)}
                  </div>
                </div>
              )}

              {user.subscription?.cardLast4 && (
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block uppercase">Card on File</label>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700 dark:text-slate-300 mt-1">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>{user.subscription.cardBrand || 'Card'} ending in {user.subscription.cardLast4}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Plan Transition History */}
            {user.planHistory && user.planHistory.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">
                    Plan & Credit History
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {user.planHistory.length} entry{user.planHistory.length === 1 ? '' : 'ies'}
                  </span>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {user.planHistory.map((ph) => {
                    const isTransition = ph.previousPlan && ph.previousPlan !== ph.plan;
                    const transitionText = isTransition ? `${ph.previousPlan} → ${ph.plan}` : ph.plan;
                    const creditChangeText = (ph.creditsBefore !== null && ph.creditsBefore !== undefined && ph.creditsAfter !== null && ph.creditsAfter !== undefined)
                      ? `Credits: ${ph.creditsBefore} → ${ph.creditsAfter}`
                      : null;
                    const sourceText = ph.source === 'ADMIN_ACTION' || ph.changedById
                      ? 'Changed by: Admin'
                      : ph.source === 'PAYHERE_PAYMENT'
                      ? 'Changed by: PayHere Payment'
                      : ph.source === 'SELF_REGISTRATION'
                      ? 'Self Registration'
                      : 'System';

                    return (
                      <div
                        key={ph.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-[#0F172A] dark:text-white">
                              {transitionText}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                              {sourceText}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0">
                            {formatSriLankaDate(ph.startedAt || ph.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          {creditChangeText && (
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {creditChangeText}
                            </span>
                          )}
                          {ph.reason && (
                            <span className="text-slate-400 truncate max-w-[220px]" title={ph.reason}>
                              {ph.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: SECTION C & SECTION D */}
        <div className="space-y-6">

          {/* SECTION C — CREDITS MANAGEMENT */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <h2 className="font-bold text-sm text-[#0F172A] dark:text-white tracking-tight">
                  Section C — Credits Management
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenCreditModal('INCREASE')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Increase</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreditModal('DECREASE')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Decrease</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Current Credit Balance</span>
                <div className="flex items-center gap-2 mt-1">
                  <Coins className="w-6 h-6 text-amber-500" />
                  <span className="text-2xl font-black font-mono text-[#0F172A] dark:text-white">
                    {user.credits ?? 0}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">credits</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Plan Allowance</span>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {user.plan === 'PROFESSIONAL' ? '1,500 / month' : user.plan === 'CREATOR' ? '500 / month' : '200 initial'}
                </span>
              </div>
            </div>

            {/* Credit Transaction Ledger */}
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block uppercase mb-2">
                Credit Transaction History
              </label>
              {user.creditTransactions && user.creditTransactions.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {user.creditTransactions.slice(0, 8).map((tx) => (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {tx.reason || tx.type}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatSriLankaDateTime(tx.createdAt)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-mono font-bold ${tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} pts
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          bal: {tx.balanceAfter}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-950 rounded-xl">
                  No credit transactions recorded for this account.
                </div>
              )}
            </div>
          </div>

          {/* SECTION D — CONNECTED SOCIAL CHANNELS */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-cyan-500" />
                <h2 className="font-bold text-sm text-[#0F172A] dark:text-white tracking-tight">
                  Section D — Connected Social Channels ({user.socialAccounts?.length || 0})
                </h2>
              </div>
              <span className="text-[10px] text-slate-400">
                Tokens strictly excluded from admin view
              </span>
            </div>

            {user.socialAccounts && user.socialAccounts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {user.socialAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3"
                  >
                    <PlatformIcon platform={acc.platform} className="w-6 h-6 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-[#0F172A] dark:text-white truncate">
                        {acc.accountName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {acc.accountUsername ? `@${acc.accountUsername}` : acc.platform}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Linked: {formatSriLankaDate(acc.createdAt)}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                      {acc.status || 'CONNECTED'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-2xl italic">
                No social channels currently connected by this user.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* FULL-WIDTH BOTTOM SECTIONS: SECTION E & SECTION F */}
      {/* ========================================================================= */}
      <div className="space-y-6">

        {/* SECTION E — ACCOUNT MANAGEMENT & SECURITY CONTROLS */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h2 className="font-bold text-sm text-[#0F172A] dark:text-white tracking-tight">
                Section E — Account Management & Administrative Controls
              </h2>
            </div>
            <span className="text-[10px] text-slate-400">
              Role checks & confirmation dialogs enforced
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Change Plan */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xs text-[#0F172A] dark:text-white">Subscription Tier</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Adjust user to Free, Creator, or Professional.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionModal('plan');
                  setActionInput({ value: user.plan, reason: 'Administrator plan adjustment' });
                }}
                className="w-full py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-xs font-semibold text-[#0F172A] dark:text-white transition-colors cursor-pointer"
              >
                Change Plan
              </button>
            </div>

            {/* Adjust Credits */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xs text-[#0F172A] dark:text-white">Credits Ledger</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Grant or deduct credits with an audit trail.</p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenCreditModal('INCREASE')}
                className="w-full py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-xs font-semibold text-cyan-700 dark:text-cyan-400 transition-colors cursor-pointer"
              >
                Adjust Credits
              </button>
            </div>

            {/* Suspend / Reactivate */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xs text-[#0F172A] dark:text-white">Account Status</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {user.status === 'ACTIVE' ? 'Lock dashboard access temporarily.' : 'Restore dashboard access.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionModal('status');
                  setActionInput({
                    value: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                    reason: user.status === 'ACTIVE' ? 'Administrative suspension' : 'Reactivated by admin'
                  });
                }}
                className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  user.status === 'ACTIVE'
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                }`}
              >
                {user.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
              </button>
            </div>

            {/* Reset Password */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xs text-[#0F172A] dark:text-white">Password Reset</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Email a secure 6-digit OTP code to the user.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionModal('resetPassword');
                  setActionInput({ value: '', reason: 'Administrator initiated secure password reset' });
                }}
                className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Send OTP Email</span>
              </button>
            </div>
          </div>

          {/* Delete Danger Zone */}
          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-xs text-rose-700 dark:text-rose-300">Irreversible Permanent Account Deletion</h3>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                Completely delete this user account, connected channels, and data from the database.
              </p>
            </div>

            <button
              type="button"
              disabled={isProtectedAdmin}
              onClick={() => setDeleteModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 inline-flex items-center gap-1.5"
              title={isProtectedAdmin ? 'Administrators cannot be deleted' : 'Permanently delete user'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete User</span>
            </button>
          </div>
        </div>

        {/* SECTION F — RELEVANT ACTIVITY & OPERATIONAL AUDIT */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <h2 className="font-bold text-sm text-[#0F172A] dark:text-white tracking-tight">
                Section F — Relevant Activity & Operational Audit
              </h2>
            </div>
            <span className="text-[10px] text-slate-400">
              Private post captions strictly protected
            </span>
          </div>

          {/* Security & Activity Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Last Login Timestamp</span>
              <p className="font-mono text-xs font-semibold text-[#0F172A] dark:text-white mt-1">
                {user.lastLoginAt ? formatSriLankaDateTime(user.lastLoginAt) : 'Never logged in'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Last Password Reset</span>
              <p className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400 mt-1">
                {user.lastPasswordResetAt ? formatSriLankaDateTime(user.lastPasswordResetAt) : 'None recorded'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Broadcasts Created</span>
              <p className="font-mono text-xs font-bold text-[#0F172A] dark:text-white mt-1">
                {user._count?.posts || 0} posts
              </p>
            </div>
          </div>

          {/* Password Reset OTP Log */}
          {user.passwordResetOtps && user.passwordResetOtps.length > 0 && (
            <div className="space-y-2 pt-2">
              <label className="text-[10px] text-slate-400 font-semibold block uppercase">
                Password Reset Verification Requests Log
              </label>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px]">
                      <th className="py-2 px-3">Requested At</th>
                      <th className="py-2 px-3">Expires At</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Attempts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                    {user.passwordResetOtps.map((otp) => (
                      <tr key={otp.id}>
                        <td className="py-2 px-3">{formatSriLankaDateTime(otp.createdAt)}</td>
                        <td className="py-2 px-3">{formatSriLankaDateTime(otp.expiresAt)}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            otp.used
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : new Date() > new Date(otp.expiresAt)
                              ? 'bg-slate-500/15 text-slate-500'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}>
                            {otp.used ? 'Successfully Used' : new Date() > new Date(otp.expiresAt) ? 'Expired' : 'Active / Unused'}
                          </span>
                        </td>
                        <td className="py-2 px-3">{otp.attempts} / 5</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Administrative Audit Events */}
          {auditLogs && auditLogs.length > 0 && (
            <div className="space-y-2 pt-2">
              <label className="text-[10px] text-slate-400 font-semibold block uppercase">
                Administrative Audit Events on This User
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-400 font-mono text-[10px] font-bold mr-2">
                        {log.action}
                      </span>
                      <span className="text-[#0F172A] dark:text-slate-300">
                        by <strong>{log.admin?.name || log.admin?.email}</strong>
                      </span>
                      {log.details && (
                        <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-1 font-mono">{log.details}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {formatSriLankaDateTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ACTION MODALS */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={
          actionModal === 'plan'
            ? `Change Subscription Tier for ${user.name}`
            : actionModal === 'credits'
            ? `${creditMode === 'DECREASE' ? 'Deduct Credits From' : 'Grant Credits To'} ${user.name}`
            : actionModal === 'status'
            ? `Update Status for ${user.name}`
            : `Initiate Secure Password Reset for ${user.name}`
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
          {actionModal === 'resetPassword' && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Dispatch OTP Verification Email</span>
              </div>
              <p className="leading-relaxed">
                A secure 6-digit one-time password code will be generated and dispatched directly to <strong>{user.email}</strong>.
                Administrators never see the plaintext OTP or password.
              </p>
            </div>
          )}

          {actionModal === 'plan' && (
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Select Plan Tier</label>
              <select
                value={actionInput.value}
                onChange={(e) => setActionInput({ ...actionInput, value: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
              >
                <option value="FREE">Free Tier (LKR 0)</option>
                <option value="CREATOR">Creator Tier (LKR 1,000)</option>
                <option value="PROFESSIONAL">Professional Tier (LKR 2,500)</option>
              </select>
            </div>
          )}

          {actionModal === 'status' && (
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Target Account Status</label>
              <select
                value={actionInput.value}
                onChange={(e) => setActionInput({ ...actionInput, value: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
              >
                <option value="ACTIVE">ACTIVE (Authorized to access dashboard)</option>
                <option value="SUSPENDED">SUSPENDED (Access locked)</option>
              </select>
            </div>
          )}

          {actionModal === 'credits' && (() => {
            const currentCredits = user?.credits || 0;
            const isDecrease = creditMode === 'DECREASE';
            const numVal = parseInt(actionInput.value, 10) || 0;
            const newBalance = isDecrease ? currentCredits - numVal : currentCredits + numVal;
            const isInsufficient = isDecrease && currentCredits < numVal;
            const presets = [10, 25, 50, 100, 250, 500];

            return (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCreditMode('INCREASE');
                      if (!actionInput.reason || actionInput.reason === 'Admin discretionary credit deduction') {
                        setActionInput((prev) => ({ ...prev, reason: 'Admin discretionary credit grant' }));
                      }
                    }}
                    className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !isDecrease
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Increase (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreditMode('DECREASE');
                      if (!actionInput.reason || actionInput.reason === 'Admin discretionary credit grant') {
                        setActionInput((prev) => ({ ...prev, reason: 'Admin discretionary credit deduction' }));
                      }
                    }}
                    className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isDecrease
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span>Decrease (-)</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-[#0F172A] dark:text-white">{user.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-semibold">Current Balance</span>
                    <span className="text-base font-black font-mono text-cyan-600 dark:text-cyan-400">
                      {currentCredits} pts
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Quick Presets</label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {presets.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setActionInput((prev) => ({ ...prev, value: String(amt) }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                          String(amt) === String(actionInput.value)
                            ? isDecrease
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        {isDecrease ? `-${amt}` : `+${amt}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">
                    Points Amount to {isDecrease ? 'Deduct' : 'Grant'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      value={actionInput.value}
                      onChange={(e) => setActionInput({ ...actionInput, value: e.target.value })}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs font-mono font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      credits
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  isInsufficient
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                    : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-300'
                }`}>
                  <span>Resulting Balance:</span>
                  <span className="font-mono font-bold">
                    {currentCredits} {isDecrease ? '-' : '+'} {numVal} ={' '}
                    <span className={isInsufficient ? 'text-rose-600 underline' : 'text-emerald-600 dark:text-emerald-400'}>
                      {newBalance} credits
                    </span>
                  </span>
                </div>
              </div>
            );
          })()}

          <div>
            <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Administrator Justification</label>
            <input
              type="text"
              required
              value={actionInput.reason}
              onChange={(e) => setActionInput({ ...actionInput, reason: e.target.value })}
              placeholder="State reason for audit trail..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
            />
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={actionModal === 'credits' && creditMode === 'DECREASE' ? 'danger' : 'primary'}
              isLoading={actionSubmitting}
              className={actionModal === 'credits' && creditMode !== 'DECREASE' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : ''}
            >
              {actionModal === 'resetPassword'
                ? 'Send Reset Email'
                : actionModal === 'credits'
                ? creditMode === 'DECREASE'
                  ? `Deduct -${actionInput.value || 0} Credits`
                  : `Grant +${actionInput.value || 0} Credits`
                : 'Apply Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        width="min(440px, calc(100vw - 32px))"
        showClose={!deleting}
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
              className="flex-1 text-xs py-2.5 font-medium cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteUser}
              isLoading={deleting}
              className="flex-1 text-xs py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer shadow-xs shadow-rose-600/20"
            >
              {deleting ? 'Deleting User...' : 'Delete User'}
            </Button>
          </div>
        }
      >
        <div className="text-center p-1 space-y-3">
          {/* Subtle Red Trash Badge */}
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center ring-8 ring-rose-50 dark:ring-rose-900/20">
            <Trash2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">
              Are you sure?
            </h3>
            <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-[#0F172A] dark:text-white font-semibold">{user.name}</strong>?
            </p>
            <div className="pt-0.5">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 font-mono break-all">
                ({user.email})
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-left">
            <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
              <strong>Warning:</strong> This action cannot be undone and will permanently remove this account.
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default AdminUserDetailPage;
