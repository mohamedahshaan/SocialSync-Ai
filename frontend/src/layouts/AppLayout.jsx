import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Topbar } from '../components/common/Topbar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageInfo = (pathname) => {
    if (pathname.startsWith('/create-post')) {
      return {
        title: 'Create & Orchestrate Post',
        subtitle: 'Write once. Publish everywhere. Reach your audience across all major platforms.'
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
    if (pathname.startsWith('/posts')) {
      return {
        title: 'Post Publishing History',
        subtitle: 'Monitor and audit multi-platform delivery statuses and execution logs.'
      };
    }
    if (pathname.startsWith('/analytics')) {
      return {
        title: 'Performance & Analytics',
        subtitle: 'Real metrics derived from your multi-platform database records.'
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
        title: 'Settings & Account Management',
        subtitle: 'Manage your personal profile, security credentials, active subscription, and preferences.'
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
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
