import React from 'react';
import {
  Facebook,
  Instagram,
  Linkedin,
  AtSign,
  Check,
  AlertCircle,
  Video,
  Youtube
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function PlatformSelector({
  connectedAccounts = [],
  selectedPlatforms = [],
  onChange
}) {
  const platformMeta = {
    FACEBOOK: { name: 'Facebook', icon: Facebook, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/50' },
    INSTAGRAM: { name: 'Instagram', icon: Instagram, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/50' },
    LINKEDIN: { name: 'LinkedIn', icon: Linkedin, color: 'text-sky-700 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-900/50' },
    THREADS: { name: 'Threads', icon: AtSign, color: 'text-black dark:text-white bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700' },
    TIKTOK: { name: 'TikTok', icon: Video, color: 'text-pink-600 bg-pink-50 dark:bg-pink-950/50 border-pink-200 dark:border-pink-900/50' },
    YOUTUBE: { name: 'YouTube', icon: Youtube, color: 'text-red-600 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900/50' }
  };

  const togglePlatform = (account) => {
    const isSelected = selectedPlatforms.some(p => p.socialAccountId === account.id);
    if (isSelected) {
      onChange(selectedPlatforms.filter(p => p.socialAccountId !== account.id));
    } else {
      onChange([...selectedPlatforms, { platform: account.platform, socialAccountId: account.id }]);
    }
  };

  if (connectedAccounts.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 p-4 text-center">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">No social accounts connected</p>
        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
          You need to connect at least one social media account before publishing.
        </p>
        <Link
          to="/accounts"
          className="inline-block mt-3 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
        >
          Connect Accounts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-2 transition-colors">
        Target Platforms
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {connectedAccounts.map((account) => {
          const isSelected = selectedPlatforms.some(p => p.socialAccountId === account.id);
          const meta = platformMeta[account.platform] || platformMeta.FACEBOOK;
          const Icon = meta.icon;

          return (
            <div
              key={account.id}
              onClick={() => togglePlatform(account)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                isSelected
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 shadow-xs ring-1 ring-brand-500/30'
                  : 'border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-[#1E293B]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg border ${meta.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">{meta.name}</p>
                  <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] truncate">
                    {account.accountName} {account.accountUsername ? `(${account.accountUsername})` : ''}
                  </p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  isSelected
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B]'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlatformSelector;
