import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Trash2,
  Plus
} from 'lucide-react';
import { Button } from './Button';
import { PlatformCircle } from '../public/PlatformIcon';

export function PlatformCard({
  platformKey,
  platformName,
  accounts = [],
  account = null,
  readiness,
  onConnect,
  onDisconnect,
  isDisconnecting = false,
  supportsMultiple = false
}) {
  const connectedAccounts = accounts && accounts.length > 0
    ? accounts
    : (account && account.status === 'CONNECTED' ? [account] : []);

  const isConnected = connectedAccounts.length > 0;
  const isConfigured = readiness?.isConfigured;
  const isComingSoon = readiness?.comingSoon;

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] p-5 shadow-soft hover:shadow-premium transition-all flex flex-col justify-between">
      <div>
        {/* Header with Icon and Status */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <PlatformCircle platform={platformKey} size="w-11 h-11" iconSize="w-5 h-5" rounded="rounded-xl" />
            <div>
              <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base">{platformName}</h3>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                {isComingSoon
                  ? 'In Development'
                  : (isConnected
                    ? (connectedAccounts.length > 1
                      ? `${connectedAccounts.length} Connected Pages`
                      : (connectedAccounts[0]?.accountName || 'Connected Channel'))
                    : (isConfigured ? 'Ready to Connect' : 'Setup Required'))}
              </p>
            </div>
          </div>

          <div>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : isComingSoon ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                <Clock className="w-3.5 h-3.5" />
                Coming Soon
              </span>
            ) : !isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                Config Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#334155]">
                Not Connected
              </span>
            )}
          </div>
        </div>

        {/* Account Details or Setup Notice */}
        <div className="my-4 min-h-[56px] flex flex-col justify-center">
          {isConnected ? (
            <div className="space-y-2.5">
              {connectedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="bg-slate-50/80 dark:bg-[#1E293B] rounded-xl p-3 border border-slate-100 dark:border-[#334155] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                        {acc.accountName}
                      </p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Connected
                      </span>
                    </div>
                    {acc.accountUsername && (
                      <p className="text-xs text-[#475569] dark:text-[#CBD5E1] font-mono truncate mt-0.5">
                        {acc.accountUsername}
                      </p>
                    )}
                  </div>

                  {connectedAccounts.length > 1 && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="shrink-0 text-xs px-2.5 py-1"
                      icon={Trash2}
                      isLoading={isDisconnecting}
                      onClick={() => onDisconnect(acc)}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : isComingSoon ? (
            <div className="bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800 rounded-xl p-3">
              <p className="text-xs text-purple-900 dark:text-purple-300 font-medium">
                {platformName} direct publishing is in active development.
              </p>
              <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">
                Google direct publishing will be supported in the next update.
              </p>
            </div>
          ) : !isConfigured ? (
            <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800 rounded-xl p-3">
              <p className="text-xs text-amber-900 dark:text-amber-300 font-medium">
                {platformName} integration is not configured yet.
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                Set developer client credentials in <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">.env</code>.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
              Link your official account to enable direct multi-platform scheduling and publishing.
            </p>
          )}
        </div>
      </div>

      {/* Action CTA Buttons */}
      <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#334155] mt-2 flex flex-col gap-2">
        {isConnected ? (
          <>
            {connectedAccounts.length === 1 && (
              <Button
                variant="danger"
                size="sm"
                className="w-full"
                icon={Trash2}
                isLoading={isDisconnecting}
                onClick={() => onDisconnect(connectedAccounts[0])}
              >
                Disconnect
              </Button>
            )}

            {supportsMultiple && isConfigured && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                icon={Plus}
                onClick={() => onConnect(platformKey, true)}
              >
                Connect Another {platformKey === 'FACEBOOK' ? 'Page' : 'Account'}
              </Button>
            )}
          </>
        ) : (
          <Button
            variant={isComingSoon ? "secondary" : (!isConfigured ? "secondary" : "primary")}
            size="sm"
            className="w-full"
            icon={ExternalLink}
            onClick={() => onConnect(platformKey, isConfigured)}
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

export default PlatformCard;
