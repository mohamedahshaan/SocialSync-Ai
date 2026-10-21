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
  Check,
  XCircle,
  Eye,
  ArrowUpDown,
  Lock,
  Layers,
  User,
  Calendar
} from 'lucide-react';
import { api } from '../../services/api';
import { LoadingState } from '../../components/common/ProtectedRoute';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { formatSriLankaDate, formatSriLankaTime, formatSriLankaDateTime } from '../../utils/timezone';

export function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');

  // Details Modal
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

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
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (planFilter) params.set('plan', planFilter);

      if (sortOption === 'date_asc') {
        params.set('sortBy', 'createdAt');
        params.set('sortOrder', 'asc');
      } else if (sortOption === 'amount_desc') {
        params.set('sortBy', 'amount');
        params.set('sortOrder', 'desc');
      } else if (sortOption === 'amount_asc') {
        params.set('sortBy', 'amount');
        params.set('sortOrder', 'asc');
      } else {
        params.set('sortBy', 'createdAt');
        params.set('sortOrder', 'desc');
      }

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
    const timer = setTimeout(() => {
      loadPayments(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, planFilter, sortOption]);

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

  const handleOpenDetails = (payment) => {
    setSelectedPayment(payment);
    setDetailsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Automatic PayHere Payment Ledger</span>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] dark:text-white tracking-tight">Payment Invoices & Receipts</h2>
          <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
            Audit verified, pending, and failed subscription transactions with real-time PayHere IPN synchronization
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

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-soft">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID, customer name, email, or PayHere ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 focus:outline-hidden"
          >
            <option value="">All Plans</option>
            <option value="CREATOR">Creator</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="FREE">Free</option>
          </select>

          {/* Sort Option */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 focus:outline-hidden"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>

          <span className="text-xs text-[#475569] dark:text-slate-400 ml-2">
            Total: <strong>{pagination.total}</strong>
          </span>
        </div>
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
            <p>No payment records found matching your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#334155] bg-slate-50/80 dark:bg-slate-950/80 text-[#475569] dark:text-slate-400">
                  <th className="py-4 px-5 font-semibold">Reference / Order</th>
                  <th className="py-4 px-5 font-semibold">Customer</th>
                  <th className="py-4 px-5 font-semibold">Amount</th>
                  <th className="py-4 px-5 font-semibold">Plan</th>
                  <th className="py-4 px-5 font-semibold">Status</th>
                  <th className="py-4 px-5 font-semibold">PayHere ID</th>
                  <th className="py-4 px-5 font-semibold">Subscription</th>
                  <th className="py-4 px-5 font-semibold text-right">Date (SLST)</th>
                  <th className="py-4 px-5 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60 text-[#0F172A] dark:text-slate-300">
                {payments.map((p) => {
                  const subStatus = p.user?.subscription?.status || 'INACTIVE';
                  const isVerified = p.status === 'VERIFIED';
                  const isFailed = p.status === 'FAILED' || p.status === 'CANCELLED';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                      {/* Reference */}
                      <td className="py-3.5 px-5 font-mono font-bold text-[#0F172A] dark:text-white">
                        <span className="truncate max-w-[130px] block" title={p.reference}>
                          {p.reference}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-[#0F172A] dark:text-white">{p.user?.name || 'Customer'}</p>
                        <p className="text-[11px] text-[#475569] dark:text-slate-400 font-mono truncate max-w-[150px]" title={p.user?.email}>
                          {p.user?.email}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-5 font-bold text-[#0F172A] dark:text-white whitespace-nowrap">
                        {p.currency} {Number(p.amount).toLocaleString()}
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-5">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 inline-block">
                          {p.plan}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isVerified
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : isFailed
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}>
                          {isVerified && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                          {isFailed && <XCircle className="w-3 h-3 text-rose-500" />}
                          {!isVerified && !isFailed && <Clock className="w-3 h-3 text-amber-500" />}
                          <span>{p.status}</span>
                        </span>
                      </td>

                      {/* PayHere Payment ID */}
                      <td className="py-3.5 px-5 font-mono text-[11px] text-[#475569] dark:text-slate-400">
                        {p.gatewayTransactionId ? (
                          <span className="truncate max-w-[110px] block" title={p.gatewayTransactionId}>
                            {p.gatewayTransactionId}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Subscription Activation Status */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          subStatus === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : subStatus === 'TRIALING'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {subStatus}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <p className="text-xs font-medium text-[#0F172A] dark:text-slate-200">{formatSriLankaDate(p.createdAt)}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {p.verifiedAt ? `Verified: ${formatSriLankaTime(p.verifiedAt)}` : formatSriLankaTime(p.createdAt)}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(p)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 font-semibold text-[11px] transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-[#475569] dark:text-slate-400">
          <span>Page {pagination.page} of {pagination.totalPages || 1} ({pagination.total} records)</span>

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

      {/* Payment Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Transaction Invoice Details"
        subtitle="Complete database record and PayHere verification audit"
        width="min(700px, calc(100vw - 32px))"
        footer={
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setDetailsModalOpen(false)}
              className="text-xs py-2 px-5 cursor-pointer font-medium"
            >
              Close
            </Button>
          </div>
        }
      >
        {selectedPayment && (
          <div className="space-y-5">
            {/* Top Status Banner */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              selectedPayment.status === 'VERIFIED'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : selectedPayment.status === 'FAILED' || selectedPayment.status === 'CANCELLED'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
            }`}>
              <div className="flex items-center gap-3">
                {selectedPayment.status === 'VERIFIED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm">Status: {selectedPayment.status}</h4>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {selectedPayment.status === 'VERIFIED'
                      ? 'Verified payment. Subscribed plan activated and credits allocated.'
                      : selectedPayment.status === 'PENDING'
                      ? 'Awaiting authoritative server-side confirmation from PayHere.'
                      : selectedPayment.failureReason || 'Transaction unsuccessful.'}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-current/10">
                <span className="text-xs opacity-80 block">Amount</span>
                <strong className="text-lg font-black">{selectedPayment.currency} {Number(selectedPayment.amount).toLocaleString()}</strong>
              </div>
            </div>

            {/* Two Column Grid - Stacks to single column on small screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Payment Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">Payment Metadata</h5>
                
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800 gap-2">
                  <span className="text-slate-500 shrink-0">Order Reference:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white select-all break-all text-right">{selectedPayment.reference}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800 gap-2">
                  <span className="text-slate-500 shrink-0">PayHere Payment ID:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white select-all break-all text-right">
                    {selectedPayment.gatewayTransactionId || '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800 gap-2">
                  <span className="text-slate-500 shrink-0">Payment Gateway:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedPayment.gateway || 'PAYHERE'}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800 gap-2">
                  <span className="text-slate-500 shrink-0">Selected Plan:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">{selectedPayment.plan}</span>
                </div>

                <div className="flex justify-between items-center py-1 gap-2">
                  <span className="text-slate-500 shrink-0">Created (SLST):</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono text-right">{formatSriLankaDateTime(selectedPayment.createdAt)}</span>
                </div>

                {selectedPayment.verifiedAt && (
                  <div className="flex justify-between items-center py-1 border-t border-slate-200/60 dark:border-slate-800 gap-2">
                    <span className="text-slate-500 shrink-0">Verified Completed:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold text-right">{formatSriLankaDateTime(selectedPayment.verifiedAt)}</span>
                  </div>
                )}
              </div>

              {/* Customer & Subscription Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">Subscriber Profile</h5>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800 gap-2">
                  <span className="text-slate-500 shrink-0">Customer Name:</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-right">{selectedPayment.user?.name || 'Customer'}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800 gap-2">
                  <span className="text-slate-500 shrink-0">Customer Email:</span>
                  <span className="font-mono text-slate-900 dark:text-white select-all break-all text-right max-w-[180px] sm:max-w-none truncate">{selectedPayment.user?.email}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800 gap-2">
                  <span className="text-slate-500 shrink-0">User Account Plan:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedPayment.user?.plan || '—'}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800 gap-2">
                  <span className="text-slate-500 shrink-0">Subscription Status:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedPayment.user?.subscription?.status || 'INACTIVE'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 gap-2">
                  <span className="text-slate-500 shrink-0">Auto-Renew:</span>
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {selectedPayment.user?.subscription?.autoRenew ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

            </div>

            {/* Notes & Audit Information */}
            {selectedPayment.notes && (
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Audit Ledger Notes:</span>
                <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px] break-words">{selectedPayment.notes}</p>
              </div>
            )}

            {/* Security Guarantee Notice */}
            <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-[11px] text-[#475569] dark:text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>PCI-DSS Hygiene: Raw card numbers, CVV, PayHere Merchant Secrets, and access tokens are strictly never stored in this database.</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Manual Payment Invoice Modal */}
      <Modal
        isOpen={recordModalOpen}
        onClose={() => !submitting && setRecordModalOpen(false)}
        showClose={!submitting}
        title="Record Manual Payment Invoice"
        subtitle="Manually create a payment receipt for offline bank transfers or direct invoiced plans"
        width="min(480px, calc(100vw - 32px))"
        onSubmit={handleRecordPayment}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setRecordModalOpen(false)}
              disabled={submitting}
              className="text-xs py-2.5 px-4 cursor-pointer font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={submitting}
              disabled={submitting}
              className="text-xs py-2.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
            >
              Save Invoice
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1">
              Customer Email *
            </label>
            <input
              type="email"
              required
              value={formData.userEmail}
              onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
              placeholder="user@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1">
                Plan Tier *
              </label>
              <select
                value={formData.plan}
                onChange={(e) => {
                  const p = e.target.value;
                  setFormData({
                    ...formData,
                    plan: p,
                    amount: p === 'CREATOR' ? '1000' : p === 'PROFESSIONAL' ? '2500' : '0'
                  });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="CREATOR">Creator Plan (LKR 1,000)</option>
                <option value="PROFESSIONAL">Professional Plan (LKR 2,500)</option>
                <option value="FREE">Free Tier (LKR 0)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1">
                Amount (LKR) *
              </label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1">
              External Reference / Slip No.
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="e.g. BANK-SLIP-78291"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1">
              Admin Audit Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Reason for manual invoice generation..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="verified"
              checked={formData.verified}
              onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
              className="rounded-sm border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
            />
            <label htmlFor="verified" className="text-xs text-[#0F172A] dark:text-slate-300 font-medium cursor-pointer">
              Immediately verify payment and fulfill user plan upgrade
            </label>
          </div>
        </div>
      </Modal>

    </div>
  );
}
export default AdminPaymentsPage;
