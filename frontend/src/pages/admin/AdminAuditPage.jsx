import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  UserPlus,
  UserMinus,
  Coins,
  Layers,
  KeyRound,
  Sliders,
  Clock,
  Download,
  Eye,
  X,
  Check,
  Copy,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { Modal } from '../../components/common/Modal';
import { formatSriLankaDateTime, formatSriLankaDate, formatSriLankaTime } from '../../utils/timezone';

export function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalAll: 0,
    usersCreated: 0,
    usersDeleted: 0,
    plansAndCredits: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1
  });

  // Modal for viewing event details
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Load audit logs from API
  const loadAuditLogs = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', '25');

      if (selectedCategory !== 'ALL') {
        params.set('category', selectedCategory);
      }
      if (selectedAction !== 'ALL') {
        params.set('action', selectedAction);
      }
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to fetch administrative audit events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [currentPage, selectedCategory, selectedAction, debouncedSearch]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper to parse details safely
  const parseDetails = (detailsStr) => {
    if (!detailsStr) return {};
    if (typeof detailsStr === 'object') return detailsStr;
    try {
      return JSON.parse(detailsStr);
    } catch {
      return { raw: detailsStr };
    }
  };

  // Human-friendly action metadata
  const getActionMeta = (action) => {
    switch (action) {
      case 'USER_CREATED':
        return {
          label: 'User Added',
          icon: UserPlus,
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        };
      case 'USER_DELETED':
        return {
          label: 'User Removed',
          icon: UserMinus,
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
        };
      case 'CREDITS_ADJUSTED':
        return {
          label: 'Credits Adjusted',
          icon: Coins,
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
        };
      case 'PLAN_CHANGED':
        return {
          label: 'Plan Changed',
          icon: Layers,
          bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
        };
      case 'STATUS_CHANGED':
        return {
          label: 'Status Changed',
          icon: ShieldAlert,
          bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
        };
      case 'PASSWORD_RESET_INITIATED':
        return {
          label: 'Password Reset OTP',
          icon: KeyRound,
          bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
        };
      case 'UPDATE_PLATFORM_RATE':
      case 'PLATFORM_RATE_UPDATED':
        return {
          label: 'Rate Updated',
          icon: Sliders,
          bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
        };
      case 'ADMIN_ROLE_UPDATED':
      case 'ADMIN_PERMISSIONS_UPDATED':
        return {
          label: 'Admin Role/Perms',
          icon: Shield,
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
        };
      case 'SUPER_ADMIN_MIGRATED':
        return {
          label: 'Super Admin Migration',
          icon: ShieldCheck,
          bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
        };
      default:
        return {
          label: action?.replace(/_/g, ' ') || 'Audit Event',
          icon: FileText,
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        };
    }
  };

  // Human-readable summary for table row
  const renderLogSummary = (log) => {
    const d = parseDetails(log.details);
    const action = log.action;

    if (action === 'USER_CREATED') {
      return (
        <span className="text-xs text-[#0F172A] dark:text-slate-200">
          Created new user account <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{d.email}</strong> on{' '}
          <span className="font-mono font-medium">{d.plan || 'FREE'}</span> plan with{' '}
          <strong className="font-semibold">{d.credits ?? 200}</strong> initial credits.
        </span>
      );
    }

    if (action === 'USER_DELETED') {
      return (
        <span className="text-xs text-[#0F172A] dark:text-slate-200">
          Permanently deleted user account <strong className="text-rose-600 dark:text-rose-400 font-semibold">{d.deletedUserName || d.deletedUserEmail}</strong>{' '}
          <span className="text-[11px] text-slate-400 font-mono">({d.deletedUserEmail})</span>.
          {d.reason && (
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
              Reason: &quot;{d.reason}&quot;
            </span>
          )}
        </span>
      );
    }

    if (action === 'CREDITS_ADJUSTED') {
      const isGrant = d.type === 'ADMIN_GRANT' || (d.amount && d.amount > 0);
      return (
        <span className="text-xs text-[#0F172A] dark:text-slate-200">
          Adjusted credits by{' '}
          <strong className={isGrant ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
            {isGrant ? `+${d.amount}` : `-${d.amount}`} pts
          </strong>
          {d.balanceAfter !== undefined && (
            <span> (New Balance: <strong className="font-mono">{d.balanceAfter} pts</strong>)</span>
          )}
          {d.reason && (
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
              Reason: &quot;{d.reason}&quot;
            </span>
          )}
        </span>
      );
    }

    if (action === 'PLAN_CHANGED') {
      return (
        <span className="text-xs text-[#0F172A] dark:text-slate-200">
          Changed plan from <span className="font-mono font-semibold">{d.oldPlan || 'N/A'}</span> →{' '}
          <strong className="text-purple-600 dark:text-purple-400 font-mono font-semibold">{d.newPlan}</strong>.
          {d.reason && (
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
              Reason: &quot;{d.reason}&quot;
            </span>
          )}
        </span>
      );
    }

    if (action === 'STATUS_CHANGED') {
      const isSuspended = d.newStatus === 'SUSPENDED';
      return (
        <span className="text-xs text-[#0F172A] dark:text-slate-200">
          Account status updated to{' '}
          <strong className={isSuspended ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
            {d.newStatus}
          </strong>.
          {d.reason && (
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
              Reason: &quot;{d.reason}&quot;
            </span>
          )}
        </span>
      );
    }

    if (action === 'PASSWORD_RESET_INITIATED') {
      return (
        <span className="text-xs text-[#0F172A] dark:text-slate-200">
          Initiated secure 6-digit password reset OTP email for <span className="font-mono">{d.targetEmail}</span>.
        </span>
      );
    }

    if (action === 'UPDATE_PLATFORM_RATE' || action === 'PLATFORM_RATE_UPDATED') {
      return (
        <span className="text-xs text-[#0F172A] dark:text-slate-200">
          Platform credit cost for <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{d.platform}</strong> adjusted from{' '}
          <span className="font-mono">{d.previousCost}</span> → <strong className="font-mono">{d.newCost} credits</strong>.
        </span>
      );
    }

    if (d.note) {
      return <span className="text-xs text-[#0F172A] dark:text-slate-200">{d.note}</span>;
    }

    if (d.reason) {
      return <span className="text-xs text-[#0F172A] dark:text-slate-200">Reason: &quot;{d.reason}&quot;</span>;
    }

    return (
      <span className="text-xs text-slate-400 font-mono truncate max-w-sm block">
        {log.details || 'System event recorded'}
      </span>
    );
  };

  // Export CSV of loaded logs
  const handleExportCsv = () => {
    if (!logs.length) return;
    const headers = ['ID', 'Date Time (SLST)', 'Action', 'Admin Name', 'Admin Email', 'Target User Email', 'Details', 'IP Address'];
    const rows = logs.map((l) => {
      const d = parseDetails(l.details);
      const targetEmail = l.targetUser?.email || d.deletedUserEmail || d.targetEmail || d.email || 'N/A';
      return [
        l.id,
        formatSriLankaDateTime(l.createdAt),
        l.action,
        `"${(l.admin?.name || '').replace(/"/g, '""')}"`,
        l.admin?.email || '',
        targetEmail,
        `"${JSON.stringify(d).replace(/"/g, '""')}"`,
        l.ipAddress || ''
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SocialSync_Admin_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categories = [
    { id: 'ALL', label: 'All Activities' },
    { id: 'USERS', label: 'User Management' },
    { id: 'PLANS_CREDITS', label: 'Plans & Credits' },
    { id: 'ADMINS_SECURITY', label: 'Admins & Security' },
    { id: 'PLATFORM', label: 'Platform Rates' }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-white font-heading">
                Admin Audit
              </h1>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                Complete, immutable audit trail of all administrative actions across users, plans, and security
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold text-[#0F172A] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            title="Export audit logs to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => loadAuditLogs(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            title="Refresh live audit trail"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STAT SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-soft">
          <p className="text-[11px] text-[#475569] dark:text-slate-400 font-medium">Total Audit Events</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-[#0F172A] dark:text-white font-heading">
              {stats.totalAll.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Recorded administrative actions</p>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-soft">
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Users Added</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-heading">
              +{stats.usersCreated.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Admin provisioned accounts</p>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-soft">
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Users Removed</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-heading">
              -{stats.usersDeleted.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Permanently deleted users</p>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 shadow-soft">
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Plans & Credits</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400 font-heading">
              {stats.plansAndCredits.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Tier & point adjustments</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTER & SEARCH TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 space-y-3.5 shadow-soft">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#E2E8F0] dark:border-slate-800 text-xs">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedCategory(c.id);
                setSelectedAction('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/80 shadow-2xs'
                  : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search & Action Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by admin, target user, action, or reason..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-cyan-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Action Types</option>
              <option value="USER_CREATED">User Added (USER_CREATED)</option>
              <option value="USER_DELETED">User Removed (USER_DELETED)</option>
              <option value="CREDITS_ADJUSTED">Credits Adjusted (CREDITS_ADJUSTED)</option>
              <option value="PLAN_CHANGED">Plan Changed (PLAN_CHANGED)</option>
              <option value="STATUS_CHANGED">Status Changed (STATUS_CHANGED)</option>
              <option value="PASSWORD_RESET_INITIATED">Password Reset OTP</option>
              <option value="UPDATE_PLATFORM_RATE">Platform Rate Updated</option>
              <option value="ADMIN_ROLE_UPDATED">Admin Role Updated</option>
              <option value="ADMIN_INVITATION_SENT">Admin Invitation Sent</option>
            </select>

            {(search || selectedCategory !== 'ALL' || selectedAction !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('ALL');
                  setSelectedAction('ALL');
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. AUDIT LOGS TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl overflow-hidden shadow-soft">
        {loading ? (
          <div className="py-20">
            <LoadingState message="Loading administrative audit trail..." />
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => loadAuditLogs()}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center space-y-2 text-slate-400 dark:text-slate-500 text-xs">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No audit events found</p>
            <p className="text-[11px]">No administrative actions match your current search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#334155] bg-slate-50/80 dark:bg-slate-950/80 text-[#475569] dark:text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">Action</th>
                  <th className="py-3.5 px-4 font-semibold">Admin (Actor)</th>
                  <th className="py-3.5 px-4 font-semibold">Target / Subject</th>
                  <th className="py-3.5 px-4 font-semibold">Activity Summary</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Timestamp (SLST)</th>
                  <th className="py-3.5 px-3 font-semibold text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60 text-[#0F172A] dark:text-slate-300">
                {logs.map((log) => {
                  const meta = getActionMeta(log.action);
                  const Icon = meta.icon;
                  const details = parseDetails(log.details);
                  const targetEmail = log.targetUser?.email || details.deletedUserEmail || details.targetEmail || details.email;
                  const isDeletedTarget = log.action === 'USER_DELETED';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Action Badge */}
                      <td className="py-3 px-4 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${meta.bg}`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* Admin Actor */}
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#0F172A] dark:text-white">
                              {log.admin?.name || 'Admin'}
                            </span>
                            {log.admin?.role === 'SUPER_ADMIN' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                Super
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                            {log.admin?.email}
                          </p>
                        </div>
                      </td>

                      {/* Target User / Subject */}
                      <td className="py-3 px-4 align-middle">
                        {isDeletedTarget ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <UserMinus className="w-2.5 h-2.5" />
                              <span>Deleted User</span>
                            </span>
                            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                              {details.deletedUserName || targetEmail}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{targetEmail}</p>
                          </div>
                        ) : targetEmail ? (
                          <div className="space-y-0.5">
                            <p className="font-semibold text-xs text-[#0F172A] dark:text-white">
                              {log.targetUser?.name || 'Target Account'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                              {targetEmail}
                            </p>
                          </div>
                        ) : details.platform ? (
                          <span className="font-semibold text-xs text-indigo-600 dark:text-indigo-400">
                            Channel: {details.platform}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">System / Platform</span>
                        )}
                      </td>

                      {/* Human-Readable Summary */}
                      <td className="py-3 px-4 align-middle max-w-md">
                        {renderLogSummary(log)}
                      </td>

                      {/* Timestamp & IP */}
                      <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-medium text-xs text-[#0F172A] dark:text-slate-200">
                            {formatSriLankaDate(log.createdAt)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatSriLankaTime(log.createdAt)}
                          </div>
                          {log.ipAddress && (
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                              IP: {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Inspect details button */}
                      <td className="py-3 px-3 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View raw audit JSON payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. PAGINATION BAR */}
        {/* ========================================================================= */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between text-xs text-[#475569] dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/50">
            <div>
              Showing <strong className="text-[#0F172A] dark:text-white">{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
              <strong className="text-[#0F172A] dark:text-white">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong>{' '}
              of <strong className="text-[#0F172A] dark:text-white">{pagination.total}</strong> events
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold text-[#0F172A] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="font-mono text-xs">
                Page {pagination.page} / {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold text-[#0F172A] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. INSPECT AUDIT LOG MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Details"
        maxWidth="max-w-xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#E2E8F0] dark:border-slate-800">
              <div>
                <p className="text-[10px] text-slate-400 font-medium">Action</p>
                <p className="font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">Timestamp (SLST)</p>
                <p className="font-medium text-[#0F172A] dark:text-slate-200 mt-0.5">
                  {formatSriLankaDateTime(selectedLog.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">Admin Actor</p>
                <p className="font-semibold text-[#0F172A] dark:text-white mt-0.5">
                  {selectedLog.admin?.name} ({selectedLog.admin?.email})
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">IP Address</p>
                <p className="font-mono text-slate-500 mt-0.5">{selectedLog.ipAddress || 'Not recorded'}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-[#0F172A] dark:text-slate-200">Event Payload (JSON)</span>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedLog.details, 'payload')}
                  className="inline-flex items-center gap-1 text-[11px] text-cyan-600 hover:text-cyan-500 font-medium cursor-pointer"
                >
                  {copiedKey === 'payload' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'payload' ? 'Copied' : 'Copy Payload'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800 leading-relaxed">
                {JSON.stringify(parseDetails(selectedLog.details), null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-[#0F172A] dark:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AdminAuditPage;
