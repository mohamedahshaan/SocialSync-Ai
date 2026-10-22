import React, { useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  LayoutDashboard,
  CreditCard,
  Layers,
  History,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Directory', to: '/admin/users', icon: Users },
    { name: 'Plans & Limits', to: '/admin/plans', icon: Layers },
    { name: 'Payments', to: '/admin/payments', icon: CreditCard },
    { name: 'Credit Ledger', to: '/admin/transactions', icon: History }
  ];

  const getPageTitle = (pathname) => {
    if (pathname === '/admin/dashboard') return 'Administration Command Center';
    if (pathname === '/admin/users') return 'User Directory & Governance';
    if (pathname.startsWith('/admin/users/')) return 'Individual User Profile & Audit';
    if (pathname === '/admin/plans') return 'Platform Plan Configurations';
    if (pathname === '/admin/payments') return 'Verified & Pending Payments';
    if (pathname === '/admin/transactions') return 'Global Credit Transaction Ledger';
    return 'SocialSync AI Administration';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex transition-colors duration-200">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden"
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
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-glow">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-[#0F172A] dark:text-white block leading-none">
                SOCIALSYNC <span className="text-cyan-600 dark:text-cyan-400">ADMIN</span>
              </span>
              <span className="text-[10px] text-[#475569] dark:text-slate-400 font-medium">
                Governance Portal
              </span>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="text-[#475569] dark:text-slate-400 hover:text-cyan-600 dark:hover:text-white p-1 md:hidden"
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
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md font-semibold'
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
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-slate-300 hover:text-cyan-600 dark:hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Exit to User App
            </span>
            <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          </Link>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 dark:border-cyan-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-[#0F172A] dark:text-white truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-[#475569] dark:text-slate-400 truncate">{user?.email}</p>
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
