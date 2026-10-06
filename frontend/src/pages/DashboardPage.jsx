import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Share2,
  PlusCircle,
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardCard } from '../components/common/DashboardCard';
import { PostCard } from '../components/common/PostCard';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/ProtectedRoute';
import { EmptyState } from '../components/common/ProtectedRoute';

export function DashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [analyticsRes, postsRes, accountsRes] = await Promise.all([
          api.get('/analytics'),
          api.get('/posts?limit=3'),
          api.get('/social-accounts')
        ]);

        if (analyticsRes.success) setAnalytics(analyticsRes.data);
        if (postsRes.success) setRecentPosts(postsRes.data.posts);
        if (accountsRes.success) setAccounts(accountsRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading your dashboard analytics..." />;
  }

  const summary = analytics?.summary || {
    totalPosts: 0,
    publishedPosts: 0,
    scheduledPosts: 0,
    failedPosts: 0,
    connectedAccountsCount: accounts.length
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome & Quick Actions Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-premium relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold mb-3 border border-brand-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              SaaS Command Center
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Create Once. <span className="text-brand-300">Publish Everywhere.</span>
            </h2>
            <p className="text-slate-300 text-sm mt-1.5 max-w-xl">
              Seamlessly publish and schedule rich media content to Facebook, Instagram, LinkedIn, X, and Threads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/accounts">
              <Button variant="secondary" size="md" icon={Share2}>
                Connect Account
              </Button>
            </Link>
            <Link to="/create-post">
              <Button variant="primary" size="md" icon={PlusCircle}>
                New Post
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard
          title="Total Posts"
          value={summary.totalPosts}
          icon={FileText}
          color="indigo"
        />
        <DashboardCard
          title="Published"
          value={summary.publishedPosts}
          icon={CheckCircle2}
          color="emerald"
        />
        <DashboardCard
          title="Scheduled"
          value={summary.scheduledPosts}
          icon={Clock}
          color="sky"
        />
        <DashboardCard
          title="Failed"
          value={summary.failedPosts}
          icon={XCircle}
          color="rose"
        />
        <DashboardCard
          title="Accounts"
          value={accounts.length}
          icon={Share2}
          color="purple"
        />
      </div>

      {/* Two Column Layout: Recent Posts & Platform Connections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Posts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Publishing Activity</h3>
              <p className="text-xs text-slate-500">Your most recent multi-platform broadcasts</p>
            </div>
            <Link
              to="/posts"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <EmptyState
              title="No posts published yet"
              description="Craft your first update and broadcast it across multiple social networks in one click."
              actionLabel="Create Your First Post"
              onAction={() => window.location.href = '/create-post'}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {recentPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Connected Platforms Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Connected Channels</h3>
              <p className="text-xs text-slate-500">Active social accounts</p>
            </div>
            <Link
              to="/accounts"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Manage
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft space-y-3">
            {['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'X', 'THREADS'].map((platform) => {
              const connected = accounts.find((a) => a.platform === platform);
              return (
                <div
                  key={platform}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-800">{platform}</span>
                  </div>
                  {connected ? (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {connected.accountName || 'Active'}
                    </span>
                  ) : (
                    <Link
                      to="/accounts"
                      className="text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors"
                    >
                      Connect
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
