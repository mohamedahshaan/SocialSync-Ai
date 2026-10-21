import React, { useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  CreditCard,
  Layers,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Gift,
  BarChart3,
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const navigation = [
    { name: 'Users & Access', to: '/admin/users', icon: Users },
    { name: 'Administrators & Roles', to: '/admin/administrators', icon: Shield },
    { name: 'Admin Audit', to: '/admin/audit', icon: ShieldCheck },
    { name: 'Plans & Monetization', to: '/admin/plans', icon: Layers },
    { name: 'Subscriptions & Payments', to: '/admin/payments', icon: CreditCard },
    { name: 'Analytics & Reports', to: '/admin/analytics', icon: BarChart3 },
    { name: 'Admin Settings', to: '/admin/settings', icon: Settings }
  ];

  const getPageTitle = (pathname) => {
    if (pathname === '/admin/users') return 'User Directory & Account Governance';
    if (pathname.startsWith('/admin/users/')) return 'User Account Profile & Diagnostics';
    if (pathname === '/admin/audit') return 'Administrator Audit Trail & Governance';
    if (pathname === '/admin/administrators') return 'Administrator Governance & RBAC';
    if (pathname === '/admin/plans') return 'Centralized Plans & Monetization';
    if (pathname === '/admin/promotions') return 'Promotional Offers & 1 Month Free Management';
    if (pathname === '/admin/payments') return 'Subscriptions & Transaction Records';
    if (pathname === '/admin/analytics') return 'Platform Analytics & Operational Reports';
    if (pathname === '/admin/transactions') return 'Credit Ledger & Balance Transactions';
    if (pathname === '/admin/settings') return 'Administrator Settings & Policies';
    return 'SocialSync AI Administration';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex transition-colors duration-200">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity animate-fade-in md:hidden"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#080D19] border-r border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-slate-200 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8F0] dark:border-[#334155]">
          <Link to="/admin/users" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="SocialSync AI"
              className="w-8 h-8 rounded-xl object-contain drop-shadow-sm shrink-0"
            />
            <div>
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent block leading-tight font-heading">
                SocialSync Admin
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                Governance Portal
              </span>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="text-[#475569] dark:text-slate-400 hover:text-[#3B5BFF] dark:hover:text-white p-1 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#3B5BFF] to-[#7C3AED] text-white shadow-md font-semibold'
                      : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Exit to App & Admin Profile */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#070d1e]/80 space-y-3">
          <Link
            to="/create-post"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 hover:text-[#3B5BFF] dark:hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-[#3B5BFF] dark:text-[#818cf8]" />
              Exit to User App
            </span>
            <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          </Link>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#3B5BFF]/10 dark:bg-[#3B5BFF]/20 text-[#3B5BFF] dark:text-[#818cf8] border border-[#3B5BFF]/20 dark:border-[#3B5BFF]/30 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0) || 'A'
                )}
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-[#0F172A] dark:text-white truncate">{user?.name || 'Administrator'}</p>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-[#3B5BFF]/10 text-[#3B5BFF] dark:text-[#818cf8] border border-[#3B5BFF]/20">
                    {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'SUPPORT_ADMIN' ? 'Support' : 'Admin'}
                  </span>
                  <p className="text-[10px] text-[#475569] dark:text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-900 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#334155] sticky top-0 z-30 flex items-center justify-between px-6 transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-white tracking-tight">
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              Admin Mode
            </span>
          </div>
        </header>

        {/* Outlet Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;
