import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Topbar } from '../components/common/Topbar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard Overview';
    if (pathname.startsWith('/create-post')) return 'Create New Post';
    if (pathname.startsWith('/accounts')) return 'Connected Social Accounts';
    if (pathname.startsWith('/posts/') && pathname !== '/posts') return 'Post Details & Platform Status';
    if (pathname.startsWith('/posts')) return 'Post Publishing History';
    if (pathname.startsWith('/analytics')) return 'Performance & Analytics';
    if (pathname.startsWith('/settings')) return 'Settings & API Configuration';
    return 'SocialFlow AI';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          title={getPageTitle(location.pathname)}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
