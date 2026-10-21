import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Sidebar } from '../components/common/Sidebar';
import { Topbar } from '../components/common/Topbar';
import { HeaderProvider, useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';

function AppLayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const { headerConfig } = useHeader();

  const getPageInfo = (pathname) => {
    if (pathname.startsWith('/create-post')) {
      return {
        title: 'Create & Orchestrate Post',
        subtitle: 'Write once. Publish everywhere. Reach your audience across all major platforms.'
      };
    }
    if (pathname.startsWith('/drafts')) {
      return {
        title: 'Saved Drafts',
        subtitle: 'Continue editing your unpublished posts or publish them when ready.'
      };
    }
    if (pathname.startsWith('/accounts')) {
      return {
        title: 'Connected Social Accounts',
        subtitle: 'Connect and manage your social channels and publishing destinations.'
      };
    }
    if (pathname.startsWith('/posts/') && pathname !== '/posts') {
      return {
        title: 'Post Details & Audit',
        subtitle: 'Platform delivery logs, timestamps, and multi-channel retry controls.'
      };
    }
    if (pathname.startsWith('/scheduled')) {
      return {
        title: 'Scheduled Posts',
        subtitle: 'Manage your upcoming and automated posts.'
      };
    }
    if (pathname.startsWith('/posts')) {
      return {
        title: 'Post Publishing History',
        subtitle: 'Monitor and audit multi-platform delivery statuses and execution logs.'
      };
    }
    if (pathname.startsWith('/analytics')) {
      return {
        title: 'Performance & Analytics',
        subtitle: 'Track publishing results and delivery performance across your connected platforms.'
      };
    }
    if (pathname.startsWith('/packages')) {
      return {
        title: 'Subscription Packages & Tiers',
        subtitle: 'Explore our subscription tiers. Upgrade or switch anytime with prorated billing.'
      };
    }
    if (pathname.startsWith('/settings')) {
      return {
        title: 'Settings',
        subtitle: 'Manage your profile, security, subscription, and workspace preferences.'
      };
    }
    return {
      title: 'SocialSync AI',
      subtitle: ''
    };
  };

  const pageInfo = getPageInfo(location.pathname);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          title={headerConfig?.title ?? pageInfo.title}
          subtitle={headerConfig?.subtitle ?? pageInfo.subtitle}
          badge={headerConfig?.badge}
          actions={
            <div className="flex items-center gap-2">
              {['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'].includes(user?.role) && (
                <Link
                  to="/admin/users"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-indigo-950/60 dark:to-purple-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 transition-all shadow-2xs"
                  title="Open Admin Console"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline">Admin Console</span>
                  <span className="sm:hidden">Admin</span>
                </Link>
              )}
              {headerConfig?.actions}
            </div>
          }
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <HeaderProvider>
      <AppLayoutInner />
    </HeaderProvider>
  );
}

export default AppLayout;
