import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  PlusCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  AlertCircle,
  ShieldCheck,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';

export function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Record Payment Modal
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    userEmail: '',
    amount: '1000',
    currency: 'LKR',
    plan: 'CREATOR',
    reference: '',
    notes: '',
    verified: true
  });
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', 15);
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get(`/admin/payments?${params.toString()}`);
      if (res.success) {
        setPayments(res.data.payments);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments(1);
  }, [statusFilter]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      // First resolve user by email
      const usersRes = await api.get(`/admin/users?search=${encodeURIComponent(formData.userEmail.trim())}`);
      const matchedUser = usersRes.data?.users?.find(
        (u) => u.email.toLowerCase() === formData.userEmail.trim().toLowerCase()
      );

      if (!matchedUser) {
        alert(`No user found with email "${formData.userEmail}". Please verify the email address.`);
        return;
      }

      const res = await api.post('/admin/payments', {
        userId: matchedUser.id,
        amount: Number(formData.amount),
        currency: formData.currency,
        plan: formData.plan,
        reference: formData.reference,
        notes: formData.notes,
        verified: formData.verified
      });

      if (res.success) {
        setRecordModalOpen(false);
        setFormData({
          userEmail: '',
          amount: '1000',
          currency: 'LKR',
          plan: 'CREATOR',
          reference: '',
          notes: '',
          verified: true
        });
        loadPayments(1);
      }
    } catch (err) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPendingPayment = async (paymentId) => {
    if (!window.confirm('Confirm verification of this payment invoice? This will record verified status in database and upgrade the user tier.')) return;
    try {
      const res = await api.patch(`/admin/payments/${paymentId}/verify`, {
        upgradeUserPlan: true
      });
      if (res.success) {
        loadPayments(pagination.page);
      }
    } catch (err) {
      alert(err.message || 'Verification failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] dark:text-white tracking-tight">Payment Invoices & Receipts</h2>
          <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
            Audit verified and pending subscription payments in Sri Lankan Rupees (LKR)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRecordModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Payment Invoice</span>
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-soft">
        <span className="text-xs text-[#475569] dark:text-slate-400">
          Showing {pagination.total} payment records
        </span>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 focus:outline-hidden"
        >
          <option value="">All Statuses</option>
          <option value="VERIFIED">Verified</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl overflow-hidden shadow-soft">
        {loading ? (
          <div className="py-20">
            <LoadingState message="Loading payment ledger..." />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-20 text-center text-[#475569] dark:text-slate-500 text-xs space-y-2">
            <CreditCard className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
            <p>No payment records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#334155] bg-slate-50/80 dark:bg-slate-950/80 text-[#475569] dark:text-slate-400">
                  <th className="py-4 px-6 font-semibold">Reference</th>
                  <th className="py-4 px-6 font-semibold">User</th>
                  <th className="py-4 px-6 font-semibold">Amount</th>
                  <th className="py-4 px-6 font-semibold">Plan</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  <th className="py-4 px-6 font-semibold">Created</th>
                  <th className="py-4 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60 text-[#0F172A] dark:text-slate-300">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-[#0F172A] dark:text-white">
                      {p.reference}
                    </td>
                    <td className="py-3.5 px-6">
                      <p className="font-semibold text-[#0F172A] dark:text-white">{p.user?.name || 'User'}</p>
                      <p className="text-[11px] text-[#475569] dark:text-slate-400 font-mono">{p.user?.email}</p>
                    </td>
                    <td className="py-3.5 px-6 font-bold text-[#0F172A] dark:text-white">
                      {p.currency} {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        {p.plan}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'VERIFIED'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-[#475569] dark:text-slate-400 text-[11px]">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {p.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleVerifyPendingPayment(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors"
                        >
                          Verify & Activate
                        </button>
                      )}
                      {p.status === 'VERIFIED' && (
                        <span className="text-[11px] text-[#475569] dark:text-slate-500 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-[#475569] dark:text-slate-400">
          <span>Page {pagination.page} of {pagination.totalPages}</span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadPayments(pagination.page - 1)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 disabled:opacity-40 text-[#0F172A] dark:text-slate-300 hover:text-cyan-600 dark:hover:text-white"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadPayments(pagination.page + 1)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 disabled:opacity-40 text-[#0F172A] dark:text-slate-300 hover:text-cyan-600 dark:hover:text-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Record Payment */}
      <Modal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        title="Record Verified Payment Invoice"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Customer Email Address</label>
            <input
              type="email"
              required
              value={formData.userEmail}
              onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Amount (LKR)</label>
              <input
                type="number"
                required
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Subscription Tier</label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs"
              >
                <option value="CREATOR">Creator (LKR 1,000)</option>
                <option value="PROFESSIONAL">Professional (LKR 2,500)</option>
                <option value="FREE">Free</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Payment Reference (e.g. Bank Ref / Receipt #)</label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Leave blank for auto-generated ID"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[#0F172A] dark:text-slate-300 mb-1 font-medium">Internal Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Direct bank transfer verified on statement..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-xs resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.verified}
              onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
              className="rounded bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-cyan-500 focus:ring-0"
            />
            <span className="text-[#0F172A] dark:text-slate-300">Mark as Verified immediately (Activates user tier)</span>
          </label>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
export default AdminPaymentsPage;
