import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
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
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';

export function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard');
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
    loadStats();
  }, []);

  if (loading) {
    return <LoadingState message="Aggregating database statistics..." />;
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        <p className="font-bold">Error loading dashboard</p>
        <p className="text-xs mt-1">{error}</p>
        <button
          onClick={loadStats}
          className="mt-3 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, recentRegistrations, recentPayments, recentAuditLogs } = data || {};

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Users */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Total Registered Users</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white">
              {summary?.totalUsers || 0}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {summary?.activeUsers || 0} Active
            </span>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>Suspended:</span>
            <strong className="text-rose-600 dark:text-rose-400">{summary?.suspendedUsers || 0} accounts</strong>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Subscription Tiers</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center">
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-[#475569] dark:text-slate-400 block font-medium">Free</span>
              <strong className="text-sm font-bold text-[#0F172A] dark:text-white">{summary?.planDistribution?.FREE || 0}</strong>
            </div>
            <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40">
              <span className="text-[10px] text-cyan-700 dark:text-cyan-400 block font-medium">Creator</span>
              <strong className="text-sm font-bold text-cyan-600 dark:text-cyan-300">{summary?.planDistribution?.CREATOR || 0}</strong>
            </div>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40">
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 block font-medium">Pro</span>
              <strong className="text-sm font-bold text-indigo-600 dark:text-indigo-300">{summary?.planDistribution?.PROFESSIONAL || 0}</strong>
            </div>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 text-center border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            Real PostgreSQL plan records
          </div>
        </div>

        {/* Verified Payments */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Verified Payments</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white">
              LKR {Number(summary?.payments?.verifiedTotalLkr || 0).toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>Verified Transactions:</span>
            <strong className="text-emerald-600 dark:text-emerald-400">{summary?.payments?.verifiedCount || 0} verified</strong>
          </div>
        </div>

        {/* Circulating Credits */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#475569] dark:text-slate-400">Circulating Credits</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">
              {Number(summary?.totalCirculatingCredits || 0).toLocaleString()}
            </span>
            <span className="text-xs text-[#475569] dark:text-slate-400">Total Credits</span>
          </div>
          <div className="text-[11px] text-[#475569] dark:text-slate-400 flex justify-between border-t border-[#E2E8F0] dark:border-[#334155] pt-2">
            <span>Ledger:</span>
            <Link to="/admin/transactions" className="text-cyan-600 dark:text-cyan-400 hover:underline">
              View Audit Ledger →
            </Link>
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
                {recentRegistrations?.map((u) => (
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
                        {new Date(p.createdAt).toLocaleDateString()}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Administrator Security Audit Log</h3>
              <p className="text-xs text-[#475569] dark:text-slate-400">Recent sensitive administrative actions</p>
            </div>
          </div>
          <span className="text-xs text-[#475569] dark:text-slate-400">Immutable Audit Trail</span>
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
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
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
