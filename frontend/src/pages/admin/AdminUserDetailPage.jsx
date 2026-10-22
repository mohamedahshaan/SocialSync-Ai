import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Send,
  Eye,
  KeyRound
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { PlatformIcon } from '../../components/public/PlatformIcon';

export function AdminUserDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'planHistory' | 'credits' | 'payments' | 'audit'

  // Action Modals
  const [actionModal, setActionModal] = useState(null); // 'plan' | 'credits' | 'status' | 'resetPassword'
  const [actionInput, setActionInput] = useState({ value: '', reason: '' });
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/users/${id}`);
      if (res.success) {
        setData(res.data);
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
        await api.post(`/admin/users/${id}/credits`, {
          amount: parseInt(actionInput.value, 10),
          reason: actionInput.reason
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

  if (loading) {
    return <LoadingState message="Inspecting user profile & security records..." />;
  }

  if (error || !data?.user) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 mx-auto text-rose-400" />
        <h3 className="text-base font-bold">Failed to load user profile</h3>
        <p className="text-xs text-rose-300/80">{error || 'User not found in database.'}</p>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Users Directory
        </Link>
      </div>
    );
  }

  const { user, recentPosts, auditLogs } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Breadcrumb & Return Link */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#475569] dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Users Directory</span>
        </Link>

        <span className="text-[11px] text-[#475569] dark:text-slate-500 font-mono">
          User ID: {user.id}
        </span>
      </div>

      {/* User Header Profile Card */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-cyan-500/20 shrink-0">
            {user.name?.charAt(0) || 'U'}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">{user.name}</h2>
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
              {user.role === 'ADMIN' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  SYSTEM ADMIN
                </span>
              )}
            </div>

            <p className="text-xs text-[#475569] dark:text-slate-400 font-mono">{user.email}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Registered on {new Date(user.createdAt).toLocaleDateString()} ({new Date(user.createdAt).toLocaleTimeString()})
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0] dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActionModal('plan');
              setActionInput({ value: user.plan, reason: 'Administrator plan adjustment' });
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-cyan-500 text-xs font-semibold text-[#0F172A] dark:text-white transition-colors"
          >
            Change Plan
          </button>

          <button
            type="button"
            onClick={() => {
              setActionModal('credits');
              setActionInput({ value: '100', reason: 'Admin discretionary grant' });
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-cyan-500 text-xs font-semibold text-cyan-700 dark:text-cyan-400 transition-colors"
          >
            Adjust Credits
          </button>

          <button
            type="button"
            onClick={() => {
              setActionModal('status');
              setActionInput({
                value: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                reason: user.status === 'ACTIVE' ? 'Administrative policy violation' : 'Reactivated by admin'
              });
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              user.status === 'ACTIVE'
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {user.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
          </button>

          <button
            type="button"
            onClick={() => {
              setActionModal('resetPassword');
              setActionInput({ value: '', reason: 'Administrator initiated secure password reset' });
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Dispatch secure 6-digit password-reset OTP email to user"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>
        </div>
      </div>

      {/* Mini Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-[#475569] dark:text-slate-400 font-medium">Credit Balance</p>
          <p className="text-xl sm:text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1 font-mono">{user.credits} pts</p>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-[#475569] dark:text-slate-400 font-medium">Connected Endpoints</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white mt-1">{user.socialAccounts?.length || 0} channels</p>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-[#475569] dark:text-slate-400 font-medium">Total Broadcasts</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white mt-1">{user._count?.posts || 0} posts</p>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-[#475569] dark:text-slate-400 font-medium">Payment Invoices</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{user.payments?.length || 0} invoices</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] dark:border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Overview & Channels', count: user.socialAccounts?.length },
          { id: 'planHistory', label: 'Plan History', count: user.planHistory?.length },
          { id: 'credits', label: 'Credit Ledger', count: user.creditTransactions?.length },
          { id: 'payments', label: 'Payment Records', count: user.payments?.length },
          { id: 'audit', label: 'Audit Events', count: auditLogs?.length }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-white shadow-sm'
                : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/60'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-900 text-[10px] text-slate-700 dark:text-slate-300">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & CONNECTED CHANNELS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Account Creation & Security Audit Card */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Account Creation & Identity Audit</h3>
                <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
                  Verified database records of user provisioning, creation source, and security timestamps
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 self-start sm:self-auto">
                User ID: {user.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Registration Source</span>
                <div className="flex items-center gap-2">
                  {user.registrationSource === 'ADMIN_CREATED' ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                      Admin Created
                    </span>
                  ) : user.registrationSource === 'SELF_REGISTRATION' ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                      Self-Registration
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Not available</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Account Creator</span>
                <p className="text-xs font-semibold text-[#0F172A] dark:text-slate-200 truncate">
                  {user.createdByAdmin
                    ? `${user.createdByAdmin.name} (${user.createdByAdmin.email})`
                    : user.registrationSource === 'SELF_REGISTRATION'
                    ? 'Self-Registered User'
                    : 'Not available'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Email Verification Status</span>
                <div className="flex items-center gap-2">
                  {user.isEmailVerified ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      ✓ Email Verified {user.emailVerifiedAt ? `(${new Date(user.emailVerifiedAt).toLocaleDateString()})` : ''}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      ⚠️ Pending Verification
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Creation Date & Time</span>
                <p className="text-xs font-mono font-medium text-[#0F172A] dark:text-slate-200">
                  {new Date(user.createdAt).toLocaleDateString()} at {new Date(user.createdAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Last Login Timestamp</span>
                <p className="text-xs font-mono font-medium text-[#0F172A] dark:text-slate-200">
                  {user.lastLoginAt
                    ? `${new Date(user.lastLoginAt).toLocaleDateString()} at ${new Date(user.lastLoginAt).toLocaleTimeString()}`
                    : 'Not available'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Last Password Reset</span>
                <p className="text-xs font-mono font-medium text-cyan-600 dark:text-cyan-400">
                  {user.lastPasswordResetAt
                    ? `${new Date(user.lastPasswordResetAt).toLocaleDateString()} at ${new Date(user.lastPasswordResetAt).toLocaleTimeString()}`
                    : 'None recorded'}
                </p>
              </div>
            </div>

            {/* Password Reset OTP History */}
            {user.passwordResetOtps && user.passwordResetOtps.length > 0 && (
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F172A] dark:text-slate-200 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Password Reset Verification Requests Log</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Plaintext OTPs & passwords strictly confidential
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] dark:border-slate-800 text-slate-400 text-[10px]">
                        <th className="py-2 px-3">Requested At</th>
                        <th className="py-2 px-3">Expires At</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Failed Attempts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60 font-mono text-[11px]">
                      {user.passwordResetOtps.map((otp) => (
                        <tr key={otp.id}>
                          <td className="py-2 px-3">{new Date(otp.createdAt).toLocaleString()}</td>
                          <td className="py-2 px-3">{new Date(otp.expiresAt).toLocaleString()}</td>
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
          </div>

          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Connected Social Accounts</h3>
            <p className="text-xs text-[#475569] dark:text-slate-400">
              Active OAuth endpoints authorized by the user. Direct OAuth tokens are strictly masked from administrative view for security.
            </p>

            {user.socialAccounts?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No social channels linked yet by this user.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {user.socialAccounts?.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={acc.platform} className="w-5 h-5" />
                        <span className="text-xs font-bold text-[#0F172A] dark:text-white">{acc.platform}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/15">
                        {acc.status}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-[#0F172A] dark:text-slate-200 truncate">
                      {acc.accountName || 'Active Account'}
                    </p>
                    <p className="text-[11px] text-[#475569] dark:text-slate-500 truncate">
                      Username: {acc.accountUsername || 'N/A'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 border-t border-[#E2E8F0] dark:border-slate-800/80 pt-2">
                      Linked: {new Date(acc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Broadcasts */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Recent Post Broadcasts</h3>
            {recentPosts?.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">No posts created yet.</p>
            ) : (
              <div className="space-y-3">
                {recentPosts?.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <p className="text-[#0F172A] dark:text-slate-200 line-clamp-1">{post.caption}</p>
                      <div className="flex items-center gap-2 text-[11px] text-[#475569] dark:text-slate-500">
                        <span>Format: {post.mediaType}</span>
                        <span>•</span>
                        <span>Created: {new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        post.status === 'PUBLISHED'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : post.status === 'FAILED'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                      }`}>
                        {post.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PLAN HISTORY */}
      {activeTab === 'planHistory' && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Subscription Tier Transition History</h3>
          <p className="text-xs text-[#475569] dark:text-slate-400">Complete audit log of plan activations and upgrades</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-slate-800 text-[#475569] dark:text-slate-400">
                  <th className="pb-3 font-semibold">Tier</th>
                  <th className="pb-3 font-semibold">Reason</th>
                  <th className="pb-3 font-semibold">Started At</th>
                  <th className="pb-3 font-semibold">Ended At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60 text-[#0F172A] dark:text-slate-300">
                {user.planHistory?.map((ph) => (
                  <tr key={ph.id}>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-cyan-700 dark:text-cyan-300">
                        {ph.plan}
                      </span>
                    </td>
                    <td className="py-3 text-[#0F172A] dark:text-slate-300">{ph.reason || 'Tier update'}</td>
                    <td className="py-3 text-[#475569] dark:text-slate-400">{new Date(ph.startedAt).toLocaleString()}</td>
                    <td className="py-3 text-[#475569] dark:text-slate-400">
                      {ph.endedAt ? new Date(ph.endedAt).toLocaleString() : <strong className="text-emerald-600 dark:text-emerald-400">Active Current</strong>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CREDIT TRANSACTIONS */}
      {activeTab === 'credits' && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Credit Audit Ledger</h3>
          <p className="text-xs text-[#475569] dark:text-slate-400">Ledger of all grant, deduction, and usage transactions</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-slate-800 text-[#475569] dark:text-slate-400">
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Balance After</th>
                  <th className="pb-3 font-semibold">Reason</th>
                  <th className="pb-3 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60 text-[#0F172A] dark:text-slate-300">
                {user.creditTransactions?.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold">
                      <span className={tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-cyan-600 dark:text-cyan-300 font-semibold">{tx.balanceAfter} pts</td>
                    <td className="py-3 text-[#475569] dark:text-slate-300">{tx.reason}</td>
                    <td className="py-3 text-right text-[#475569] dark:text-slate-400 text-[11px]">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Verified & Recorded Invoices</h3>
          <p className="text-xs text-[#475569] dark:text-slate-400">Financial invoices associated with this account</p>

          {user.payments?.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">No payment transactions on file.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-slate-800 text-[#475569] dark:text-slate-400">
                    <th className="pb-3 font-semibold">Reference</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Plan</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Verified Date</th>
                    <th className="pb-3 font-semibold text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60 text-[#0F172A] dark:text-slate-300">
                  {user.payments?.map((pm) => (
                    <tr key={pm.id}>
                      <td className="py-3 font-mono font-bold text-[#0F172A] dark:text-white">{pm.reference}</td>
                      <td className="py-3 font-semibold text-[#0F172A] dark:text-white">
                        {pm.currency} {pm.amount.toLocaleString()}
                      </td>
                      <td className="py-3">{pm.plan}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pm.status === 'VERIFIED'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}>
                          {pm.status}
                        </span>
                      </td>
                      <td className="py-3 text-[#475569] dark:text-slate-400">
                        {pm.verifiedAt ? new Date(pm.verifiedAt).toLocaleDateString() : 'Pending'}
                      </td>
                      <td className="py-3 text-right text-[#475569] dark:text-slate-400 text-[11px]">
                        {new Date(pm.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Administrative Actions on this User</h3>
          <p className="text-xs text-[#475569] dark:text-slate-400">Security audit history recorded by the platform</p>

          <div className="space-y-3">
            {auditLogs?.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-400 font-mono text-[10px] font-bold mr-2">
                    {log.action}
                  </span>
                  <span className="text-[#0F172A] dark:text-slate-300">Executed by <strong>{log.admin?.name || log.admin?.email}</strong></span>
                  {log.details && (
                    <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-1 font-mono">{log.details}</p>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Modal (Plan / Credits / Status / Password Reset) */}
      <Modal
        isOpen={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={
          actionModal === 'plan'
            ? 'Change User Plan'
            : actionModal === 'credits'
            ? 'Adjust User Credits'
            : actionModal === 'status'
            ? 'Update Account Status'
            : 'Initiate Secure Password Reset'
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
                A secure 6-digit one-time verification code will be generated and dispatched directly to <strong>{user.email}</strong>.
                Administrators cannot view users' original passwords or plaintext OTP codes, protecting user privacy and preventing unauthorized credential hijacking.
              </p>
            </div>
          )}

          {actionModal === 'plan' && (
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Select Plan</label>
              <select
                value={actionInput.value}
                onChange={(e) => setActionInput({ ...actionInput, value: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
              >
                <option value="FREE">Free Tier (LKR 0)</option>
                <option value="CREATOR">Creator Tier (LKR 1,000)</option>
                <option value="PROFESSIONAL">Professional Tier (LKR 2,500)</option>
              </select>
            </div>
          )}

          {actionModal === 'credits' && (
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Credit Adjustment Amount</label>
              <input
                type="number"
                required
                value={actionInput.value}
                onChange={(e) => setActionInput({ ...actionInput, value: e.target.value })}
                placeholder="e.g. 100 or -50"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
              />
            </div>
          )}

          {actionModal === 'status' && (
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Target Status</label>
              <select
                value={actionInput.value}
                onChange={(e) => setActionInput({ ...actionInput, value: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Reason for Audit Log</label>
            <input
              type="text"
              required
              value={actionInput.reason}
              onChange={(e) => setActionInput({ ...actionInput, reason: e.target.value })}
              placeholder="State reason..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
            />
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={actionSubmitting}>
              {actionModal === 'resetPassword' ? 'Send Reset Email' : 'Apply Changes'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
export default AdminUserDetailPage;
