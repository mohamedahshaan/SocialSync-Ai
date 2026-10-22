import React from 'react';
import { Link } from 'react-router-dom';
import {
  Share2,
  Calendar,
  Sparkles,
  Users,
  Coins,
  History,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Globe
} from 'lucide-react';
import { PublicNavbar } from '../components/public/PublicNavbar';
import { PublicFooter } from '../components/public/PublicFooter';

export function FeaturesPage() {
  const features = [
    {
      title: 'Multi-Platform Publishing',
      badge: null,
      desc: 'Publish your posts, images, and videos directly across Facebook, Instagram, LinkedIn, YouTube, TikTok, and Threads simultaneously with single-click delivery.',
      icon: Share2,
      iconBg: 'bg-blue-600/10 text-blue-500 border-blue-500/30'
    },
    {
      title: 'Smart Scheduling',
      badge: null,
      desc: 'Plan ahead and automatically queue content to be broadcasted at peak engagement times across each platform without manual intervention.',
      icon: Calendar,
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
    },
    {
      title: 'AI Caption Generator',
      badge: 'Pro',
      desc: 'Generate viral hooks, contextual captions, and optimized hashtags powered by advanced AI algorithms tailored to each specific social network.',
      icon: Sparkles,
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
    },
    {
      title: 'Connected Accounts',
      badge: null,
      desc: 'Seamlessly link and govern multiple developer OAuth accounts per network with complete cryptographic token encryption and strict credential isolation.',
      icon: Users,
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    },
    {
      title: 'Credit-Based Usage',
      badge: null,
      desc: 'Predictable, transparent balance-based pricing. Track every single post broadcast with exact per-channel credit logs and automated ledger auditing.',
      icon: Coins,
      iconBg: 'bg-teal-500/10 text-teal-400 border-teal-500/30'
    },
    {
      title: 'Publishing History',
      badge: null,
      desc: 'Inspect real-time per-platform publishing outcomes, delivery confirmations, post identifiers, and automated diagnostics for partial re-broadcasts.',
      icon: History,
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />

      {/* Hero Section matching Screen 2 */}
      <section className="pt-20 pb-12 md:pt-24 md:pb-16 text-center max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight mb-4">
          Powerful Features for Modern Creators
        </h1>
        <p className="text-[#475569] dark:text-[#CBD5E1] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Everything you need to create, schedule and publish across multiple social media platforms.
        </p>
      </section>

      {/* 2x3 Grid matching Screen 2 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#111827] rounded-2xl p-7 border border-[#E2E8F0] dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-blue-500/5 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${item.iconBg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {item.badge && (
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-[#0F172A] dark:text-white mb-2.5 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[#475569] dark:text-[#CBD5E1] text-xs sm:text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[#E2E8F0] dark:border-slate-800/60 flex items-center justify-between text-xs text-[#475569] dark:text-slate-400">
                  <span className="font-medium text-slate-400 dark:text-slate-500">Feature 0{idx + 1}</span>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-indigo-600/10 dark:from-blue-900/40 dark:via-cyan-900/30 dark:to-indigo-900/40 border border-blue-200 dark:border-cyan-500/30 p-8 sm:p-12 text-center relative overflow-hidden shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white mb-3">
            Ready to Supercharge Your Multi-Channel Reach?
          </h2>
          <p className="text-[#475569] dark:text-slate-300 text-sm max-w-xl mx-auto mb-6">
            Get 100 free credits instantly upon sign up. No credit card required to start broadcasting.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
export default FeaturesPage;
