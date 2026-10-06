import React from 'react';
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
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
    FACEBOOK: { name: 'Facebook', icon: Facebook, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    INSTAGRAM: { name: 'Instagram', icon: Instagram, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    LINKEDIN: { name: 'LinkedIn', icon: Linkedin, color: 'text-sky-700 bg-sky-50 border-sky-200' },
    X: { name: 'X', icon: Twitter, color: 'text-slate-900 bg-slate-100 border-slate-300' },
    THREADS: { name: 'Threads', icon: AtSign, color: 'text-black bg-slate-50 border-slate-300' },
    TIKTOK: { name: 'TikTok', icon: Video, color: 'text-pink-600 bg-pink-50 border-pink-200' },
    YOUTUBE: { name: 'YouTube', icon: Youtube, color: 'text-red-600 bg-red-50 border-red-200' }
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
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-center">
        <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-2" />
        <p className="text-xs font-semibold text-amber-900">No social accounts connected</p>
        <p className="text-[11px] text-amber-700 mt-0.5">
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
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Select Target Platforms
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
                  ? 'border-brand-500 bg-brand-50/50 shadow-xs ring-1 ring-brand-500/30'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg ${meta.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-800 truncate">{meta.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {account.accountName} {account.accountUsername ? `(${account.accountUsername})` : ''}
                  </p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  isSelected
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'border-slate-300 bg-white'
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
