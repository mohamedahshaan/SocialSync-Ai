import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Share2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Download,
  Zap,
  Layers,
  Film,
  Image as ImageIcon,
  FileText,
  Calendar,
  Check,
  ArrowUpRight,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardCard } from '../components/common/DashboardCard';
import { LoadingState } from '../components/common/ProtectedRoute';

// Social Platform Brand Theme Definitions
const PLATFORM_CONFIG = {
  FACEBOOK: {
    name: 'Facebook',
    color: '#1877F2',
    bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    borderLight: 'border-blue-200 dark:border-blue-900/50',
    textLight: 'text-blue-600 dark:text-blue-400',
    dotColor: 'bg-[#1877F2]'
  },
  INSTAGRAM: {
    name: 'Instagram',
    color: '#E4405F',
    bgLight: 'bg-pink-50 dark:bg-pink-950/40',
    borderLight: 'border-pink-200 dark:border-pink-900/50',
    textLight: 'text-pink-600 dark:text-pink-400',
    dotColor: 'bg-[#E4405F]'
  },
  LINKEDIN: {
    name: 'LinkedIn',
    color: '#0A66C2',
    bgLight: 'bg-sky-50 dark:bg-sky-950/40',
    borderLight: 'border-sky-200 dark:border-sky-900/50',
    textLight: 'text-sky-700 dark:text-sky-400',
    dotColor: 'bg-[#0A66C2]'
  },
  THREADS: {
    name: 'Threads',
    color: '#0F172A',
    bgLight: 'bg-slate-100 dark:bg-slate-800/60',
    borderLight: 'border-slate-300 dark:border-slate-700',
    textLight: 'text-slate-900 dark:text-white',
    dotColor: 'bg-slate-900 dark:bg-white'
  },
  TIKTOK: {
    name: 'TikTok',
    color: '#00F2FE',
    bgLight: 'bg-teal-50 dark:bg-teal-950/40',
    borderLight: 'border-teal-200 dark:border-teal-900/50',
    textLight: 'text-teal-600 dark:text-teal-400',
    dotColor: 'bg-[#00F2FE]'
  },
  YOUTUBE: {
    name: 'YouTube',
    color: '#FF0000',
    bgLight: 'bg-red-50 dark:bg-red-950/40',
    borderLight: 'border-red-200 dark:border-red-900/50',
    textLight: 'text-red-600 dark:text-red-400',
    dotColor: 'bg-[#FF0000]'
  }
};

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState('30d');
  const [hoveredTimelineIndex, setHoveredTimelineIndex] = useState(null);
  const [hoveredPlatformKey, setHoveredPlatformKey] = useState(null);

  const fetchAnalytics = async (rangeKey, isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const res = await api.get(`/analytics?range=${rangeKey}`);
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedRange);
  }, [selectedRange]);

  const handleRangeChange = (range) => {
    if (range === selectedRange) return;
    setSelectedRange(range);
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (!analytics) return;
    const { summary, perPlatformStats, recentDeliveries } = analytics;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'SocialSync AI — Performance & Analytics Report\n';
    csvContent += `Generated At,${new Date().toISOString()}\n`;
    csvContent += `Time Range,${selectedRange}\n\n`;

    csvContent += '--- SUMMARY METRICS ---\n';
    csvContent += `Total Broadcasts,${summary.totalPosts}\n`;
    csvContent += `Published,${summary.publishedPosts}\n`;
    csvContent += `Scheduled,${summary.scheduledPosts}\n`;
    csvContent += `Failures,${summary.failedPosts}\n`;
    csvContent += `Success Rate,${summary.successRate}%\n`;
    csvContent += `Credits Consumed,${summary.creditsConsumed || 0}\n\n`;

    csvContent += '--- CHANNEL BREAKDOWN ---\n';
    csvContent += 'Channel,Total Dispatched,Published,Failed,Success Rate,Connected\n';
    Object.entries(perPlatformStats || {}).forEach(([p, s]) => {
      const rate = s.total > 0 ? Math.round((s.published / s.total) * 100) : 0;
      csvContent += `${p},${s.total},${s.published},${s.failed},${rate}%,${s.isConnected ? 'YES' : 'NO'}\n`;
    });
    csvContent += '\n';

    csvContent += '--- RECENT DELIVERIES ---\n';
    csvContent += 'ID,Status,Media Type,Created At,Scheduled At,Caption Preview\n';
    (recentDeliveries || []).forEach(post => {
      const cleanCaption = (post.caption || '').replace(/[\n,]/g, ' ').slice(0, 80);
      csvContent += `"${post.id}","${post.status}","${post.mediaType}","${post.createdAt}","${post.scheduledAt || ''}","${cleanCaption}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `socialsync-analytics-${selectedRange}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = analytics?.summary || {
    totalPosts: 0,
    publishedPosts: 0,
    failedPosts: 0,
    scheduledPosts: 0,
    successRate: 0,
    connectedAccountsCount: 0,
    creditsConsumed: 0
  };

  const perPlatform = analytics?.perPlatformStats || {};
  const timeline = analytics?.timeline || [];
  const contentTypes = analytics?.contentTypes || {
    text: { count: 0, percentage: 0 },
    image: { count: 0, percentage: 0 },
    video: { count: 0, percentage: 0 }
  };
  const recentDeliveries = analytics?.recentDeliveries || [];

  // Calculate platform share distribution for Donut Chart
  const platformShareData = useMemo(() => {
    const list = [];
    let totalAll = 0;
    Object.entries(perPlatform).forEach(([key, stats]) => {
      const val = stats.published || stats.total || 0;
      totalAll += val;
      list.push({
        key,
        name: PLATFORM_CONFIG[key]?.name || key,
        value: val,
        color: PLATFORM_CONFIG[key]?.color || '#3B5BFF'
      });
    });

    if (totalAll === 0) {
      return { items: [], total: 0 };
    }

    return {
      total: totalAll,
      items: list.map(item => ({
        ...item,
        percentage: Math.round((item.value / totalAll) * 100)
      }))
    };
  }, [perPlatform]);

  // Find max value in timeline for scaling the SVG chart
  const maxTimelineVal = useMemo(() => {
    let max = 1;
    timeline.forEach(item => {
      const sum = (item.published || 0) + (item.scheduled || 0) + (item.failed || 0);
      if (sum > max) max = sum;
    });
    return Math.max(max, 5);
  }, [timeline]);

  // Peak activity day finding
  const peakDay = useMemo(() => {
    if (!timeline.length) return null;
    let peak = timeline[0];
    timeline.forEach(t => {
      if ((t.published + t.scheduled) > (peak.published + peak.scheduled)) {
        peak = t;
      }
    });
    return peak;
  }, [timeline]);

  if (loading) {
    return <LoadingState message="Aggregating your multi-channel publishing analytics..." />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* ======================================================== */}
      {/* 1. ANALYTICS TOOLBAR & CONTROLS */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-2 border-b border-[#E2E8F0] dark:border-[#334155]">
        {/* Left: Live Sync Status Indicator */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync Active</span>
          </span>
          {refreshing && (
            <span className="text-xs text-[#475569] dark:text-slate-400 flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin text-brand-600" />
              <span>Refreshing data...</span>
            </span>
          )}
        </div>

        {/* Range Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time range pills */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155]">
            {[
              { key: '7d', label: '7D' },
              { key: '30d', label: '30D' },
              { key: '90d', label: '90D' },
              { key: 'all', label: 'All Time' }
            ].map(r => (
              <button
                key={r.key}
                type="button"
                onClick={() => handleRangeChange(r.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRange === r.key
                    ? 'bg-white dark:bg-[#0F172A] text-brand-600 dark:text-cyan-400 shadow-xs'
                    : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Refresh Action Button */}
          <button
            type="button"
            onClick={() => fetchAnalytics(selectedRange, true)}
            disabled={refreshing}
            className="p-2.5 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors shadow-xs"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          {/* Export Report Action Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-[#3B5BFF] hover:bg-[#2D48E0] text-white shadow-sm hover:shadow transition-all"
            title="Download CSV Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SUMMARY KPI METRIC CARDS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: Success Rate */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-soft relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
              Delivery Success
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
              {summary.successRate}%
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Optimal pipeline health</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Published */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-soft relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
              Total Published
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
              {summary.publishedPosts.toLocaleString()}
            </div>
            <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-1">
              Confirmed live deliveries
            </p>
          </div>
        </div>

        {/* KPI 3: Scheduled in Queue */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-soft relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
              Scheduled Queued
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
              {summary.scheduledPosts.toLocaleString()}
            </div>
            <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-1">
              Queued for dispatch
            </p>
          </div>
        </div>

        {/* KPI 4: Failures */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-soft relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
              Delivery Failures
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${summary.failedPosts > 0 ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black ${summary.failedPosts > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#0F172A] dark:text-white'}`}>
              {summary.failedPosts}
            </div>
            <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-1">
              {summary.failedPosts === 0 ? 'Zero delivery rejections' : 'Requires review in history'}
            </p>
          </div>
        </div>

        {/* KPI 5: Credits Consumed */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-soft relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
              Credits Invested
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
              {(summary.creditsConsumed || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-1">
              Points consumed for broadcasts
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. VISUAL ACTIVITY TREND (CUSTOM HIGH-FIDELITY SVG CHART) */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">
                Broadcasting Activity Timeline
              </h2>
              <span className="text-xs font-medium text-[#475569] dark:text-slate-400">
                ({timeline.length} days)
              </span>
            </div>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
              Daily distribution of published broadcasts, scheduled queue, and delivery outcomes.
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs font-medium text-[#475569] dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
              Published
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-sky-400 shrink-0" />
              Scheduled
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500 shrink-0" />
              Failed
            </span>
          </div>
        </div>

        {/* SVG Interactive Timeline Bar Chart */}
        <div className="relative pt-4">
          <div className="h-60 sm:h-72 w-full flex items-end gap-1 sm:gap-2 px-2 pb-6 border-b border-slate-100 dark:border-slate-800 relative">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full" />
              <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full" />
              <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full" />
              <div className="border-b border-slate-200 dark:border-slate-700 w-full" />
            </div>

            {timeline.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#475569] dark:text-slate-400">
                <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">No activity recorded for this date window</p>
              </div>
            ) : (
              timeline.map((item, index) => {
                const total = (item.published || 0) + (item.scheduled || 0) + (item.failed || 0);
                const heightPercent = Math.min(100, Math.round((total / maxTimelineVal) * 100));
                const pubPercent = total > 0 ? Math.round((item.published / total) * 100) : 0;
                const schedPercent = total > 0 ? Math.round((item.scheduled / total) * 100) : 0;
                const failPercent = total > 0 ? Math.round((item.failed / total) * 100) : 0;
                const isHovered = hoveredTimelineIndex === index;

                return (
                  <div
                    key={item.date}
                    className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-pointer"
                    onMouseEnter={() => setHoveredTimelineIndex(index)}
                    onMouseLeave={() => setHoveredTimelineIndex(null)}
                  >
                    {/* Hover Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-3 z-30 pointer-events-none bg-slate-900 text-white rounded-xl py-2 px-3 shadow-xl text-left min-w-[130px] border border-slate-700 animate-fade-in">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {item.label}
                        </p>
                        <p className="text-xs font-extrabold text-white mt-0.5">
                          {total} Total Broadcasts
                        </p>
                        <div className="mt-1.5 space-y-0.5 text-[11px]">
                          <div className="flex justify-between text-emerald-400">
                            <span>Published:</span>
                            <span className="font-bold">{item.published}</span>
                          </div>
                          <div className="flex justify-between text-sky-400">
                            <span>Scheduled:</span>
                            <span className="font-bold">{item.scheduled}</span>
                          </div>
                          {item.failed > 0 && (
                            <div className="flex justify-between text-rose-400">
                              <span>Failed:</span>
                              <span className="font-bold">{item.failed}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stacked Bar Container */}
                    <div
                      className={`w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-300 ${
                        isHovered ? 'scale-105 ring-2 ring-brand-500 shadow-lg' : 'hover:opacity-90'
                      }`}
                      style={{ height: total > 0 ? `${Math.max(heightPercent, 8)}%` : '4px' }}
                    >
                      {total === 0 ? (
                        <div className="w-full h-full bg-slate-200 dark:bg-slate-800 rounded-sm" />
                      ) : (
                        <>
                          {item.published > 0 && (
                            <div
                              className="w-full bg-emerald-500 transition-all"
                              style={{ height: `${pubPercent}%` }}
                            />
                          )}
                          {item.scheduled > 0 && (
                            <div
                              className="w-full bg-sky-400 transition-all"
                              style={{ height: `${schedPercent}%` }}
                            />
                          )}
                          {item.failed > 0 && (
                            <div
                              className="w-full bg-rose-500 transition-all"
                              style={{ height: `${failPercent}%` }}
                            />
                          )}
                        </>
                      )}
                    </div>

                    {/* Date X-Axis Tick Label (shown periodically to prevent clutter) */}
                    {(index % Math.ceil(timeline.length / 7) === 0 || index === timeline.length - 1) && (
                      <span className="absolute top-full mt-2 text-[10px] text-[#475569] dark:text-slate-400 font-semibold whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Peak Activity Insight Banner */}
        {peakDay && (peakDay.published + peakDay.scheduled) > 0 && (
          <div className="p-4 rounded-2xl bg-brand-50/70 dark:bg-brand-950/20 border border-brand-200/80 dark:border-brand-900/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs text-brand-950 dark:text-brand-200">
                <strong>Peak Broadcasting Velocity:</strong> Highest activity reached on <strong>{peakDay.label}</strong> with <strong>{peakDay.published + peakDay.scheduled} total posts</strong> processed.
              </p>
            </div>
            <Link
              to="/create-post"
              className="text-xs font-bold text-brand-600 dark:text-cyan-400 hover:underline shrink-0 hidden sm:inline-flex items-center gap-1"
            >
              <span>Schedule Next</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. PLATFORM DISTRIBUTION (DONUT) & CHANNEL MATRIX */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left: Platform Share Donut Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">
              Platform Share Breakdown
            </h3>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
              Distribution of published posts across linked social networks
            </p>
          </div>

          {/* SVG Donut Visual */}
          <div className="flex items-center justify-center py-4">
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="16"
                  fill="transparent"
                />

                {/* Donut Segments */}
                {platformShareData.total > 0 ? (
                  (() => {
                    let accumulatedPercent = 0;
                    const circumference = 2 * Math.PI * 38; // ~238.76

                    return platformShareData.items.map(item => {
                      if (item.value === 0) return null;
                      const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                      accumulatedPercent += item.percentage;

                      return (
                        <circle
                          key={item.key}
                          cx="50"
                          cy="50"
                          r="38"
                          stroke={item.color}
                          strokeWidth="16"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          fill="transparent"
                          className="transition-all duration-500 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setHoveredPlatformKey(item.key)}
                          onMouseLeave={() => setHoveredPlatformKey(null)}
                        />
                      );
                    });
                  })()
                ) : (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="stroke-slate-200 dark:stroke-slate-700"
                    strokeWidth="16"
                    strokeDasharray="238 238"
                    fill="transparent"
                  />
                )}
              </svg>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">
                  {platformShareData.total}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
                  Deliveries
                </span>
              </div>
            </div>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {Object.keys(PLATFORM_CONFIG).map(pKey => {
              const cfg = PLATFORM_CONFIG[pKey];
              const stats = perPlatform[pKey] || { total: 0, published: 0 };
              const isHovered = hoveredPlatformKey === pKey;

              return (
                <div
                  key={pKey}
                  className={`p-2.5 rounded-2xl border transition-all ${
                    isHovered
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 shadow-xs'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1E293B]/40'
                  }`}
                  onMouseEnter={() => setHoveredPlatformKey(pKey)}
                  onMouseLeave={() => setHoveredPlatformKey(null)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white truncate">
                      {cfg.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#475569] dark:text-slate-400 mt-1 pl-4.5">
                    <span>{stats.published || stats.total || 0} posts</span>
                    <span className="font-semibold text-[#0F172A] dark:text-slate-200">
                      {platformShareData.total > 0 ? Math.round(((stats.published || stats.total || 0) / platformShareData.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Channel Delivery Matrix (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">
                Channel Delivery Matrix
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                Real-time connection status &amp; individual channel health
              </p>
            </div>
            <Link
              to="/accounts"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-cyan-400 hover:underline"
            >
              <span>Manage Accounts</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {Object.entries(PLATFORM_CONFIG).map(([platformKey, cfg]) => {
              const stats = perPlatform[platformKey] || {
                total: 0,
                published: 0,
                failed: 0,
                isConnected: false
              };
              const rate = stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0;

              return (
                <div
                  key={platformKey}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-xs"
                      style={{ backgroundColor: cfg.color }}
                    >
                      {cfg.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                          {cfg.name}
                        </h4>
                        {stats.isConnected ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Connected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Not Linked
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-0.5">
                        {stats.accountUsername || stats.accountName ? `@${stats.accountUsername || stats.accountName}` : 'Ready for single-click OAuth linking'}
                      </p>
                    </div>
                  </div>

                  {/* Channel Metrics & Mini Health Bar */}
                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-left sm:text-right">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {stats.published} OK
                        </span>
                        {stats.failed > 0 && (
                          <span className="text-rose-500 dark:text-rose-400 font-bold">
                            {stats.failed} Err
                          </span>
                        )}
                        <span className="font-extrabold text-[#0F172A] dark:text-white">
                          {rate}%
                        </span>
                      </div>

                      {/* Mini Bar */}
                      <div className="w-28 sm:w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-500"
                          style={{ width: `${rate}%` }}
                        />
                        <div
                          className="bg-rose-500 h-full transition-all duration-500"
                          style={{ width: `${stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}%` }}
                        />
                      </div>
                    </div>

                    {!stats.isConnected && (
                      <Link
                        to="/accounts"
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-300 dark:border-slate-700 text-xs font-bold text-[#0F172A] dark:text-white hover:border-brand-500 hover:text-brand-600 transition-colors shrink-0"
                      >
                        Connect
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. CONTENT MEDIA TYPE DISTRIBUTION */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">
            Content Format Distribution
          </h3>
          <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
            Comparison of text-only broadcasts vs visual images and video productions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Format 1: Text Only */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                {contentTypes.text.percentage}%
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">Text-Only Posts</h4>
              <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
                {contentTypes.text.count} total updates
              </p>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${contentTypes.text.percentage}%` }} />
            </div>
          </div>

          {/* Format 2: Image Posts */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                {contentTypes.image.percentage}%
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">Image Artwork</h4>
              <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
                {contentTypes.image.count} visual posts
              </p>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${contentTypes.image.percentage}%` }} />
            </div>
          </div>

          {/* Format 3: Video Broadcasts */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                <Film className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                {contentTypes.video.percentage}%
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">Video &amp; Shorts</h4>
              <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
                {contentTypes.video.count} multimedia posts
              </p>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${contentTypes.video.percentage}%` }} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default AnalyticsPage;
