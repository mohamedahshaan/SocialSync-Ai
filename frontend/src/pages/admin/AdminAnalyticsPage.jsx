import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Users,
  CreditCard,
  Coins,
  Layers,
  Share2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Activity,
  Sparkles,
  ShieldCheck,
  Send,
  FileText,
  UserX,
  UserMinus,
  UserCheck,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { PlatformIcon } from '../../components/public/PlatformIcon';
import { formatSriLankaDateTime, formatSriLankaDate, formatSriLankaTime } from '../../utils/timezone';

export function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'credits'

  const loadAnalytics = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const res = await api.get('/admin/analytics');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || 'Failed to fetch executive platform analytics');
      }
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
      setError(err.message || 'Unable to connect to administrative analytics service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleExportCsv = () => {
    if (!data) return;
    const { summary, planBreakdown, channelDistribution, publishingOperations } = data;

    const rows = [
      ['Metric Category', 'Key', 'Value'],
      ['Platform Users', 'Total Registered Users', summary.totalUsers],
      ['Platform Users', 'Active Users', summary.activeUsers],
      ['Platform Users', 'Suspended Users', summary.suspendedUsers],
      ['Account Deletions & Churn', 'Permanently Deleted Accounts', summary.totalDeletedAccounts || summary.deletions?.totalDeletedAccounts || 0],
      ['Account Deletions & Churn', 'Account Deletions This Month (SLST)', summary.deletionsThisMonth || summary.deletions?.deletionsThisMonth || 0],
      ['Account Deletions & Churn', 'Account Deletions This Year (SLST)', summary.deletionsThisYear || summary.deletions?.deletionsThisYear || 0],
      ['Account Deletions & Churn', 'User Churn Rate (%)', `${summary.churnRatePercentage || summary.deletions?.churnRatePercentage || 0}%`],
      ['Account Deletions & Churn', 'Churn Rate Formula', 'Permanently Deleted Accounts / (Total Current Registered Users + Permanently Deleted Accounts) * 100'],
      ['Monetization', 'Total Verified Revenue (LKR)', summary.totalRevenueLkr],
      ['Monetization', 'Verified Transactions Count', summary.paymentsCount],
      ['Monetization', 'Estimated MRR (LKR)', summary.estimatedMrrLkr],
      ['Monetization', 'Circulating Credits (pts)', summary.circulatingCredits],
      ['Plan Breakdown', 'Free Tier', planBreakdown.FREE],
      ['Plan Breakdown', 'Creator Tier', planBreakdown.CREATOR],
      ['Plan Breakdown', 'Professional Tier', planBreakdown.PROFESSIONAL],
      ['Social Channels', 'Total Connected Accounts', summary.totalConnectedChannels],
      ...Object.entries(channelDistribution).map(([p, c]) => ['Social Channel Reach', p, c]),
      ['Publishing Dispatch', 'Total Posts Managed', publishingOperations.total],
      ['Publishing Dispatch', 'Published Posts', publishingOperations.published],
      ['Publishing Dispatch', 'Scheduled Posts', publishingOperations.scheduled],
      ['Publishing Dispatch', 'Failed Posts', publishingOperations.failed],
      ['Publishing Dispatch', 'Draft Posts', publishingOperations.draft],
      ['Publishing Dispatch', 'Dispatch Reliability (%)', `${publishingOperations.successRate}%`]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SocialSync_Executive_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="py-24">
        <LoadingState message="Aggregating live platform analytics and executive reports..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center space-y-4 max-w-xl mx-auto my-12">
        <AlertTriangle className="w-10 h-10 mx-auto text-rose-400" />
        <h3 className="text-base font-bold text-white">Failed to load analytics</h3>
        <p className="text-xs text-rose-300/80">{error || 'Server returned an invalid analytics payload.'}</p>
        <button
          type="button"
          onClick={() => loadAnalytics()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  const { summary, planBreakdown, channelDistribution, publishingOperations, recentPayments, recentTransactions } = data;

  const totalUsersCount = summary.totalUsers || 1;
  const freePct = Math.round(((planBreakdown.FREE || 0) / totalUsersCount) * 100);
  const creatorPct = Math.round(((planBreakdown.CREATOR || 0) / totalUsersCount) * 100);
  const proPct = Math.round(((planBreakdown.PROFESSIONAL || 0) / totalUsersCount) * 100);

  const platformsList = [
    { key: 'FACEBOOK', name: 'Facebook', color: '#1877F2' },
    { key: 'INSTAGRAM', name: 'Instagram', color: '#E1306C' },
    { key: 'LINKEDIN', name: 'LinkedIn', color: '#0A66C2' },
    { key: 'TIKTOK', name: 'TikTok', color: '#00F2FE' },
    { key: 'YOUTUBE', name: 'YouTube', color: '#FF0000' },
    { key: 'THREADS', name: 'Threads', color: '#101010' },
    { key: 'X', name: 'X / Twitter', color: '#1DA1F2' }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-white font-heading">
              Analytics & Reports
            </h1>
            <p className="text-xs text-[#475569] dark:text-slate-400">
              Live executive intelligence, subscription revenue run-rate, and multi-channel reach
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold text-[#0F172A] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-colors cursor-pointer"
            title="Download executive analytics report as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Report</span>
          </button>

          <button
            type="button"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE KPI CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Total Users</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white font-heading">
              {summary.totalUsers.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {summary.activeUsers} active
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            {summary.suspendedUsers > 0 ? `${summary.suspendedUsers} suspended` : 'Zero account suspensions'}
          </div>
        </div>

        {/* Verified Revenue */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Verified Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-heading">
              LKR {summary.totalRevenueLkr.toLocaleString()}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            {summary.paymentsCount} verified transactions
          </div>
        </div>

        {/* Estimated MRR */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Estimated MRR</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400 font-heading">
              LKR {summary.estimatedMrrLkr.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400">/mo</span>
          </div>
          <div className="text-[10px] text-slate-400">
            From Creator & Pro subscriptions
          </div>
        </div>

        {/* Circulating Credits */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-5 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Circulating Credits</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-heading">
              {summary.circulatingCredits.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400">pts</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Active balance in user wallets
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2B. USER CHURN & ACCOUNT RETENTION INTELLIGENCE */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 shadow-soft space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <UserX className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">
                Account Deletions & User Churn Intelligence
              </h3>
              <p className="text-[11px] text-[#475569] dark:text-slate-400">
                Persistent audit tracking &bull; Privacy-conscious cryptographic identifiers &bull; SLST calendar boundaries
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-xs font-bold border border-rose-500/20">
            <span>Platform Churn Rate:</span>
            <span>{summary.churnRatePercentage || summary.deletions?.churnRatePercentage || 0}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Registered Users */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Registered Users</div>
            <div className="text-xl font-bold text-[#0F172A] dark:text-white font-heading">
              {summary.totalUsers.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Current active/suspended accounts in database
            </div>
          </div>

          {/* Currently Active Accounts */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1.5">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Currently Active Accounts</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-heading">
              {summary.activeUsers.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
              Status === ACTIVE (in good standing)
            </div>
          </div>

          {/* Permanently Deleted Accounts */}
          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-1.5">
            <div className="text-xs font-medium text-rose-700 dark:text-rose-400">Permanently Deleted Accounts</div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 font-heading">
              {(summary.totalDeletedAccounts || summary.deletions?.totalDeletedAccounts || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-rose-700/80 dark:text-rose-400/80">
              All-time permanent account deletions
            </div>
          </div>

          {/* Deletions This Month & Year (SLST) */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-400">Deletions Month / Year (SLST)</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-heading">
                {summary.deletionsThisMonth || summary.deletions?.deletionsThisMonth || 0}
              </span>
              <span className="text-xs text-slate-500">this month</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-auto">
                {summary.deletionsThisYear || summary.deletions?.deletionsThisYear || 0} yr
              </span>
            </div>
            <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
              Sri Lanka Standard Time (+05:30)
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 text-[11px] text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
          <span>
            <strong>User Churn Formula:</strong> <code>(Permanently Deleted Accounts / (Total Current Registered Users + Permanently Deleted Accounts)) × 100</code>. Financial payment records are retained for statutory bookkeeping without personal user identifiers.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CORE BREAKDOWNS (Plan Monetization & Social Reach) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: Plan Monetization Breakdown */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 shadow-soft space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Plan Distribution & Tiers</h3>
                <p className="text-[11px] text-slate-400">Active user subscriptions by package</p>
              </div>
            </div>
            <Link
              to="/admin/plans"
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-500 inline-flex items-center gap-1"
            >
              <span>Manage Plans</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {/* Free */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">Free Tier (LKR 0)</span>
                <span className="text-[#0F172A] dark:text-white font-mono">
                  {planBreakdown.FREE || 0} users ({freePct}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-slate-400 dark:bg-slate-500 transition-all duration-500"
                  style={{ width: `${freePct}%` }}
                />
              </div>
            </div>

            {/* Creator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-cyan-600 dark:text-cyan-400">Creator Tier (LKR 1,000/mo)</span>
                <span className="text-[#0F172A] dark:text-white font-mono">
                  {planBreakdown.CREATOR || 0} users ({creatorPct}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${creatorPct}%` }}
                />
              </div>
            </div>

            {/* Professional */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-purple-600 dark:text-purple-400">Professional Tier (LKR 2,500/mo)</span>
                <span className="text-[#0F172A] dark:text-white font-mono">
                  {planBreakdown.PROFESSIONAL || 0} users ({proPct}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${proPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Monthly Run-Rate Contribution:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              LKR {summary.estimatedMrrLkr.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card B: Connected Social Channels Distribution */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 shadow-soft space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Share2 className="w-5 h-5 text-cyan-500" />
              <div>
                <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Social Channel Reach</h3>
                <p className="text-[11px] text-slate-400">
                  {summary.totalConnectedChannels} connected platform credentials
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">7 Platforms</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {platformsList.map((p) => {
              const count = channelDistribution[p.key] || 0;
              return (
                <div
                  key={p.key}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-2xs flex items-center justify-center shrink-0">
                    <PlatformIcon platform={p.key} className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-[#0F172A] dark:text-white">{p.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{count} linked</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>OAuth Tokens Status:</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Encrypted & Secured</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CONTENT DISPATCH & PUBLISHING HEALTH */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Send className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Content Publishing Operations</h3>
              <p className="text-[11px] text-slate-400">Multi-channel post dispatch performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {publishingOperations.successRate}% Success Rate
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
            <p className="text-[10px] text-slate-400 font-medium">Total Posts</p>
            <p className="text-lg font-bold text-[#0F172A] dark:text-white font-mono">{publishingOperations.total}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-center space-y-1">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Published</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{publishingOperations.published}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/40 text-center space-y-1">
            <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">Scheduled</p>
            <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400 font-mono">{publishingOperations.scheduled}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
            <p className="text-[10px] text-slate-400 font-medium">Drafts</p>
            <p className="text-lg font-bold text-slate-500 font-mono">{publishingOperations.draft}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-center space-y-1">
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Failed</p>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">{publishingOperations.failed}</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. RECENT FINANCIAL ACTIVITY & LEDGER */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl p-6 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Recent Financial & Ledger Reports</h3>
              <p className="text-[11px] text-slate-400">Live transaction stream from payment gateway and ledger</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Verified Payments ({recentPayments?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('credits')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'credits'
                  ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Credit Transactions ({recentTransactions?.length || 0})
            </button>
          </div>
        </div>

        {activeTab === 'payments' ? (
          <div>
            {!recentPayments || recentPayments.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No verified payment records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-slate-400">
                      <th className="py-2.5 px-3">Subscriber</th>
                      <th className="py-2.5 px-3">Package / Plan</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Date (SLST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60">
                    {recentPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-[#0F172A] dark:text-white">{p.user?.name || 'Customer'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.user?.email}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-medium">{p.plan || p.user?.plan || 'PRO'}</span>
                        </td>
                        <td className="py-3 px-3 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          LKR {p.amount?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400 whitespace-nowrap">
                          {formatSriLankaDateTime(p.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {!recentTransactions || recentTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No credit ledger records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-slate-400">
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Transaction Type</th>
                      <th className="py-2.5 px-3">Points Delta</th>
                      <th className="py-2.5 px-3">Balance After</th>
                      <th className="py-2.5 px-3 text-right">Date (SLST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60">
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-[#0F172A] dark:text-white">{tx.user?.name || 'User'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{tx.user?.email}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold font-mono">
                          <span className={tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount} pts
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {tx.balanceAfter} pts
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400 whitespace-nowrap">
                          {formatSriLankaDateTime(tx.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default AdminAnalyticsPage;
