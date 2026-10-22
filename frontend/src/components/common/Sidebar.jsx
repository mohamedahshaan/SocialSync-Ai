import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  PlusCircle,
  Share2,
  ListFilter,
  BarChart3,
  Package,
  Settings,
  LogOut,
  X,
  Sparkles,
  BookmarkCheck,
  CalendarCheck2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CreditBalanceIndicator } from './CreditBalanceIndicator';
import { PlanUpgradeModal } from '../subscription/PlanUpgradeModal';
import { api } from '../../services/api';

export function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showScheduleUpgradeModal, setShowScheduleUpgradeModal] = useState(false);
  const [canUseScheduling, setCanUseScheduling] = useState(null);

  // Check subscription feature entitlement dynamically
  useEffect(() => {
    let isMounted = true;
    api.get('/subscriptions/features')
      .then((res) => {
        if (isMounted && res?.data?.canUseScheduling !== undefined) {
          setCanUseScheduling(Boolean(res.data.canUseScheduling));
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [user?.plan, user?.subscription?.status]);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isSubscriptionActive = isSuperAdmin || !user?.subscription || (
    !['EXPIRED', 'CANCELLED', 'PAYMENT_FAILED', 'PAST_DUE'].includes(user?.subscription?.status) &&
    (!user?.subscription?.currentPeriodEnd || new Date(user?.subscription?.currentPeriodEnd) > new Date() || user?.subscription?.status === 'ACTIVE' || user?.subscription?.status === 'TRIALING')
  );

  const userHasScheduling = isSuperAdmin || (canUseScheduling !== null
    ? canUseScheduling
    : (user?.plan !== 'FREE' && isSubscriptionActive));

  // Navigation: 1. Create Post, 2. Scheduled Posts, 3. Drafts, 4. Connect Accounts, 5. Post History, 6. Analytics, 7. Packages, 8. Settings
  const navigation = [
    { name: 'Create Post', to: '/create-post', icon: PlusCircle },
    { name: 'Scheduled Posts', to: '/scheduled', icon: CalendarCheck2, isScheduleFeature: true },
    { name: 'Drafts', to: '/drafts', icon: BookmarkCheck },
    { name: 'Connect Accounts', to: '/accounts', icon: Share2 },
    { name: 'Post History', to: '/posts', icon: ListFilter },
    { name: 'Analytics', to: '/analytics', icon: BarChart3 },
    { name: 'Packages', to: '/packages', icon: Package },
    { name: 'Settings', to: '/settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity animate-fade-in md:hidden"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar Container: #FFFFFF in Light Mode, #080D19 in Dark Mode */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#080D19] border-r border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col transition-all duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8F0] dark:border-[#334155]">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="SocialSync AI"
              className="w-9 h-9 rounded-xl object-contain drop-shadow-md shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent block leading-tight font-heading">
                SocialSync AI
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                Connect • Create • Publish
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white p-1 md:hidden transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={(e) => {
                  if (item.isScheduleFeature && !userHasScheduling) {
                    e.preventDefault();
                    setShowScheduleUpgradeModal(true);
                    return;
                  }
                  onClose?.();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-soft font-semibold'
                      : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B]/70'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          {/* Admin Console Switcher for Super Admin & Admin Users */}
          {['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'].includes(user?.role) && (
            <div className="pt-2 mt-2 border-t border-[#E2E8F0] dark:border-[#334155]">
              <NavLink
                to="/admin/users"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/70 dark:border-indigo-800/60 shadow-2xs'
                  }`
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span className="truncate">Admin Console</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-200/80 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 shrink-0">
                  {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                </span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* Dynamic Circular Credit Balance & Plan Indicator */}
        <div className="px-4 pb-2">
          <CreditBalanceIndicator onClose={onClose} />
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50/60 dark:bg-[#080D19] transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold shrink-0 overflow-hidden">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0) || 'U'
                )}
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-[#0F172A] dark:text-white truncate">
                    {user?.name || 'Creator'}
                  </p>
                  {['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'].includes(user?.role) && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                      {user?.role === 'SUPER_ADMIN' ? 'Admin' : 'Staff'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#475569] dark:text-slate-400 truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={logout}
                title="Log out"
                className="text-[#475569] dark:text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-[#1E293B] p-2 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Upgrade modal for Schedule feature */}
      <PlanUpgradeModal
        isOpen={showScheduleUpgradeModal}
        onClose={() => setShowScheduleUpgradeModal(false)}
        featureName="Schedule"
      />
    </>
  );
}

export default Sidebar;
