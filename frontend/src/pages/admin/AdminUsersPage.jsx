import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Share2,
  Layers,
  Coins,
  ShieldCheck,
  KeyRound,
  Eye,
  Sparkles,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    freeCount: 0,
    creatorCount: 0,
    proCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    password: '',
    plan: 'FREE',
    credits: 200,
    role: 'USER'
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Quick Action modal states
  const [activeUserAction, setActiveUserAction] = useState(null); // { user, type: 'plan' | 'status' | 'credits' | 'resetPassword' }
  const [actionInput, setActionInput] = useState({ value: '', reason: '' });
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadUsers = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', 15);
      if (search) params.set('search', search);
      if (planFilter) params.set('plan', planFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (sourceFilter) params.set('registrationSource', sourceFilter);
      if (verificationFilter) params.set('isEmailVerified', verificationFilter);

      const [usersRes, dashRes] = await Promise.all([
        api.get(`/admin/users?${params.toString()}`),
        api.get('/admin/dashboard').catch(() => null)
      ]);

      if (usersRes.success) {
        setUsers(usersRes.data.users);
        setPagination(usersRes.data.pagination);
      }
      if (dashRes?.success && dashRes.data?.summary) {
        const s = dashRes.data.summary;
        setStats({
          totalUsers: s.totalUsers || 0,
          activeUsers: s.activeUsers || 0,
          freeCount: s.planDistribution?.FREE || 0,
          creatorCount: s.planDistribution?.CREATOR || 0,
          proCount: s.planDistribution?.PROFESSIONAL || 0
        });
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, [planFilter, statusFilter, sourceFilter, verificationFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers(1);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setCreateSubmitting(true);
      const res = await api.post('/admin/users', createFormData);
      if (res.success) {
        setCreateModalOpen(false);
        setCreateFormData({
          name: '',
          email: '',
          password: '',
          plan: 'FREE',
          credits: 50,
          role: 'USER'
        });
        loadUsers(1);
      }
    } catch (err) {
      alert(err.message || 'Failed to create user');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleExecuteQuickAction = async (e) => {
    e.preventDefault();
    if (!activeUserAction) return;

    try {
      setActionSubmitting(true);
      const userId = activeUserAction.user.id;

      if (activeUserAction.type === 'plan') {
        await api.patch(`/admin/users/${userId}/plan`, {
          plan: actionInput.value,
          reason: actionInput.reason
        });
      } else if (activeUserAction.type === 'status') {
        await api.patch(`/admin/users/${userId}/status`, {
          status: actionInput.value,
          reason: actionInput.reason
        });
      } else if (activeUserAction.type === 'credits') {
        await api.post(`/admin/users/${userId}/credits`, {
          amount: parseInt(actionInput.value, 10),
          reason: actionInput.reason
        });
      } else if (activeUserAction.type === 'resetPassword') {
        const res = await api.post(`/admin/users/${userId}/initiate-password-reset`, {
          reason: actionInput.reason || 'Admin initiated secure password reset'
        });
        alert(res.message || 'Password reset verification code dispatched to user.');
      }

      setActiveUserAction(null);
      setActionInput({ value: '', reason: '' });
      loadUsers(pagination.page);
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] dark:text-white tracking-tight">Registered Users</h2>
          <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
            Total of {pagination.total} user accounts registered in database
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Create User</span>
        </button>
      </div>

      {/* 5 Stats Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 flex items-center gap-3 shadow-soft">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#0F172A] dark:text-white leading-tight">{stats.totalUsers || pagination.total}</div>
            <div className="text-[11px] text-[#475569] dark:text-slate-400">Total Users</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 flex items-center gap-3 shadow-soft">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{stats.activeUsers || pagination.total}</div>
            <div className="text-[11px] text-[#475569] dark:text-slate-400">Active Users</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 flex items-center gap-3 shadow-soft">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#0F172A] dark:text-white leading-tight">{stats.freeCount}</div>
            <div className="text-[11px] text-[#475569] dark:text-slate-400">Free Plan</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 flex items-center gap-3 shadow-soft">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400 leading-tight">{stats.creatorCount}</div>
            <div className="text-[11px] text-[#475569] dark:text-slate-400">Creator Plan</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1 shadow-soft">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400 leading-tight">{stats.proCount}</div>
            <div className="text-[11px] text-[#475569] dark:text-slate-400">Professional</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-soft">
        
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white font-semibold text-xs transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 focus:outline-hidden"
          >
            <option value="">All Plans</option>
            <option value="FREE">Free</option>
            <option value="CREATOR">Creator</option>
            <option value="PROFESSIONAL">Professional</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {/* Registration Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 focus:outline-hidden"
          >
            <option value="">All Sources</option>
            <option value="SELF_REGISTRATION">Self-Registration</option>
            <option value="ADMIN_CREATED">Admin Created</option>
          </select>

          {/* Verification Status Filter */}
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 focus:outline-hidden"
          >
            <option value="">All Verification</option>
            <option value="true">Email Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>

      </div>

      {/* Users Directory Table */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl overflow-hidden shadow-soft">
        {loading ? (
          <div className="py-20">
            <LoadingState message="Loading users..." />
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-[#475569] dark:text-slate-500 text-xs space-y-2">
            <Users className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
            <p>No matching users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#334155] bg-slate-50/80 dark:bg-slate-950/80 text-[#475569] dark:text-slate-400">
                  <th className="py-4 px-5 font-semibold">User Details</th>
                  <th className="py-4 px-5 font-semibold">Status & Verification</th>
                  <th className="py-4 px-5 font-semibold">Plan & Credits</th>
                  <th className="py-4 px-5 font-semibold">Connected Channels</th>
                  <th className="py-4 px-5 font-semibold">Account Source & Creation</th>
                  <th className="py-4 px-5 font-semibold">Activity & Security</th>
                  <th className="py-4 px-5 font-semibold text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60 text-[#0F172A] dark:text-slate-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                    
                    {/* User Details */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name?.charAt(0) || 'U'}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/users/${u.id}`}
                              className="font-bold text-[#0F172A] dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                            >
                              {u.name}
                            </Link>
                            {u.role === 'ADMIN' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#475569] dark:text-slate-400 font-mono truncate max-w-xs">{u.email}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            ID: <span className="text-slate-600 dark:text-slate-400">{u.id}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status & Verification */}
                    <td className="py-3.5 px-5 space-y-1">
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUserAction({ user: u, type: 'status' });
                            setActionInput({
                              value: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                              reason: u.status === 'ACTIVE' ? 'Administrative suspension' : 'Reactivated by admin'
                            });
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
                          }`}
                          title="Click to toggle status"
                        >
                          {u.status} ✎
                        </button>
                      </div>
                      <div>
                        {u.isEmailVerified ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            title={u.emailVerifiedAt ? `Verified: ${new Date(u.emailVerifiedAt).toLocaleString()}` : 'Verified'}
                          >
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Unverified
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Plan & Credits */}
                    <td className="py-3.5 px-5 space-y-1.5">
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUserAction({ user: u, type: 'plan' });
                            setActionInput({ value: u.plan, reason: 'Manual admin tier update' });
                          }}
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-[#0F172A] dark:text-slate-200 transition-colors"
                          title="Click to modify plan"
                        >
                          {u.plan} ✎
                        </button>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUserAction({ user: u, type: 'credits' });
                            setActionInput({ value: '50', reason: 'Admin discretionary grant' });
                          }}
                          className="px-2 py-0.5 rounded-md text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 transition-colors"
                          title="Click to adjust credits"
                        >
                          {u.credits} pts ✎
                        </button>
                      </div>
                    </td>

                    {/* Connected Channels & Platform Names */}
                    <td className="py-3.5 px-5">
                      <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-xs text-[#0F172A] dark:text-slate-300 font-medium">
                          <Share2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          {u._count?.socialAccounts || u.socialAccounts?.length || 0} channels
                        </span>
                        {u.socialAccounts && u.socialAccounts.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1 max-w-[180px]">
                            {u.socialAccounts.map((sa) => (
                              <span
                                key={sa.id}
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                title={sa.accountName ? `${sa.platform} - ${sa.accountName}` : sa.platform}
                              >
                                {sa.platform}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">None connected</p>
                        )}
                      </div>
                    </td>

                    {/* Creation Source & Audit */}
                    <td className="py-3.5 px-5 space-y-1">
                      <div>
                        {u.registrationSource === 'ADMIN_CREATED' ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                            title={u.createdByAdmin ? `Created by Admin: ${u.createdByAdmin.name} (${u.createdByAdmin.email})` : 'Created by Admin'}
                          >
                            Admin: {u.createdByAdmin?.name || 'Administrator'}
                          </span>
                        ) : u.registrationSource === 'SELF_REGISTRATION' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                            Self-Registration
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Not available</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#475569] dark:text-slate-400 font-mono">
                        {new Date(u.createdAt).toLocaleDateString()} {new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>

                    {/* Activity & Security (Last Login & Last Reset) */}
                    <td className="py-3.5 px-5 space-y-1">
                      <div className="text-[11px]">
                        <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Last Login:</span>
                        {u.lastLoginAt ? (
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {new Date(u.lastLoginAt).toLocaleDateString()} {new Date(u.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Not available</span>
                        )}
                      </div>
                      <div className="text-[11px]">
                        <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Last Reset:</span>
                        {u.lastPasswordResetAt ? (
                          <span className="font-mono text-cyan-600 dark:text-cyan-400">
                            {new Date(u.lastPasswordResetAt).toLocaleDateString()} {new Date(u.lastPasswordResetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">None recorded</span>
                        )}
                      </div>
                    </td>

                    {/* Quick Actions */}
                    <td className="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveUserAction({ user: u, type: 'resetPassword' });
                          setActionInput({ value: '', reason: 'Admin initiated password reset' });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold text-xs transition-colors cursor-pointer"
                        title="Send secure password-reset OTP email to user"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>

                      <Link
                        to={`/admin/users/${u.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white font-semibold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-[#475569] dark:text-slate-400">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total accounts)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadUsers(pagination.page - 1)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 disabled:opacity-40 text-[#0F172A] dark:text-slate-300 hover:text-cyan-600 dark:hover:text-white"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadUsers(pagination.page + 1)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 disabled:opacity-40 text-[#0F172A] dark:text-slate-300 hover:text-cyan-600 dark:hover:text-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Provision New User */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Provision New User Account"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Full Name</label>
            <input
              type="text"
              required
              value={createFormData.name}
              onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
              placeholder="Alex Doe"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Email Address</label>
            <input
              type="email"
              required
              value={createFormData.email}
              onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
              placeholder="alex@example.com"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Initial Password (Min 8 characters)</label>
            <input
              type="password"
              required
              minLength={8}
              value={createFormData.password}
              onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
              placeholder="SecureInitialPass123!"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Assigned Plan</label>
              <select
                value={createFormData.plan}
                onChange={(e) => setCreateFormData({ ...createFormData, plan: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
              >
                <option value="FREE">Free (200 credits)</option>
                <option value="CREATOR">Creator (500 credits)</option>
                <option value="PROFESSIONAL">Professional (1,000 credits)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Initial Credits</label>
              <input
                type="number"
                min="0"
                value={createFormData.credits}
                onChange={(e) => setCreateFormData({ ...createFormData, credits: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createSubmitting}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Quick Actions (Plan, Status, Credits, Password Reset) */}
      <Modal
        isOpen={Boolean(activeUserAction)}
        onClose={() => setActiveUserAction(null)}
        title={
          activeUserAction?.type === 'plan'
            ? `Change Plan for ${activeUserAction.user.name}`
            : activeUserAction?.type === 'status'
            ? `Update Status for ${activeUserAction.user.name}`
            : activeUserAction?.type === 'resetPassword'
            ? `Initiate Password Reset for ${activeUserAction?.user?.name}`
            : `Adjust Credits for ${activeUserAction?.user?.name}`
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExecuteQuickAction} className="space-y-4 text-xs">
          {activeUserAction?.type === 'resetPassword' && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Dispatch OTP Verification Email</span>
              </div>
              <p className="leading-relaxed">
                This will generate a fresh 6-digit OTP and email it directly to <strong>{activeUserAction.user.email}</strong>.
                For privacy and security, original passwords and raw OTP codes are never displayed to administrators.
              </p>
            </div>
          )}

          {activeUserAction?.type === 'plan' && (
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Select Subscription Tier</label>
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

          {activeUserAction?.type === 'status' && (
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

          {activeUserAction?.type === 'credits' && (
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">
                Credit Adjustment (Positive to grant, negative to deduct)
              </label>
              <input
                type="number"
                required
                value={actionInput.value}
                onChange={(e) => setActionInput({ ...actionInput, value: e.target.value })}
                placeholder="e.g. 50 or -25"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
              />
              <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-1">
                Current balance: {activeUserAction?.user?.credits} credits
              </p>
            </div>
          )}

          <div>
            <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Administrator Justification Reason</label>
            <input
              type="text"
              required
              value={actionInput.reason}
              onChange={(e) => setActionInput({ ...actionInput, reason: e.target.value })}
              placeholder="State reason for audit log..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
            />
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setActiveUserAction(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={actionSubmitting}>
              {activeUserAction?.type === 'resetPassword' ? 'Send Reset Email' : 'Apply Change'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
export default AdminUsersPage;
