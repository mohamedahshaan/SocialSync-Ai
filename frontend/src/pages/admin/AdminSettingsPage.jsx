import React from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  ShieldCheck,
  Key,
  Users,
  Server,
  Database,
  Lock,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function AdminSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">
            Admin Governance & Platform Settings
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            System Control
          </span>
        </div>
        <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
          Review administrative access privileges, security guardrails, and centralized SaaS configuration.
        </p>
      </div>

      {/* Admin Profile & Role Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#334155]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">{user?.name}</h3>
              <p className="text-xs text-[#475569] dark:text-slate-400 font-mono">{user?.email}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
            {user?.role || 'ADMIN'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Access Authority</span>
            <strong className="text-[#0F172A] dark:text-white">
              {user?.role === 'SUPER_ADMIN' ? 'Full Unrestricted Access' : 'Role-Based Privileges'}
            </strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Session Security</span>
            <strong className="text-emerald-600 dark:text-emerald-400">Version-Controlled JWT</strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Content Isolation</span>
            <strong className="text-blue-600 dark:text-blue-400">Strict Phase 9.2 Privacy Active</strong>
          </div>
        </div>
      </div>

      {/* Governance & RBAC Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link
          to="/admin/administrators"
          className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-soft hover:border-blue-500/50 transition-all group cursor-pointer block"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A] dark:text-white group-hover:text-blue-600 transition-colors">
                  Administrator Team & RBAC
                </h4>
                <p className="text-xs text-[#475569] dark:text-slate-400">
                  Invite administrators, assign granular roles, and manage permissions.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/admin/plans"
          className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-soft hover:border-purple-500/50 transition-all group cursor-pointer block"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A] dark:text-white group-hover:text-purple-600 transition-colors">
                  Plans & Monetization Central
                </h4>
                <p className="text-xs text-[#475569] dark:text-slate-400">
                  Configure packages, feature switches, promotions, and credit costs.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Security Policies Overview */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-4">
        <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Active Security Guardrails</h3>
        <div className="space-y-2 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#0F172A] dark:text-white block">Last Super Admin Protection</strong>
              <span className="text-slate-500 dark:text-slate-400">
                The platform enforces a backend validation rule preventing the demotion, suspension, or deletion of the last remaining Super Administrator.
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#0F172A] dark:text-white block">Mandatory User Content Privacy (Phase 9.2)</strong>
              <span className="text-slate-500 dark:text-slate-400">
                Post captions, text, drafts, and uploaded media are strictly omitted from admin query projections and dashboard views to safeguard user privacy.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsPage;
