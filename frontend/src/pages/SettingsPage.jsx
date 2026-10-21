import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  User,
  Key,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  Receipt,
  Check,
  AlertCircle,
  Copy,
  Mail,
  Lock,
  Camera,
  Upload,
  Trash2,
  Loader2,
  ShieldCheck,
  Zap,
  Layers,
  RotateCcw,
  Smartphone,
  ShieldAlert,
  Bell,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { ChangePlanModal } from '../components/subscription/ChangePlanModal';
import { CancelSubscriptionModal } from '../components/subscription/CancelSubscriptionModal';

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const validTabs = ['profile', 'security', 'subscription', 'preferences'];
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(initialTab) ? initialTab : 'profile'
  );

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  // Account Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteReason, setDeleteReason] = useState('NO_LONGER_NEEDED');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Lock background scroll and close on Escape key when delete modal is open
  useEffect(() => {
    if (!isDeleteModalOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !deleteLoading) {
        setIsDeleteModalOpen(false);
        setDeleteError('');
        setDeletePassword('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDeleteModalOpen, deleteLoading]);

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

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Avatar Upload Handler
  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be under 5MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('media', file);

    setAvatarUploading(true);
    try {
      const uploadRes = await api.post('/uploads/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = uploadRes.mediaUrl || uploadRes.fullUrl || uploadRes.data?.url || uploadRes.data?.mediaUrl;

      if (!imageUrl) {
        throw new Error('Upload succeeded but no image URL was returned.');
      }

      const profileRes = await api.put('/auth/profile', { profileImage: imageUrl });
      if (profileRes.success) {
        updateUser({ profileImage: imageUrl });
        showToast('Profile picture updated successfully!');
      } else {
        throw new Error(profileRes.message || 'Failed to update profile picture');
      }
    } catch (err) {
      showToast(err.message || 'Failed to upload profile picture', 'error');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove Avatar Handler
  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    try {
      const profileRes = await api.put('/auth/profile', { profileImage: '' });
      if (profileRes.success) {
        updateUser({ profileImage: '' });
        showToast('Profile picture removed.');
      } else {
        throw new Error(profileRes.message || 'Failed to remove profile picture');
      }
    } catch (err) {
      showToast(err.message || 'Failed to remove profile picture', 'error');
    } finally {
      setAvatarUploading(false);
    }
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
        updateUser({ name: name.trim() });
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
    if (!/[^a-zA-Z0-9]/.test(newPassword)) {
      showToast('New password must contain at least one symbol (e.g. !@#$%^&*)', 'error');
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

  // Permanent Account Deletion Handler
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await api.delete('/auth/delete-account', {
        data: {
          password: deletePassword,
          confirmation: deleteConfirmation,
          reason: deleteReason
        }
      });
      if (res.success) {
        setIsDeleteModalOpen(false);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (updateUser) updateUser(null);
        navigate('/login?account_deleted=true');
      } else {
        setDeleteError(res.message || 'Failed to delete account.');
      }
    } catch (err) {
      setDeleteError(err?.response?.data?.message || err?.message || 'Failed to delete account.');
    } finally {
      setDeleteLoading(false);
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

  // Password Strength Calculator
  const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, label: 'Not entered', color: 'bg-slate-200 dark:bg-slate-700', width: 'w-0' };
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (pw.length >= 10) score += 1;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', width: 'w-1/4' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500', width: 'w-2/4' };
    if (score === 3 || score === 4) return { score: 3, label: 'Strong', color: 'bg-[#3B5BFF]', width: 'w-3/4' };
    return { score: 5, label: 'Very Strong', color: 'bg-emerald-500', width: 'w-full' };
  };

  const pwStrength = getPasswordStrength(newPassword);

  const plan = subscriptionData?.plan || {
    name: user?.plan || 'Free',
    type: user?.plan || 'FREE',
    priceLkr: 0,
    priceUsd: 0,
    credits: 200,
    maxConnectedAccounts: 2,
    maxTargetPlatformsPerPost: 2
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

  const targetLimit = plan.maxTargetPlatformsPerPost || (plan.type === 'PROFESSIONAL' ? 6 : plan.type === 'CREATOR' ? 4 : 2);
  const maxCreditsForPlan = plan.type === 'PROFESSIONAL' ? 1500 : plan.type === 'CREATOR' ? 500 : 200;
  const currentCredits = user?.credits ?? 200;
  const creditsPercent = Math.min(100, Math.max(0, Math.round((currentCredits / maxCreditsForPlan) * 100)));

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Toolbar: Navigation Tabs & Plan Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-2 border-b border-[#E2E8F0] dark:border-[#334155]">
        {/* Navigation Tabs Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-100 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] scrollbar-none">
          {[
            { key: 'profile', label: 'Profile Details', icon: User },
            { key: 'security', label: 'Login & Security', icon: Key },
            { key: 'subscription', label: 'Plan & Subscription', icon: CreditCard },
            { key: 'preferences', label: 'Preferences', icon: Sun }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabSwitch(tab.key)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] shadow-xs border border-[#E2E8F0] dark:border-[#334155]'
                    : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#3B5BFF] dark:text-[#818cf8]' : 'text-[#475569] dark:text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Plan Badges */}
        <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#3B5BFF]/10 text-[#3B5BFF] dark:text-[#818cf8] border border-[#3B5BFF]/20 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#3B5BFF] dark:text-[#818cf8]" />
            <span>{plan.name || 'Free'} Plan</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active</span>
          </span>
        </div>
      </div>

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
            className="font-bold text-xs hover:underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: PROFILE & ACCOUNT DETAILS */}
      {/* ======================================================== */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Personal Information</h3>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Update your public profile, photo, and account identity.</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Profile Picture Upload Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-[#E2E8F0] dark:border-[#334155]">
              <div className="relative group self-start sm:self-auto shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#3B5BFF] via-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/25 shrink-0 ring-4 ring-[#3B5BFF]/10 overflow-hidden">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name || 'User Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.name?.charAt(0) || 'U'
                  )}
                </div>

                {/* Hover Camera Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 rounded-2xl bg-slate-900/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-2xs"
                  title="Upload profile picture"
                >
                  {avatarUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-bold">Change</span>
                    </>
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">{user?.name}</p>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#3B5BFF]/10 text-[#3B5BFF] dark:text-[#818cf8] border border-[#3B5BFF]/20 shrink-0">
                    {user?.role || 'Creator'}
                  </span>
                </div>
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </p>

                {/* Profile Picture Actions */}
                <div className="flex items-center gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-[#0F172A] dark:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    {avatarUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3B5BFF]" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#3B5BFF] dark:text-[#818cf8]" />
                    )}
                    <span>{avatarUploading ? 'Uploading...' : 'Upload Photo'}</span>
                  </button>

                  {user?.profileImage && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={avatarUploading}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                  <span className="text-[11px] text-slate-400 hidden sm:inline ml-1">
                    JPG, PNG or WebP up to 5MB
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]/30 focus:border-[#3B5BFF] font-medium text-[#0F172A] dark:text-[#F8FAFC] transition-colors"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-100 dark:bg-[#1E293B]/60 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-[#475569] dark:text-slate-400 cursor-not-allowed font-medium"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#475569] dark:text-slate-400 block mb-0.5">Account ID</span>
                  <code className="font-mono text-[#0F172A] dark:text-[#F8FAFC] text-[11px] select-all">{user?.id}</code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Copy Account ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] text-xs">
                <span className="font-semibold text-[#475569] dark:text-slate-400 block mb-0.5">Member Since</span>
                <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Active Member'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              {name !== user?.name && (
                <button
                  type="button"
                  onClick={() => setName(user?.name || '')}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
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
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Ensure your account is protected with a secure password and credential hygiene.</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">Current Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-10 py-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]/30 focus:border-[#3B5BFF] font-medium text-[#0F172A] dark:text-[#F8FAFC] transition-colors"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-10 py-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]/30 focus:border-[#3B5BFF] font-medium text-[#0F172A] dark:text-[#F8FAFC] transition-colors"
                  placeholder="Minimum 6 characters with a symbol"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                At least 6 characters with a symbol
              </p>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="space-y-1.5 pt-2 animate-fade-in">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#475569] dark:text-slate-400 font-medium">Strength:</span>
                    <span className="font-bold text-[#0F172A] dark:text-white">{pwStrength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${pwStrength.color} ${pwStrength.width} transition-all duration-300 rounded-full`} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]/30 focus:border-[#3B5BFF] font-medium text-[#0F172A] dark:text-[#F8FAFC] transition-colors"
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            {/* Validation Checklist Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors ${
                  newPassword.length >= 6
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>At least 6 characters</span>
              </span>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors ${
                  newPassword && newPassword === confirmPassword
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Passwords match</span>
              </span>
            </div>

            <div className="pt-3">
              <Button type="submit" isLoading={securitySaving} variant="primary">
                Update Password
              </Button>
            </div>
          </form>

          {/* Security Guarantee Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between text-xs text-[#475569] dark:text-[#CBD5E1]">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Passwords are cryptographically salted with bcrypt (10 rounds). Tokens are signed via standard JWT with HTTP-only session governance.</span>
            </div>
          </div>

          {/* Danger Zone: Permanent Account Deletion */}
          <div className="pt-6 border-t border-rose-200/60 dark:border-rose-950/60 space-y-3">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">Danger Zone</h4>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h5 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">Permanently Delete Account</h5>
                <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-0.5 leading-relaxed">
                  Permanently delete your user profile, social connections, post drafts, and scheduled queues. This action is irreversible.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteError('');
                  setDeletePassword('');
                  setDeleteConfirmation('');
                  setIsDeleteModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: CURRENT PLAN & SUBSCRIPTION */}
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
                onClick={() => navigate('/packages')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-sm transition-colors cursor-pointer"
              >
                Reactivate / Switch Plan
              </button>
            </div>
          )}

          {/* Primary Plan Card */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#334155]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
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
                  onClick={() => navigate('/packages')}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#3B5BFF] via-indigo-600 to-[#7C3AED] hover:opacity-95 text-white text-xs font-bold shadow-soft transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Change Plan</span>
                </button>
                {isPaid && !isCancellationScheduled && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[#475569] dark:text-[#CBD5E1] hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel Auto-Renew
                  </button>
                )}
              </div>
            </div>

            {/* Visual Credit Allowance Progress Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Monthly Credit Capacity</span>
                </span>
                <span className="font-mono font-bold text-[#3B5BFF] dark:text-[#818cf8]">
                  {currentCredits} / {maxCreditsForPlan} credits ({creditsPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 transition-all duration-500"
                  style={{ width: `${creditsPercent}%` }}
                />
              </div>
            </div>

            {/* 4-Metric Quota & Limits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1">
                <span className="font-semibold text-[#475569] dark:text-[#CBD5E1] block">Available Credits</span>
                <span className="text-2xl font-black text-[#3B5BFF] dark:text-cyan-400">{user?.credits ?? 200}</span>
                <span className="text-[11px] text-[#475569] dark:text-slate-400 block">Deducted per broadcast</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1">
                <span className="font-semibold text-[#475569] dark:text-[#CBD5E1] block">Connected Channels</span>
                <span className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
                  {usage.connectedAccounts} / {plan.maxConnectedAccounts || 2}
                </span>
                <span className="text-[11px] text-[#475569] dark:text-slate-400 block">Max accounts on {plan.name}</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1">
                <span className="font-semibold text-[#475569] dark:text-[#CBD5E1] block">Target Platform Limit</span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {targetLimit} platforms
                </span>
                <span className="text-[11px] text-[#475569] dark:text-slate-400 block">Max per single post</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1">
                <span className="font-semibold text-[#475569] dark:text-[#CBD5E1] block">Next Renewal Date</span>
                <span className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">{nextBillingFormatted}</span>
                <span className="text-[11px] text-[#475569] dark:text-slate-400 block">
                  {isPaid ? 'Automatic renewal' : 'Free tier never expires'}
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
              <Receipt className="w-5 h-5 text-[#3B5BFF] dark:text-[#818cf8]" />
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
                              item.status === 'COMPLETED' || item.status === 'VERIFIED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : item.status === 'PENDING'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
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
                            className="text-[#3B5BFF] dark:text-[#818cf8] hover:text-blue-700 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
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
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-8 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Appearance & Notifications</h3>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Configure your visual interface theme and workspace alerts.</p>
          </div>

          <div className="space-y-6">
            {/* Visual Theme Selection Cards */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
                Interface Color Scheme
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    key: 'light',
                    label: 'Light Mode',
                    desc: 'Crisp, high-contrast light surfaces',
                    icon: Sun,
                    accent: 'text-amber-500'
                  },
                  {
                    key: 'dark',
                    label: 'Dark Mode',
                    desc: 'Deep slate backgrounds for low glare',
                    icon: Moon,
                    accent: 'text-indigo-400'
                  },
                  {
                    key: 'system',
                    label: 'System Sync',
                    desc: 'Match your operating system theme',
                    icon: Monitor,
                    accent: 'text-[#3B5BFF]'
                  }
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = theme === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => handleThemeChange(t.key)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex items-start gap-3.5 ${
                        isSelected
                          ? 'border-[#3B5BFF] bg-[#3B5BFF]/5 dark:bg-[#3B5BFF]/10 ring-2 ring-[#3B5BFF]/20 shadow-xs'
                          : 'border-[#E2E8F0] dark:border-[#334155] bg-slate-50/70 dark:bg-[#1E293B]/70 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-[#3B5BFF] text-white shadow-sm' : 'bg-slate-200/80 dark:bg-slate-800 ' + t.accent}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-[#0F172A] dark:text-white truncate">{t.label}</h4>
                          {isSelected && (
                            <span className="w-4.5 h-4.5 rounded-full bg-[#3B5BFF] text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-0.5 leading-relaxed">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email Notifications with Modern Toggle Switches */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
                Email Notifications &amp; Alerts
              </h4>

              {[
                { key: 'postPublished', label: 'Broadcast confirmations', desc: 'Receive instant confirmation emails whenever a post is published.' },
                { key: 'publishFailures', label: 'Publishing failure alerts', desc: 'Get notified immediately if a social platform rejects an update or token expires.' },
                { key: 'monthlyReceipts', label: 'Monthly billing receipts', desc: 'Receive official invoice receipts upon each monthly subscription renewal.' },
                { key: 'creditsAlert', label: 'Low credit balance alerts', desc: 'Send a notification when remaining monthly credits fall below 15 points.' }
              ].map((item) => (
                <div
                  key={item.key}
                  className="p-4 bg-slate-50 dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between gap-4"
                >
                  <div>
                    <h5 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.label}</h5>
                    <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] mt-0.5">{item.desc}</p>
                  </div>

                  {/* Modern Accessible iOS/Tailwind Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifications[item.key]}
                    onClick={() => {
                      const nextState = !notifications[item.key];
                      setNotifications({ ...notifications, [item.key]: nextState });
                      showToast(`${item.label} ${nextState ? 'enabled' : 'disabled'}.`);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#3B5BFF]/30 ${
                      notifications[item.key] ? 'bg-[#3B5BFF]' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        notifications[item.key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* Permanent Account Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 transition-opacity animate-fade-in"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)'
            }}
            onClick={!deleteLoading ? () => setIsDeleteModalOpen(false) : undefined}
            aria-hidden="true"
          />

          <div
            className="relative z-10 w-full rounded-3xl bg-white dark:bg-[#111827] p-6 text-left shadow-2xl transition-all border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col overflow-hidden animate-scale-up"
            style={{
              width: 'min(480px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-modal-title" className="text-base font-bold text-[#0F172A] dark:text-white">
                  Permanently Delete Your Account?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-0.5">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 space-y-1.5">
                <p className="font-semibold">What happens when you delete your account:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700 dark:text-rose-300">
                  <li>Your user profile and credentials are permanently purged.</li>
                  <li>All connected social accounts and scheduled posts will be removed.</li>
                  <li>Any active paid subscription is cancelled immediately.</li>
                  <li>Historical legal/accounting payment invoices remain anonymized.</li>
                </ul>
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <form onSubmit={handleDeleteAccount} className="space-y-3.5 pt-1">
                <div>
                  <label htmlFor="delete-account-password" className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                    Confirm with your password
                  </label>
                  <input
                    id="delete-account-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label htmlFor="delete-account-reason" className="block text-xs font-bold text-[#0F172A] dark:text-white mb-1">
                    Reason for leaving (optional)
                  </label>
                  <select
                    id="delete-account-reason"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="NO_LONGER_NEEDED">I no longer need social publishing</option>
                    <option value="TOO_EXPENSIVE">Pricing / Subscription cost</option>
                    <option value="SWITCHED_PLATFORM">Switched to another platform</option>
                    <option value="TECHNICAL_ISSUES">Encountered technical issues</option>
                    <option value="TEMPORARY">Taking a temporary break</option>
                    <option value="OTHER">Other reason</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeleteError('');
                      setDeletePassword('');
                    }}
                    disabled={deleteLoading}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {deleteLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting Account...</span>
                      </>
                    ) : (
                      <span>Permanently Delete</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
