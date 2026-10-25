import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicNavbar } from '../components/public/PublicNavbar';
import { PublicFooter } from '../components/public/PublicFooter';
import {
  Trash2,
  ShieldCheck,
  Phone,
  MessageCircle,
  Mail,
  Globe,
  Lock,
  CheckCircle2,
  ExternalLink,
  Printer,
  Database,
  Layers,
  ArrowRight,
  HelpCircle,
  Share2,
  FileText,
  UserX,
  RefreshCw
} from 'lucide-react';

export function DataDeletionPage() {
  useEffect(() => {
    document.title = 'User Data Deletion Instructions | SocialSync AI';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">

        {/* Header & Badges */}
        <div className="border-b border-[#E2E8F0] dark:border-[#334155] pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-semibold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              User Privacy & Data Subject Control
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              User Data Deletion Instructions
            </h1>
            <p className="text-sm sm:text-base text-[#475569] dark:text-slate-300 leading-relaxed">
              SocialSync AI respects your privacy and gives you full control over your personal data. Below are detailed instructions explaining the data we store, how to disconnect social platforms, and how to request permanent deletion of your account information.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
              title="Print Data Deletion Instructions"
            >
              <Printer className="w-4 h-4" />
              <span>Print Instructions</span>
            </button>
            <Link
              to="/privacy-policy"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Privacy Policy</span>
            </Link>
          </div>
        </div>

        {/* Section 1: Overview Statement */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center text-sm font-extrabold">
              1
            </span>
            SocialSync AI Respects Your Privacy
          </h2>
          <p className="text-sm sm:text-base text-[#475569] dark:text-slate-300 leading-relaxed">
            SocialSync AI respects your privacy and gives you control over your personal data. Whether you want to disconnect a single social media channel, remove specific drafted content, or permanently delete your SocialSync AI user account and all stored records, you have the right and the mechanisms to do so.
          </p>
        </section>

        {/* Section 2: Information We Store */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center text-sm font-extrabold">
              2
            </span>
            Information We Store
          </h2>
          <p className="text-sm sm:text-base text-[#475569] dark:text-slate-300 leading-relaxed">
            SocialSync AI stores limited account, authentication, and subscription information strictly needed to provide, execute, and manage the multi-platform publishing service:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A] dark:text-white">
                <Mail className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                <span>Account & Profile Information</span>
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-400 leading-relaxed">
                Your email address associated with your SocialSync AI account, display name, profile image URL, and salted password hash (or Google OAuth user ID if authenticated via Google Sign-In).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A] dark:text-white">
                <Share2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Connected Social Media Platforms</span>
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-400 leading-relaxed">
                The social media platforms you connect to SocialSync AI (Facebook, Instagram, LinkedIn, YouTube, Threads, TikTok), including platform usernames, account IDs, and OAuth access & refresh tokens required to broadcast authorized posts.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A] dark:text-white">
                <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Selected Package & Subscriptions</span>
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-400 leading-relaxed">
                Your selected package or subscription tier (Free, Creator, Professional), remaining credit allocations, trial timestamps, and financial transaction records (order IDs and amounts in LKR).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A] dark:text-white">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Post Content & Dispatch Jobs</span>
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-400 leading-relaxed">
                Post captions, uploaded image/video URLs, scheduled dispatch dates, and publishing job statuses created within SocialSync AI, stored until successfully published or deleted by you.
              </p>
            </div>
          </div>

          {/* Explicit Administrative Clarification Callout */}
          <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <div className="font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              <span>Administrative Dashboard Post History Policy</span>
            </div>
            <p>
              SocialSync AI does not maintain a history or archive of the posts you publish independently outside SocialSync AI on your connected social media platforms in its administrative dashboard. Only posts and scheduling tasks authored or scheduled directly through SocialSync AI are tracked in your user dashboard and database.
            </p>
          </div>
        </section>

        {/* Section 3: How to Request Data Deletion */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center text-sm font-extrabold">
              3
            </span>
            How to Request Data Deletion
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Option A: Self-Service Deletion */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Option A: Self-Service Deletion
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                  Instant Account Deletion in Settings
                </h3>
                <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-400 leading-relaxed">
                  If you have access to your SocialSync AI account, you can permanently erase your data instantly without waiting for support:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 pl-1">
                  <li>Log in to your account at <span className="font-mono text-xs font-semibold text-blue-600 dark:text-cyan-400">socialsync.raccoon-ai.io</span></li>
                  <li>Click on <strong>Settings</strong> &rarr; <strong>Account Settings</strong> &rarr; <strong>Delete Account</strong></li>
                  <li>Enter your password (or type <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-400 font-mono font-bold">DELETE</code> if using Google Sign-In)</li>
                  <li>Click <strong>Permanently Delete Account</strong> to execute an atomic wipe</li>
                </ol>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to="/settings"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white text-xs font-bold transition-all"
                >
                  <span>Go to Account Settings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Option B: Direct Support Request */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <UserX className="w-3.5 h-3.5" />
                  Option B: Support Request
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                  Contact Support for Assisted Deletion
                </h3>
                <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-400 leading-relaxed">
                  To request manual deletion of your SocialSync AI account and personal information, contact us using the details below:
                </p>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Phone:</span>
                    <a href="tel:+94742663484" className="text-blue-600 dark:text-cyan-400 hover:underline font-mono font-medium">
                      +94 74 266 3484
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">WhatsApp:</span>
                    <a href="https://wa.me/94742663484" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono font-medium">
                      +94 74 266 3484
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Email:</span>
                    <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline font-medium">
                      sltsocialsync@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-cyan-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Website:</span>
                    <a href="https://socialsync.raccoon-ai.io" className="text-blue-600 dark:text-cyan-400 hover:underline font-medium">
                      https://socialsync.raccoon-ai.io
                    </a>
                  </div>
                </div>

                <p className="text-xs text-[#475569] dark:text-slate-400 leading-relaxed pt-1">
                  Please provide the email address associated with your SocialSync AI account and state that you wish to request data deletion. Never send your password or social media access tokens. We will verify your request and process it in accordance with our Privacy Policy within 24 to 48 hours.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to="/contact"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Submit Web Contact Request</span>
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* Section 4: Disconnecting Social Media Accounts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center text-sm font-extrabold">
              4
            </span>
            Disconnecting Social Media Accounts
          </h2>
          <p className="text-sm sm:text-base text-[#475569] dark:text-slate-300 leading-relaxed">
            You can disconnect your social media accounts from SocialSync AI at any time without deleting your entire SocialSync AI user account:
          </p>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-4 shadow-xs text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 font-bold text-[#0F172A] dark:text-white">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              <span>How Disconnection Works & Distinctions:</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              When you disconnect an account on the <strong>Accounts</strong> page (<Link to="/accounts" className="text-blue-600 dark:text-cyan-400 underline font-semibold">/accounts</Link>), SocialSync AI immediately executes a best-effort token revocation call with the provider (Meta Graph API, Google/YouTube OAuth, LinkedIn, or TikTok) and permanently removes the stored access tokens from our PostgreSQL database.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Notice Regarding Scope of Disconnection:
              </p>
              <p>
                Disconnecting an individual social media account revokes access credentials for that specific channel, but <strong className="text-slate-900 dark:text-white">may not automatically delete all account information stored by SocialSync AI</strong> (such as your user profile, billing receipts, or drafted post records). To delete all account information completely, follow the full account deletion instructions in Section 3.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Direct Provider Security Portals:
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                You can also revoke SocialSync AI's access permissions directly from each social provider's security controls:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <li>
                  <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 dark:text-cyan-400 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Google & YouTube Permissions</span>
                  </a>
                </li>
                <li>
                  <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 dark:text-cyan-400 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Meta Business Integrations (FB & IG)</span>
                  </a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/psettings/permitted-services" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 dark:text-cyan-400 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>LinkedIn Permitted Services</span>
                  </a>
                </li>
                <li>
                  <a href="https://www.tiktok.com/setting" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 dark:text-cyan-400 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>TikTok Security & App Permissions</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 5: What Happens Upon Deletion & Lawful Retention */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center text-sm font-extrabold">
              5
            </span>
            Data Deletion Scope & Lawful Retention
          </h2>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-4 shadow-xs text-xs sm:text-sm">
            <div className="space-y-2">
              <h3 className="font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>Data Permanently Erased:</span>
              </h3>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
                <li>Your user account profile, email address, display name, and password hash.</li>
                <li>All connected social accounts and stored OAuth access and refresh tokens.</li>
                <li>All authored posts, drafts, scheduled publishing jobs, and platform dispatch statuses.</li>
                <li>All active subscription records, credit balances, and password reset tokens.</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                <span>Statutory Exceptions & Technical Limitations:</span>
              </h3>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
                <li>
                  <strong>Financial & Tax Compliance:</strong> Invoices and transaction payment records are retained to satisfy statutory accounting and tax regulations under Sri Lankan law, but are permanently anonymized by unlinking your identity (<code className="font-mono text-xs">payment.userId = null</code>).
                </li>
                <li>
                  <strong>Anonymous Audit Hash:</strong> A non-identifying cryptographic SHA-256 hash of the deleted user ID is retained in <code className="font-mono text-xs">AccountDeletionEvent</code> containing zero personally identifiable information, strictly to prevent duplicate churn metrics and verify deletion compliance.
                </li>
                <li>
                  <strong>External Social Networks:</strong> Posts already broadcast to third-party networks (Facebook, Instagram, LinkedIn, YouTube, Threads, TikTok) reside on those platforms. Deleting your SocialSync AI account does not delete posts from external social networks; you must delete them directly on each respective platform.
                </li>
                <li>
                  <strong>Backup Cycles:</strong> Encrypted server snapshots and database backups retain data until routinely overwritten in accordance with automated backup rotation cycles.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 6: Official Privacy Policy Link & Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center text-sm font-extrabold">
              6
            </span>
            Privacy Policy & Official Reference
          </h2>
          <p className="text-sm sm:text-base text-[#475569] dark:text-slate-300 leading-relaxed">
            For more information regarding how SocialSync AI collects, uses, protects, and processes your personal data, please read our complete Privacy Policy:
          </p>

          <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Official Documentation</span>
              <div className="font-bold text-base text-[#0F172A] dark:text-white">
                SocialSync AI Privacy Policy
              </div>
              <a
                href="https://socialsync.raccoon-ai.io/privacy-policy"
                className="text-xs sm:text-sm text-blue-600 dark:text-cyan-400 hover:underline block break-all"
              >
                https://socialsync.raccoon-ai.io/privacy-policy
              </a>
            </div>

            <Link
              to="/privacy-policy"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs shrink-0"
            >
              <span>Read Privacy Policy</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}

export default DataDeletionPage;
