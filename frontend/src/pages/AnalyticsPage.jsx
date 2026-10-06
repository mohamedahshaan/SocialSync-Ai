import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Share2,
  AlertCircle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardCard } from '../components/common/DashboardCard';
import { LoadingState } from '../components/common/ProtectedRoute';

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const res = await api.get('/analytics');
        if (res.success && res.data) {
          setAnalytics(res.data);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return <LoadingState message="Aggregating your real-time publishing analytics..." />;
  }

  const summary = analytics?.summary || {
    totalPosts: 0,
    publishedPosts: 0,
    failedPosts: 0,
    scheduledPosts: 0,
    successRate: 0,
    connectedAccountsCount: 0
  };

  const perPlatform = analytics?.perPlatformStats || {};

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Performance & Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real metrics derived from your multi-platform database records.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Overall Success Rate"
          value={`${summary.successRate}%`}
          icon={TrendingUp}
          color="emerald"
        />
        <DashboardCard
          title="Total Published"
          value={summary.publishedPosts}
          icon={CheckCircle2}
          color="indigo"
        />
        <DashboardCard
          title="Scheduled Queued"
          value={summary.scheduledPosts}
          icon={Clock}
          color="sky"
        />
        <DashboardCard
          title="Publishing Failures"
          value={summary.failedPosts}
          icon={XCircle}
          color="rose"
        />
      </div>

      {/* Per-Platform Volume Breakdown */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">Publishing Volume by Channel</h3>
          <p className="text-xs text-slate-500">Distribution of successful vs failed deliveries per platform</p>
        </div>

        <div className="space-y-4">
          {Object.entries(perPlatform).map(([platform, stats]) => {
            const total = stats.total || 0;
            const published = stats.published || 0;
            const failed = stats.failed || 0;
            const rate = total > 0 ? Math.round((published / total) * 100) : 0;

            return (
              <div key={platform} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{platform}</span>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="text-emerald-600 font-semibold">{published} published</span>
                    <span className="text-rose-500 font-semibold">{failed} failed</span>
                    <span className="font-bold text-slate-700">{rate}% success</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${rate}%` }}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${total > 0 ? Math.round((failed / total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Platform External Analytics Notice */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-6 space-y-3">
        <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <span>Advanced Platform Engagement Analytics (Impressions & Reach)</span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed max-w-2xl">
          In strict compliance with official developer terms, SocialFlow AI does not simulate fake impressions or follower numbers.
          To query official impressions, likes, comments, and reach via the Meta Graph API, LinkedIn Analytics API, and X Analytics v2,
          your developer applications must pass formal app verification and request business analytics permissions.
        </p>
        <div className="pt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-200/60 text-amber-900">
            Status: Configuration & Verification Required
          </span>
        </div>
      </div>
    </div>
  );
}
