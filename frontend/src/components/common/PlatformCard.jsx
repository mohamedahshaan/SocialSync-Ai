import React from 'react';
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  AtSign,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Video
} from 'lucide-react';
import { Button } from './Button';

export function PlatformCard({
  platformKey,
  platformName,
  account,
  readiness,
  onConnect,
  onDisconnect,
  isDisconnecting = false
}) {
  const isConnected = account && account.status === 'CONNECTED';
  const isConfigured = readiness?.isConfigured;

  const platformIcons = {
    FACEBOOK: { icon: Facebook, bg: 'bg-blue-600', text: 'text-blue-600' },
    INSTAGRAM: { icon: Instagram, bg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600', text: 'text-rose-600' },
    LINKEDIN: { icon: Linkedin, bg: 'bg-sky-700', text: 'text-sky-700' },
    X: { icon: Twitter, bg: 'bg-slate-900', text: 'text-slate-900' },
    THREADS: { icon: AtSign, bg: 'bg-black', text: 'text-black' },
    TIKTOK: { icon: Video, bg: 'bg-gradient-to-r from-cyan-500 via-black to-pink-500', text: 'text-pink-600' }
  };

  const meta = platformIcons[platformKey] || platformIcons.FACEBOOK;
  const Icon = meta.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft hover:shadow-premium transition-all flex flex-col justify-between">
      <div>
        {/* Header with Icon and Status */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${meta.bg} flex items-center justify-center text-white shadow-xs`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{platformName}</h3>
              <p className="text-xs text-slate-400">Official OAuth 2.0</p>
            </div>
          </div>

          <div>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : !isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                Config Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Not Connected
              </span>
            )}
          </div>
        </div>

        {/* Account Details or Setup Notice */}
        <div className="my-4 min-h-[56px] flex flex-col justify-center">
          {isConnected ? (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {account.accountName}
              </p>
              {account.accountUsername && (
                <p className="text-xs text-slate-500 font-mono truncate">
                  {account.accountUsername}
                </p>
              )}
            </div>
          ) : !isConfigured ? (
            <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3">
              <p className="text-xs text-amber-900 font-medium">
                {platformName} OAuth is not configured yet.
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Set developer client credentials in <code className="font-mono bg-amber-100 px-1 rounded">.env</code>.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Link your official account to enable direct multi-platform publishing.
            </p>
          )}
        </div>
      </div>

      {/* Action CTA Button */}
      <div className="pt-2 border-t border-slate-100 mt-2">
        {isConnected ? (
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            icon={Trash2}
            isLoading={isDisconnecting}
            onClick={() => onDisconnect(account)}
          >
            Disconnect {platformName}
          </Button>
        ) : !isConfigured ? (
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-amber-800 bg-amber-50/50 hover:bg-amber-100/50 border-amber-200"
            icon={ExternalLink}
            onClick={() => onConnect(platformKey, false)}
          >
            Setup Guide & Requirements
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            icon={ExternalLink}
            onClick={() => onConnect(platformKey, true)}
          >
            Connect {platformName}
          </Button>
        )}
      </div>
    </div>
  );
}
