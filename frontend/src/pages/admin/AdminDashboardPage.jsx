import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  ShieldCheck,
  CreditCard,
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Layers,
  FileText,
  Info,
  Calendar
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { formatSriLankaDateTime, formatSriLankaDate } from '../../utils/timezone';

export function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('all'); // 'today' | '7d' | '30d' | 'all'

  const loadStats = async (selectedPeriod = period) => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/dashboard?period=${selectedPeriod}`);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load administrator metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(period);
  }, [period]);

  if (loading && !data) {
    return <LoadingState message="Aggregating database statistics..." />;
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        <p className="font-bold">Error loading dashboard</p>
        <p className="text-xs mt-1">{error}</p>
        <button
          onClick={() => loadStats(period)}
          className="mt-3 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, recentRegistrations, recentPayments, recentAuditLogs } = data || {};

  const periodLabels = {
    today: 'Today (SLST)',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    all: 'All Time'
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header with Reporting Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold mb-2 border border-cyan-500/20">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Automatic PayHere Payment & Metric Tracking</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            Executive Command & Revenue Dashboard
          </h2>
          <p className="text-xs text-[#475569] dark:text-slate-400 mt-1">
            Real PostgreSQL database records &bull; Standardized to Sri Lanka Time (SLST / Asia/Colombo)
          </p>
        </div>

        {/* Time Period Filter Tabs */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                period === tab.id
                  ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section Header: User Accounts & Churn Analytics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              User Lifecycle & Churn Analytics
            </h3>
          </div>
          <span className="text-[11px] text-[#475569] dark:text-slate-400">
            Database-backed audit records &bull; Filter: {periodLabels[period]}
          </span>
        </div>

        {/* KPI Cards Grid — Row 1: User Accounts & Churn Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Registered Users */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#475569] dark:text-slate-400" title="Current registered user accounts in PostgreSQL">
                Total Registered Users
              </span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white">
                {summary?.totalUsers || 0}
              </span>
              <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Current in DB
              </span>
            </div>
            <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
              <span>In Period ({periodLabels[period]}):</span>
              <strong className="text-cyan-600 dark:text-cyan-400">+{summary?.newUsersInPeriod || 0} new</strong>
            </div>
          </div>

          {/* Card 2: Currently Active Accounts */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#475569] dark:text-slate-400" title="User accounts with status === ACTIVE (in good standing, non-suspended)">
                Currently Active Accounts
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {summary?.activeUsers || 0}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {summary?.suspendedUsers || 0} Suspended
              </span>
            </div>
            <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
              <span>Activity Criteria:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Status: ACTIVE</strong>
            </div>
          </div>

          {/* Card 3: Permanently Deleted Accounts */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#475569] dark:text-slate-400" title="Number of successfully completed permanent account deletions (all-time)">
                Permanently Deleted Accounts
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                {summary?.totalDeletedAccounts ?? summary?.deletions?.totalDeletedAccounts ?? 0}
              </span>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-bold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                {summary?.churnRatePercentage ?? summary?.deletions?.churnRatePercentage ?? 0}% Churn
              </span>
            </div>
            <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
              <span>In Period ({periodLabels[period]}):</span>
              <strong className="text-rose-600 dark:text-rose-400">
                {summary?.deletionsInPeriod ?? summary?.deletions?.deletionsInPeriod ?? 0} deleted
              </strong>
            </div>
          </div>

          {/* Card 4: Account Deletions (This Month & This Year in SLST) */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#475569] dark:text-slate-400" title="Completed deletions within the current calendar month and calendar year in SLST">
                Account Deletions (SLST)
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <UserMinus className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  {summary?.deletionsThisMonth ?? summary?.deletions?.deletionsThisMonth ?? 0}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1.5">
                  This Month
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-300">
                  {summary?.deletionsThisYear ?? summary?.deletions?.deletionsThisYear ?? 0}
                </span>
                <span className="text-[11px] font-medium text-slate-400 ml-1">
                  This Year
                </span>
              </div>
            </div>
            <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
              <span>SLST Boundaries:</span>
              <strong className="text-amber-600 dark:text-amber-400 font-mono text-[10px]">Asia/Colombo (+05:30)</strong>
            </div>
          </div>

        </div>

        {/* Metric Methodology & Churn Formula Disclosure Banner */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/70 dark:from-slate-900/40 dark:to-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-[#475569] dark:text-slate-400 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-500 shrink-0" />
              <span className="font-bold text-[#0F172A] dark:text-slate-200">
                Metric Definitions & Churn Rate Analytics
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono text-[11px] font-semibold border border-cyan-500/20">
              <span>Lifetime User Churn:</span>
              <strong>{summary?.churnRatePercentage ?? summary?.deletions?.churnRatePercentage ?? 0}%</strong>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-[11px] leading-relaxed">
            <div>
              <strong className="text-[#0F172A] dark:text-slate-300">Total Registered Users:</strong>
              <p className="text-[#475569] dark:text-slate-400 mt-0.5">Current registered user accounts in database.</p>
            </div>
            <div>
              <strong className="text-[#0F172A] dark:text-slate-300">Active Accounts:</strong>
              <p className="text-[#475569] dark:text-slate-400 mt-0.5">Accounts with status ACTIVE (in good standing, non-suspended; does not denote real-time socket sessions).</p>
            </div>
            <div>
              <strong className="text-[#0F172A] dark:text-slate-300">Permanently Deleted:</strong>
              <p className="text-[#475569] dark:text-slate-400 mt-0.5">Completed permanent account deletions tracked via privacy-conscious audit hashes (zero PII retained).</p>
            </div>
            <div>
              <strong className="text-[#0F172A] dark:text-slate-300">Deleted Month / Year:</strong>
              <p className="text-[#475569] dark:text-slate-400 mt-0.5">Deletions within current calendar month and year in Sri Lanka Standard Time (SLST / GMT+05:30).</p>
            </div>
          </div>
          <div className="text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Explicit Churn Formula:</span>{' '}
            <code className="text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1 py-0.5 rounded text-[10px]">
              (Permanently Deleted Accounts / (Total Current Registered Users + Permanently Deleted Accounts)) × 100
            </code>
            {' '}&bull; Financial & payment invoices are preserved for legal and tax compliance with personal user IDs disassociated.
          </div>
        </div>
      </div>

      {/* KPI Cards Grid — Row 2: Subscriptions & Credits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Distinct Paid Subscribers */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Paid Subscribers (Verified)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {summary?.distinctPaidSubscribers || 0}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              Creator & Pro
            </span>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>New Paid ({periodLabels[period]}):</span>
            <strong className="text-emerald-600 dark:text-emerald-400">+{summary?.newPaidSubscribers || 0} subscribers</strong>
          </div>
        </div>

        {/* Free Plan Users */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Free Plan Users</span>
            <div className="w-8 h-8 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white">
              {summary?.freeUsersCount || 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Base tier
            </span>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>Creator: {summary?.planDistribution?.CREATOR || 0}</span>
            <span>Pro: {summary?.planDistribution?.PROFESSIONAL || 0}</span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Active Subscriptions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary?.activeSubscriptions || 0}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Active Contracts
            </span>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>Status:</span>
            <strong className="text-emerald-600 dark:text-emerald-400">Auto-Renewing</strong>
          </div>
        </div>

        {/* Total Circulating Credits */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Circulating Credits</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white">
              {Number(summary?.totalCirculatingCredits || 0).toLocaleString()}
            </span>
            <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
              pts
            </span>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>User Wallets:</span>
            <strong className="text-slate-600 dark:text-slate-400">Available Credits</strong>
          </div>
        </div>

      </div>

      {/* KPI Cards Grid — Row 2: Payments & Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Verified Revenue */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">
              Verified Revenue ({periodLabels[period]})
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-white">
              LKR {Number(summary?.payments?.verifiedTotalLkr || 0).toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>Verified Transactions:</span>
            <strong className="text-emerald-600 dark:text-emerald-400">{summary?.payments?.verifiedCount || 0} verified</strong>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Pending Payments</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {summary?.payments?.pendingCount || 0}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Awaiting IPN
            </span>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>Excluded from Revenue:</span>
            <strong className="text-slate-600 dark:text-slate-400">Unverified</strong>
          </div>
        </div>

        {/* Failed & Cancelled Payments */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Failed / Cancelled</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {summary?.payments?.failedAndCancelledCount || 0}
            </span>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              Declined/Cancelled
            </span>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>Audit:</span>
            <Link to="/admin/payments" className="text-rose-600 dark:text-rose-400 hover:underline">
              Inspect Invoices →
            </Link>
          </div>
        </div>

        {/* All-Time Lifetime Revenue */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">All-Time Verified Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold text-cyan-600 dark:text-cyan-400">
              LKR {Number(summary?.payments?.allTimeVerifiedTotalLkr || 0).toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>Total Transactions:</span>
            <strong className="text-cyan-600 dark:text-cyan-400">{summary?.payments?.allTimeVerifiedCount || 0} verified</strong>
          </div>
        </div>

      </div>

      {/* Two Column Section: Recent Users & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Registrations Table */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Recent User Registrations</h3>
              <p className="text-xs text-[#475569] dark:text-slate-400">Latest accounts provisioned in database</p>
            </div>
            <Link
              to="/admin/users"
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {!recentRegistrations || recentRegistrations.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#475569] dark:text-slate-500 space-y-2">
              <Users className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
              <p>No user records found in database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-slate-400">
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">Plan</th>
                    <th className="pb-3 font-semibold">Credits</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155] text-[#0F172A] dark:text-slate-300">
                  {recentRegistrations.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                      <td className="py-3">
                        <p className="font-semibold text-[#0F172A] dark:text-white">{u.name}</p>
                        <p className="text-[11px] text-[#475569] dark:text-slate-400 font-mono truncate max-w-[140px]">{u.email}</p>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                          {u.plan}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                        {u.credits}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Payments Table */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Recent Payment Invoices</h3>
              <p className="text-xs text-[#475569] dark:text-slate-400">Recorded verified and pending payments</p>
            </div>
            <Link
              to="/admin/payments"
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentPayments?.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#475569] dark:text-slate-500 space-y-2">
              <CreditCard className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
              <p>No payment records in database yet.</p>
              <Link to="/admin/payments" className="text-cyan-600 dark:text-cyan-400 hover:underline block font-semibold">
                Record first payment
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-slate-400">
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Plan</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155] text-[#0F172A] dark:text-slate-300">
                  {recentPayments?.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                      <td className="py-3">
                        <p className="font-semibold text-[#0F172A] dark:text-white">{p.user?.name || 'User'}</p>
                        <p className="text-[11px] text-[#475569] dark:text-slate-400 truncate max-w-[120px]">{p.user?.email}</p>
                      </td>
                      <td className="py-3 font-semibold text-[#0F172A] dark:text-white">
                        {p.currency} {p.amount.toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                          {p.plan}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.status === 'VERIFIED'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-right text-[11px] text-[#475569] dark:text-slate-400">
                        {formatSriLankaDate(p.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Recent Security Audit Events Strip */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 space-y-4 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Admin Audit</h3>
              <p className="text-xs text-[#475569] dark:text-slate-400">Recent sensitive administrative actions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/audit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-colors cursor-pointer"
            >
              <span>View Full Admin Audit →</span>
            </Link>
          </div>
        </div>

        <div className="space-y-2.5">
          {recentAuditLogs?.length === 0 ? (
            <p className="text-xs text-[#475569] dark:text-slate-400 py-4 text-center">No audit events recorded yet.</p>
          ) : (
            recentAuditLogs?.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-xs text-[#0F172A] dark:text-slate-300"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-400 font-mono text-[10px] font-bold">
                    {log.action}
                  </span>
                  <span>
                    By <strong className="text-[#0F172A] dark:text-white">{log.admin?.name || log.admin?.email}</strong>
                    {log.targetUser && (
                      <> on target <strong className="text-cyan-600 dark:text-cyan-300">{log.targetUser.email}</strong></>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[#475569] dark:text-slate-400 text-[11px]">
                  <span>{formatSriLankaDateTime(log.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
export default AdminDashboardPage;
