import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Share2,
  ListFilter,
  BarChart3,
  Settings,
  LogOut,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Create Post', to: '/create-post', icon: PlusCircle },
    { name: 'Connected Accounts', to: '/accounts', icon: Share2 },
    { name: 'Post History', to: '/posts', icon: ListFilter },
    { name: 'Analytics', to: '/analytics', icon: BarChart3 },
    { name: 'Settings', to: '/settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block leading-none">
                SOCIALFLOW <span className="text-brand-400">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                Publish Everywhere
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 md:hidden"
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
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Logout Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-brand-300 font-bold shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Creator'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
