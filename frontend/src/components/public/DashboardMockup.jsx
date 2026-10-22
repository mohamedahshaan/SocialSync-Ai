import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  BarChart3,
  Image as ImageIcon,
  Share2,
  TrendingUp,
  ShieldCheck,
  Check
} from 'lucide-react';
import { PlatformIcon, PLATFORMS_DATA } from './PlatformIcon';

export function DashboardMockup() {
  const [selectedPlatforms, setSelectedPlatforms] = useState([
    'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'TIKTOK', 'THREADS'
  ]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const togglePlatform = (key) => {
    if (selectedPlatforms.includes(key)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== key));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, key]);
    }
  };

  const handleSimulatePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublishedSuccess(true);
      setTimeout(() => setPublishedSuccess(false), 4000);
    }, 900);
  };

  return (
    <div className="relative mx-auto w-full max-w-5xl group">
      {/* Outer ambient glow behind dashboard */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000 -z-10" />

      {/* Main Window Frame */}
      <div className="bg-[#0b1329] border border-slate-700/60 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl text-slate-100">

        {/* macOS Window Titlebar */}
        <div className="px-4 py-3 bg-[#080d1e] border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-3 text-xs font-mono text-slate-400 hidden sm:inline-block">
              socialsync.ai/create-post
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              6 Channels Connected
            </span>
            <span className="text-xs text-slate-400 hidden md:inline">
              Credits: <strong className="text-[#3B5BFF] dark:text-[#7C3AED]">500</strong>
            </span>
          </div>
        </div>

        {/* Dashboard Inner Workspace */}
        <div className="p-4 sm:p-6 md:p-8 space-y-6">

          {/* Top Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Broadcasts</p>
                <p className="text-lg sm:text-xl font-bold text-white mt-0.5">1,280</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Success Rate</p>
                <p className="text-lg sm:text-xl font-bold text-emerald-400 mt-0.5">99.8%</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Scheduled</p>
                <p className="text-lg sm:text-xl font-bold text-cyan-400 mt-0.5">142</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Synced Channels</p>
                <p className="text-lg sm:text-xl font-bold text-indigo-400 mt-0.5">6 of 6</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Share2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Interactive Composer Mockup Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                  ⚡
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Multi-Channel Broadcast Composer</h4>
                  <p className="text-[11px] text-slate-400">Publish or schedule simultaneously across active social endpoints</p>
                </div>
              </div>

              {/* AI Badge indicator */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium self-start sm:self-auto">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                AI Content Engine Active
              </div>
            </div>

            {/* Target Channel Selector Pills */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Select Target Platforms ({selectedPlatforms.length}/6 selected):</span>
                <span className="text-[10px] text-cyan-400 font-normal">Click platform to toggle</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {PLATFORMS_DATA.map((plat) => {
                  const isChecked = selectedPlatforms.includes(plat.key);
                  return (
                    <button
                      key={plat.key}
                      type="button"
                      onClick={() => togglePlatform(plat.key)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all ${
                        isChecked
                          ? 'bg-slate-800/90 border-cyan-500/50 text-white shadow-sm ring-1 ring-cyan-500/30'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-md flex items-center justify-center bg-white/10 shrink-0">
                        <PlatformIcon platform={plat.key} className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{plat.name}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-cyan-400 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caption & Post Body */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                  S
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                    Excited to unveil our new product release today! 🚀 Streamline your multi-channel social management with automated formatting, intelligent AI captioning, and real-time scheduling.
                    <span className="text-cyan-400 block mt-1">#SocialSync #ContentCreator #Innovation #ProductLaunch</span>
                  </p>

                  {/* Attached Media Pill */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>launch-preview-4k.png</span>
                    <span className="text-[10px] text-slate-500">(Auto-converts to 1080p MP4 for YouTube)</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Direct OAuth PKCE
                  </span>
                  <span>•</span>
                  <span>1 Post = 6 Native Feeds</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSimulatePublish}
                    disabled={isPublishing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                  >
                    {isPublishing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Syncing to {selectedPlatforms.length} Channels...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Publish Everywhere Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Success toast overlay simulation */}
            {publishedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
                <span className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Successfully broadcasted to Facebook, Instagram, LinkedIn, YouTube, TikTok, and Threads in 1.2s!
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Status: 200 OK</span>
              </div>
            )}
          </div>

          {/* Bottom Live Queue Strip */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Next automated queue event: <strong>"Weekly Tech Recap"</strong> scheduled for tomorrow at <strong>09:00 AM</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">Timezone: UTC+5:30</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-medium border border-cyan-800">Auto-Retry Enabled</span>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Callout Badges */}
      <div className="hidden lg:flex absolute -top-5 -left-6 bg-slate-900/90 border border-cyan-500/40 text-white px-3.5 py-2 rounded-2xl shadow-xl backdrop-blur-md items-center gap-2.5 text-xs animate-bounce duration-1000">
        <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
          ⚡
        </div>
        <div>
          <p className="font-semibold text-white">Instant Multi-Publish</p>
          <p className="text-[10px] text-cyan-300">6 Platforms • 1 Click</p>
        </div>
      </div>

      <div className="hidden lg:flex absolute -bottom-5 -right-6 bg-slate-900/90 border border-indigo-500/40 text-white px-3.5 py-2 rounded-2xl shadow-xl backdrop-blur-md items-center gap-2.5 text-xs">
        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="font-semibold text-white">AI Caption Suggestions</p>
          <p className="text-[10px] text-slate-400">Hashtags & Platform Voice</p>
        </div>
      </div>
    </div>
  );
}
