import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  User,
  Shield,
  Key,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  CreditCard,
  Calendar,
  Clock,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  Bell,
  Share2,
  LogOut,
  Receipt,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { ChangePlanModal } from '../components/subscription/ChangePlanModal';
import { CancelSubscriptionModal } from '../components/subscription/CancelSubscriptionModal';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(
    ['profile', 'security', 'subscription', 'preferences', 'accounts'].includes(initialTab)
      ? initialTab
      : 'profile'
  );

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password / Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);

  // Preferences State (Notifications)
  const [notifications, setNotifications] = useState({
    postPublished: true,
    publishFailures: true,
    monthlyReceipts: true,
    creditsAlert: true
  });

  // Subscription State
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Status & Feedback messages
  const [toastMessage, setToastMessage] = useState({ text: '', type: 'success' });

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage({ text: '', type: 'success' }), 5000);
  };

  const loadSubscription = async () => {
    try {
      setSubLoading(true);
      const res = await api.get('/subscriptions/me');
      if (res.data) {
        setSubscriptionData(res.data);
      }
    } catch (err) {
      console.error('Failed to load subscription:', err);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    setName(user?.name || '');
    loadSubscription();
  }, [user]);

  const handleTabSwitch = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Profile Update Handler
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    setProfileSaving(true);
    try {
      const res = await api.put('/auth/profile', { name: name.trim() });
      if (res.success) {
        showToast('Profile updated successfully!');
      } else {
        showToast(res.message || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Password Change Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Please provide both current and new password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setSecuritySaving(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });
      if (res.success) {
        showToast('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(res.message || 'Failed to change password', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSecuritySaving(false);
    }
  };

  // Theme Toggle Handler
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    const label = newTheme === 'dark' ? 'Dark' : newTheme === 'light' ? 'Light' : 'System';
    showToast(`Theme switched to ${label} mode.`);
  };

  const handlePlanChanged = (result) => {
    showToast(result.message || 'Plan successfully updated!');
    loadSubscription();
  };

  const handleCancelled = (result) => {
    showToast(result.message || 'Subscription cancellation scheduled.');
    loadSubscription();
  };

  const plan = subscriptionData?.plan || {
    name: user?.plan || 'Free',
    type: user?.plan || 'FREE',
    priceLkr: 0,
    priceUsd: 0,
    credits: 100,
    maxConnectedAccounts: 2
  };

  const subscription = subscriptionData?.subscription;
  const usage = subscriptionData?.usage || { connectedAccounts: 0 };
  const billingHistory = subscriptionData?.billingHistory || [];
  const isPaid = plan.type !== 'FREE';
  const isCancellationScheduled = subscription?.cancelAtPeriodEnd || subscription?.status === 'Cancellation Scheduled';

  const nextBillingFormatted = subscription?.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'N/A';

  const periodEndFormatted = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'N/A';

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Global Toast Alert */}
      {toastMessage.text && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between animate-fade-in shadow-xs ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span className="font-semibold">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage({ text: '', type: 'success' })}
            className="font-bold text-xs hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs Pill Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-100 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] scrollbar-none">
        {[
          { key: 'profile', label: 'Profile Details', icon: User },
          { key: 'security', label: 'Login & Security', icon: Key },
          { key: 'subscription', label: 'Plan & Subscription', icon: CreditCard },
          { key: 'preferences', label: 'Preferences', icon: Sun },
          { key: 'accounts', label: 'Connected Channels', icon: Share2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabSwitch(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-[#475569] dark:text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: PROFILE & ACCOUNT DETAILS */}
      {/* ======================================================== */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Personal Information</h3>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Update your public identity and profile credentials.</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="flex items-center gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#334155]">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-brand-600/20">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{user?.name}</p>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">{user?.email}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  {user?.role || 'Creator'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500 font-medium text-[#0F172A] dark:text-[#F8FAFC]"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-[#1E293B]/60 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-[#475569] dark:text-slate-400 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] text-xs">
                <span className="font-semibold text-[#475569] dark:text-slate-400 block mb-0.5">Account ID</span>
                <code className="font-mono text-[#0F172A] dark:text-[#F8FAFC] text-[11px]">{user?.id}</code>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] text-xs">
                <span className="font-semibold text-[#475569] dark:text-slate-400 block mb-0.5">Member Since</span>
                <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Active Member'}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" isLoading={profileSaving} variant="primary">
                Save Profile Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: LOGIN & SECURITY */}
      {/* ======================================================== */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Login Credentials & Security</h3>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Ensure your account is protected with a secure password.</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500 font-medium text-[#0F172A] dark:text-[#F8FAFC] pr-10"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500 font-medium text-[#0F172A] dark:text-[#F8FAFC] pr-10"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500 font-medium text-[#0F172A] dark:text-[#F8FAFC]"
                placeholder="Repeat new password"
              />
            </div>

            <div className="pt-3">
              <Button type="submit" isLoading={securitySaving} variant="primary">
                Update Password
              </Button>
            </div>
          </form>

          <div className="pt-6 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between text-xs text-[#475569] dark:text-[#CBD5E1]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Passwords are cryptographically salted with bcrypt hashing.</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: CURRENT PLAN & SUBSCRIPTION (MY PLAN INTEGRATION) */}
      {/* ======================================================== */}
      {activeTab === 'subscription' && (
        <div className="space-y-6 animate-fade-in">
          {/* Cancellation Scheduled Alert */}
          {isCancellationScheduled && (
            <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Cancellation Scheduled</h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                    Your subscription will not renew. Your paid features, remaining credits, and quotas remain
                    active until <strong className="text-amber-950 dark:text-amber-100">{periodEndFormatted}</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsChangeModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-sm"
              >
                Reactivate / Switch Plan
              </button>
            </div>
          )}

          {/* Primary Plan Card */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#334155]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-black">
                  <CreditCard className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{plan.name} Tier</h3>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        subscription?.status === 'Active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : isCancellationScheduled
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#334155]'
                      }`}
                    >
                      {subscription?.status || (plan.type === 'FREE' ? 'Free Plan' : 'Active')}
                    </span>
                  </div>
                  <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-0.5">
                    {isPaid
                      ? `LKR ${plan.priceLkr?.toLocaleString()} per month recurring`
                      : 'Free tier with standard publishing credits'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsChangeModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-soft transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Change Plan</span>
                </button>
                {isPaid && !isCancellationScheduled && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[#475569] dark:text-[#CBD5E1] hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition-all"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1">
                <span className="font-semibold text-[#475569] dark:text-[#CBD5E1] block">Available Credits</span>
                <span className="text-2xl font-black text-brand-600 dark:text-cyan-400">{user?.credits ?? 200}</span>
                <span className="text-[11px] text-[#475569] dark:text-slate-400 block">Deducted per channel broadcast</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1">
                <span className="font-semibold text-[#475569] dark:text-[#CBD5E1] block">Connected Channels</span>
                <span className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                  {usage.connectedAccounts} / {plan.maxConnectedAccounts || 2}
                </span>
                <span className="text-[11px] text-[#475569] dark:text-slate-400 block">Max allowed on {plan.name}</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1">
                <span className="font-semibold text-[#475569] dark:text-[#CBD5E1] block">Next Renewal Date</span>
                <span className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">{nextBillingFormatted}</span>
                <span className="text-[11px] text-[#475569] dark:text-slate-400 block">
                  {isPaid ? 'Automatic card renewal' : 'Free tier never expires'}
                </span>
              </div>
            </div>

            {/* Payment Method Details */}
            {subscription?.paymentMethod && (
              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-[#475569] dark:text-slate-400" />
                  <div>
                    <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4}
                    </span>
                    <span className="text-[#475569] dark:text-slate-400 block text-[11px]">
                      Expires {subscription.paymentMethod.expMonth}/{subscription.paymentMethod.expYear} (Cardholder: {subscription.paymentMethod.cardholderName})
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Recurring Authorized
                </span>
              </div>
            )}
          </div>

          {/* Billing & Invoice History Table */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-4">
            <div className="flex items-center gap-2.5 pb-2">
              <Receipt className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <div>
                <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Billing History & Receipts</h3>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Record of verified monthly renewals and payments</p>
              </div>
            </div>

            {billingHistory.length === 0 ? (
              <div className="py-8 text-center text-[#475569] dark:text-slate-400 text-xs">
                No past billing transactions recorded yet for this account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3 font-semibold">Reference</th>
                      <th className="py-3 px-3 font-semibold">Date</th>
                      <th className="py-3 px-3 font-semibold">Tier</th>
                      <th className="py-3 px-3 font-semibold">Amount</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                    {billingHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1E293B]/60 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-medium text-[#0F172A] dark:text-[#F8FAFC]">{item.reference}</td>
                        <td className="py-3.5 px-3 text-[#475569] dark:text-[#CBD5E1]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{item.plan}</td>
                        <td className="py-3.5 px-3 font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          {item.currency} {item.amount?.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'COMPLETED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() =>
                              alert(
                                `Official Invoice Receipt:\nReference: ${item.reference}\nAmount: ${item.currency} ${item.amount}\nDate: ${new Date(item.createdAt).toLocaleString()}\nStatus: ${item.status}`
                              )
                            }
                            className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold inline-flex items-center gap-1 hover:underline"
                          >
                            <span>Receipt</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 4: PREFERENCES & WORKSPACE THEME */}
      {/* ======================================================== */}
      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Appearance & Notifications</h3>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Configure your interface theme and alert settings.</p>
          </div>

          <div className="space-y-6">
            {/* Theme Selector */}
            <div className="p-5 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Interface Theme</h4>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-0.5">
                  Choose Light, Dark, or follow your System settings.
                </p>
              </div>

              <div className="inline-flex items-center bg-slate-200/80 dark:bg-[#0B1120] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    theme === 'light'
                      ? 'bg-white text-[#0F172A] shadow-xs ring-1 ring-slate-300 dark:ring-transparent'
                      : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    theme === 'dark'
                      ? 'bg-[#111827] dark:bg-brand-600 text-white shadow-xs'
                      : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('system')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    theme === 'system'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>System</span>
                </button>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">Email Notifications</h4>

              {[
                { key: 'postPublished', label: 'Broadcast confirmations', desc: 'Receive emails when a scheduled or instant post is published.' },
                { key: 'publishFailures', label: 'Publishing failure warnings', desc: 'Get notified immediately if a social platform rejects an update.' },
                { key: 'monthlyReceipts', label: 'Monthly billing receipts', desc: 'Send official invoices upon monthly recurring renewal.' },
                { key: 'creditsAlert', label: 'Low credit balance alerts', desc: 'Notify me when remaining credit points fall below 10.' }
              ].map((item) => (
                <div
                  key={item.key}
                  className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.label}</h5>
                    <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] mt-0.5">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(e) => {
                      setNotifications({ ...notifications, [item.key]: e.target.checked });
                      showToast('Notification preference saved.');
                    }}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-[#E2E8F0] dark:border-[#334155]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 5: CONNECTED ACCOUNTS SHORTCUT */}
      {/* ======================================================== */}
      {activeTab === 'accounts' && (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Connected Social Channels</h3>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Overview of linked accounts across all 6 networks.</p>
            </div>
            <Link
              to="/accounts"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-soft transition-all flex items-center gap-1.5"
            >
              <span>Manage Channels</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { name: 'Facebook', bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60' },
              { name: 'Instagram', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60' },
              { name: 'LinkedIn', bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/60' },
              { name: 'YouTube', bg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60' },
              { name: 'TikTok', bg: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-900/60' },
              { name: 'Threads', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700' }
            ].map((p) => (
              <div key={p.name} className={`p-4 rounded-2xl border text-xs font-bold ${p.bg} text-center`}>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout Row */}
      <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] block">Sign Out</span>
          <span className="text-[#475569] dark:text-slate-400 text-[11px]">End active session on this device</span>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Change Plan Modal */}
      <ChangePlanModal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
        currentPlan={plan.type}
        currentSubscription={subscription}
        allPlans={subscriptionData?.allPlans || []}
        connectedAccountsCount={usage.connectedAccounts}
        onPlanChanged={handlePlanChanged}
      />

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        subscription={subscription}
        planName={plan.name}
        onCancelled={handleCancelled}
      />
    </div>
  );
}

export default SettingsPage;
