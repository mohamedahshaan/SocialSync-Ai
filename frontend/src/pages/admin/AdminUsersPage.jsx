import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  PlusCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  Crown,
  AlertTriangle,
  Copy,
  Check,
  ChevronRight,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import {
  formatSriLankaDate,
  formatSriLankaTime,
  formatSriLankaDateTime
} from '../../utils/timezone';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL search params to ensure state preservation on back navigation
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const searchParam = searchParams.get('search') || '';
  const planFilter = searchParams.get('plan') || '';
  const statusFilter = searchParams.get('status') || '';
  const sourceFilter = searchParams.get('registrationSource') || '';
  const verificationFilter = searchParams.get('isEmailVerified') || '';

  const [searchInput, setSearchInput] = useState(searchParam);
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
  const [copiedEmailId, setCopiedEmailId] = useState(null);

  // Provision User modal state
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

  // Sync search input if URL search param changes
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (searchParam) params.set('search', searchParam);
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
    loadUsers();
  }, [page, searchParam, planFilter, statusFilter, sourceFilter, verificationFilter]);

  // URL search params updater to keep filters synchronized in browser history
  const updateUrlParam = (key, value, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (resetPage) {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateUrlParam('search', searchInput.trim(), true);
  };

  const handlePageChange = (newPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  };

  const handleCopyEmail = (email, id, e) => {
    e?.stopPropagation();
    if (!email) return;
    navigator.clipboard?.writeText(email);
    setCopiedEmailId(id);
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  // Navigate to full-screen Inspect User Details page
  const handleInspectUser = (user, e) => {
    e?.stopPropagation();
    navigate(`/admin/users/${user.id}`, {
      state: {
        from: location.pathname + location.search
      }
    });
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
          credits: 200,
          role: 'USER'
        });
        loadUsers();
      }
    } catch (err) {
      alert(err.message || 'Failed to create user');
    } finally {
      setCreateSubmitting(false);
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
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create User</span>
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => updateUrlParam('plan', e.target.value, true)}
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
            onChange={(e) => updateUrlParam('status', e.target.value, true)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {/* Registration Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => updateUrlParam('registrationSource', e.target.value, true)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 focus:outline-hidden"
          >
            <option value="">All Sources</option>
            <option value="SELF_REGISTRATION">Self-Registration</option>
            <option value="ADMIN_CREATED">Admin Created</option>
          </select>

          {/* Verification Status Filter */}
          <select
            value={verificationFilter}
            onChange={(e) => updateUrlParam('isEmailVerified', e.target.value, true)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 focus:outline-hidden"
          >
            <option value="">All Verification</option>
            <option value="true">Email Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>

      </div>

      {/* Users Table (Clean 5-Column Responsive Layout) */}
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
          <>
            {/* Desktop Table: Zero Horizontal Scroll at Desktop Widths */}
            <div className="hidden md:block w-full overflow-hidden">
              <table className="w-full text-left text-xs table-fixed">
                <colgroup>
                  <col className="w-[24%]" /> {/* 1. Name */}
                  <col className="w-[26%]" /> {/* 2. Email */}
                  <col className="w-[16%]" /> {/* 3. Plan */}
                  <col className="w-[15%]" /> {/* 4. Registered */}
                  <col className="w-[8%]" />  {/* 5. Status */}
                  <col className="w-[11%]" /> {/* 6. Action */}
                </colgroup>
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-[#334155] bg-slate-50/80 dark:bg-slate-950/80 text-[#475569] dark:text-slate-400">
                    <th className="py-3.5 px-4 font-semibold text-left">Name</th>
                    <th className="py-3.5 px-4 font-semibold text-left">Email</th>
                    <th className="py-3.5 px-4 font-semibold text-left">Plan</th>
                    <th className="py-3.5 px-4 font-semibold text-left">Registered</th>
                    <th className="py-3.5 px-3 font-semibold text-left">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60 text-[#0F172A] dark:text-slate-300">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      onClick={(e) => handleInspectUser(u, e)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors cursor-pointer group"
                      title="Click to view full-screen User Details"
                    >
                      
                      {/* 1. Name (user avatar/initial and full name) */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 border border-cyan-500/20 group-hover:scale-105 transition-transform">
                            {u.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="font-bold text-[#0F172A] dark:text-white text-xs sm:text-sm group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors"
                              >
                                {u.name}
                              </span>
                              {['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'].includes(u.role) && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 shrink-0">
                                  {u.role === 'SUPER_ADMIN' ? 'SUPER' : u.role === 'SUPPORT_ADMIN' ? 'SUPPORT' : 'ADMIN'}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              ID: {u.id.substring(0, 10)}…
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Email (email address with copy icon and verification badge) */}
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-xs text-[#0F172A] dark:text-slate-200 font-mono select-all truncate max-w-[200px]"
                              title={u.email}
                            >
                              {u.email}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyEmail(u.email, u.id, e)}
                              className="p-1 rounded text-slate-400 hover:text-cyan-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                              title="Copy email address"
                            >
                              {copiedEmailId === u.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div>
                            {u.isEmailVerified ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                title={u.emailVerifiedAt ? `Verified: ${formatSriLankaDateTime(u.emailVerifiedAt)}` : 'Verified'}
                              >
                                <Check className="w-2.5 h-2.5" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                title="Unverified email address"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Unverified</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Plan (Free, Creator, or Professional badge with plan price) */}
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-1">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-tight inline-flex items-center gap-1.5 border ${
                              u.plan === 'PROFESSIONAL'
                                ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                                : u.plan === 'CREATOR'
                                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {u.plan === 'PROFESSIONAL' && <Crown className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                            {u.plan === 'CREATOR' && <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />}
                            {u.plan === 'FREE' && <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                            <span>{u.plan}</span>
                          </span>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {u.plan === 'PROFESSIONAL' ? 'LKR 2,500/mo' : u.plan === 'CREATOR' ? 'LKR 1,000/mo' : 'Free (LKR 0)'}
                          </p>
                        </div>
                      </td>

                      {/* 4. Registered (registration date and time, formatted clearly) */}
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-0.5">
                          <div className="font-medium text-xs text-[#0F172A] dark:text-slate-200">
                            {formatSriLankaDate(u.createdAt)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatSriLankaTime(u.createdAt)}
                          </div>
                        </div>
                      </td>

                      {/* 5. Status (Active, Suspended, or actual account status) */}
                      <td className="py-3 px-3 align-middle">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      {/* 6. Action (Prominent, always-visible Inspect button) */}
                      <td className="py-3 px-4 text-right align-middle">
                        <button
                          type="button"
                          onClick={(e) => handleInspectUser(u, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 font-bold text-xs shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer"
                          title="Inspect user details"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>Inspect</span>
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards (< 768px) */}
            <div className="md:hidden divide-y divide-[#E2E8F0] dark:divide-slate-800">
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={(e) => handleInspectUser(u, e)}
                  className="p-4 space-y-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0 border border-cyan-500/20">
                        {u.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#0F172A] dark:text-white text-xs truncate max-w-[150px]">
                            {u.name}
                          </span>
                          {['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'].includes(u.role) && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-extrabold uppercase bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 shrink-0">
                              {u.role === 'SUPER_ADMIN' ? 'SUPER' : 'ADMIN'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                          <span className="truncate max-w-[160px]">{u.email}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyEmail(u.email, u.id, e)}
                            className="p-0.5 text-slate-400 hover:text-cyan-600"
                          >
                            {copiedEmailId === u.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Plan</span>
                      <span className="font-bold text-[#0F172A] dark:text-white">{u.plan}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Registered</span>
                      <span className="text-[#0F172A] dark:text-slate-300 font-mono text-[10px]">
                        {formatSriLankaDate(u.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={(e) => handleInspectUser(u, e)}
                      className="w-full py-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:bg-cyan-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect User Details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
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
              onClick={() => handlePageChange(pagination.page - 1)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 disabled:opacity-40 text-[#0F172A] dark:text-slate-300 hover:text-cyan-600 dark:hover:text-white cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 disabled:opacity-40 text-[#0F172A] dark:text-slate-300 hover:text-cyan-600 dark:hover:text-white cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Provision New User */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => !createSubmitting && setCreateModalOpen(false)}
        showClose={!createSubmitting}
        title="Provision New User Account"
        subtitle="Create and configure credentials for a new platform user"
        width="min(440px, calc(100vw - 32px))"
        onSubmit={handleCreateUser}
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateModalOpen(false)}
              disabled={createSubmitting}
              className="text-xs py-2 px-4 cursor-pointer font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createSubmitting}
              disabled={createSubmitting}
              className="text-xs py-2 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
            >
              Create User
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={createFormData.name}
              onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={createFormData.email}
              onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
              Initial Password (Min 8 characters) *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={createFormData.password}
              onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
                Assigned Plan
              </label>
              <select
                value={createFormData.plan}
                onChange={(e) => {
                  const p = e.target.value;
                  setCreateFormData({
                    ...createFormData,
                    plan: p,
                    credits: p === 'PROFESSIONAL' ? 1000 : p === 'CREATOR' ? 500 : 200
                  });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="FREE">Free Tier (200 credits)</option>
                <option value="CREATOR">Creator (500 credits)</option>
                <option value="PROFESSIONAL">Professional (1000 credits)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
                Initial Credits
              </label>
              <input
                type="number"
                min="0"
                value={createFormData.credits}
                onChange={(e) => setCreateFormData({ ...createFormData, credits: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default AdminUsersPage;
