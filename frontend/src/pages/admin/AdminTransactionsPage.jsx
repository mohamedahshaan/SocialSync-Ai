import React, { useState, useEffect } from 'react';
import {
  Coins,
  History,
  Search,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { Link } from 'react-router-dom';

export function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const loadTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/transactions?page=${page}&limit=20`);
      if (res.success) {
        setTransactions(res.data.transactions);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(1);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Credit Ledger Audit Trail</h2>
        <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-0.5">
          Immutable ledger of all platform credit grants, deductions, usage, and adjustments
        </p>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20">
            <LoadingState message="Loading credit transaction audit trail..." />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500 text-xs space-y-2">
            <Coins className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
            <p>No credit transactions recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[#475569] dark:text-slate-400">
                  <th className="py-4 px-6 font-semibold">User</th>
                  <th className="py-4 px-6 font-semibold">Type</th>
                  <th className="py-4 px-6 font-semibold">Amount</th>
                  <th className="py-4 px-6 font-semibold">Balance After</th>
                  <th className="py-4 px-6 font-semibold">Reason</th>
                  <th className="py-4 px-6 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60 text-[#0F172A] dark:text-slate-300">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <Link
                        to={`/admin/users/${tx.user?.id}`}
                        className="font-semibold text-[#0F172A] dark:text-white hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
                      >
                        {tx.user?.name || 'User'}
                      </Link>
                      <p className="text-[11px] text-[#475569] dark:text-slate-400 font-mono">{tx.user?.email}</p>
                    </td>

                    <td className="py-3.5 px-6">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        {tx.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 font-mono font-bold">
                      <span className={tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 font-mono font-semibold text-cyan-600 dark:text-cyan-300">
                      {tx.balanceAfter} pts
                    </td>

                    <td className="py-3.5 px-6 text-[#475569] dark:text-slate-300 max-w-xs truncate">
                      {tx.reason}
                    </td>

                    <td className="py-3.5 px-6 text-right text-[#475569] dark:text-slate-400 text-[11px]">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-[#475569] dark:text-slate-400">
          <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total transactions)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadTransactions(pagination.page - 1)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 disabled:opacity-40 text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadTransactions(pagination.page + 1)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 disabled:opacity-40 text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
export default AdminTransactionsPage;
