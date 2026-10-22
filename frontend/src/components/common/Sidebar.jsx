import React from 'react';
import { NavLink } from 'react-router-dom';
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
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  // Navigation: 1. Create Post (Main interface), 2. Connect Accounts, 3. Post History, 4. Analytics, 5. Packages, 6. Settings
  const navigation = [
    { name: 'Create Post', to: '/create-post', icon: PlusCircle },
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
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-[#0F172A] dark:text-white block leading-none">
                SOCIALSYNC <span className="text-cyan-500 dark:text-cyan-400">AI</span>
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase mt-0.5">
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
                onClick={onClose}
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
        </nav>

        {/* Plan & Credits Summary Card */}
        <div className="px-4 pb-2">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between transition-colors">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400 block">
                Active Plan
              </span>
              <span className="text-xs font-black text-brand-600 dark:text-cyan-400">
                {user?.plan || 'Free'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400 block">
                Credits
              </span>
              <span className="text-xs font-black text-[#0F172A] dark:text-white">
                {user?.credits ?? 200}
              </span>
            </div>
          </div>
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50/60 dark:bg-[#080D19] transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-[#0F172A] dark:text-white truncate">
                  {user?.name || 'Creator'}
                </p>
                <p className="text-[11px] text-[#475569] dark:text-slate-400 truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                title={resolvedTheme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
                aria-label="Toggle theme"
                className="text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B] p-2 rounded-lg transition-colors"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
              </button>
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
    </>
  );
}

export default Sidebar;
