import React from 'react';
import { Menu } from 'lucide-react';

export function Topbar({ onMenuClick, title = 'SocialSync AI', subtitle = '' }) {
  return (
    <header className="min-h-16 py-3 bg-white dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#334155] sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 transition-colors">
      <div className="flex items-center gap-3 min-w-0 pr-3">
        <button
          onClick={onMenuClick}
          className="text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E293B] md:hidden shrink-0 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-0.5 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
