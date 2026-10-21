import React from 'react';
import { Menu } from 'lucide-react';

export function Topbar({
  onMenuClick,
  title = 'SocialSync AI',
  subtitle = '',
  badge = null,
  actions = null,
  className = ''
}) {
  return (
    <header
      className={`h-16 px-4 sm:px-6 md:px-8 bg-white dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#334155] sticky top-0 z-30 flex items-center justify-between transition-colors ${className}`}
    >
      {/* Left: Mobile Menu Button + Title + Badge + Subtitle */}
      <div className="flex items-center gap-3 min-w-0 pr-4">
        <button
          onClick={onMenuClick}
          className="text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E293B] md:hidden shrink-0 transition-colors cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {title && (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-none truncate">
                {title}
              </h1>
              {badge && (
                <div className="shrink-0 flex items-center">
                  {typeof badge === 'string' || typeof badge === 'number' ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 leading-none">
                      {badge}
                    </span>
                  ) : (
                    badge
                  )}
                </div>
              )}
            </div>

            {subtitle && (
              <div className="text-[11px] sm:text-xs text-[#475569] dark:text-[#CBD5E1] mt-1 truncate leading-none">
                {subtitle}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Page-specific actions (e.g. + Schedule Post button) */}
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}

export default Topbar;
