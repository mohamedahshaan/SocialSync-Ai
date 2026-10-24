import React, { useState } from 'react';
import { PublicNavbar } from '../components/public/PublicNavbar';
import { PublicFooter } from '../components/public/PublicFooter';
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Printer,
  Database,
  Key,
  Video,
  Trash2,
  Server,
  Globe,
  Building,
  ArrowRight,
  HelpCircle,
  MessageCircle,
  Share2,
  Sparkles,
  Layers,
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('section-1');

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const sections = [
    { id: 'section-1', title: '1. Introduction & Scope' },
    { id: 'section-2', title: '2. Information We Collect' },
    { id: 'section-3', title: '3. Platform-Specific Disclosures' },
    { id: 'section-3-1', title: '  • 3.1 Facebook (Meta Graph API)' },
    { id: 'section-3-2', title: '  • 3.2 Instagram (Meta Graph API)' },
    { id: 'section-3-3', title: '  • 3.3 LinkedIn' },
    { id: 'section-3-4', title: '  • 3.4 Google & YouTube Data API' },
    { id: 'section-3-5', title: '  • 3.5 Google API Limited Use Notice' },
    { id: 'section-3-6', title: '  • 3.6 Threads (Meta)' },
    { id: 'section-3-7', title: '  • 3.7 TikTok' },
    { id: 'section-4', title: '4. AI Vision & Caption Generation' },
    { id: 'section-5', title: '5. How We Use Information' },
    { id: 'section-6', title: '6. OAuth Token Storage & Security' },
    { id: 'section-7', title: '7. Sub-Processors & Data Sharing' },
    { id: 'section-8', title: '8. Data Retention & Media Lifespan' },
    { id: 'section-9', title: '9. Disconnection & Token Revocation' },
    { id: 'section-10', title: '10. Permanent Account Deletion Trace' },
    { id: 'section-11', title: '11. User Rights & Data Sovereignty' },
    { id: 'section-12', title: '12. International Data Processing' },
    { id: 'section-13', title: '13. Children\'s Privacy' },
    { id: 'section-14', title: '14. Policy Updates & Contact Details' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Header */}
        <div className="border-b border-[#E2E8F0] dark:border-[#334155] pb-8 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-semibold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Multi-Platform Privacy & Data Protection
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-sm sm:text-base text-[#475569] dark:text-slate-300">
              Last Updated: October 24, 2026 • Effective Date: October 1, 2026
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
              title="Print Privacy Policy"
            >
              <Printer className="w-4 h-4" />
              <span>Print Policy</span>
            </button>
            <Link
              to="/terms"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-500 transition-all shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Terms of Service</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

          {/* Sticky Table of Contents (Desktop) */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-28 space-y-4 p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-xs max-h-[calc(100vh-140px)] overflow-y-auto">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                Policy Sections
              </div>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => scrollToSection(s.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors block truncate ${
                      activeSection === s.id
                        ? 'bg-blue-600/10 text-blue-600 dark:text-cyan-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </nav>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                Privacy Officer:{' '}
                <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline">
                  sltsocialsync@gmail.com
                </a>
              </div>
            </div>
          </aside>

          {/* Main Privacy Policy Text */}
          <div className="lg:col-span-3 space-y-10 text-sm sm:text-base text-[#475569] dark:text-slate-300 leading-relaxed">

            {/* Google API Limited Use Highlight Card */}
            <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent dark:from-blue-950/30 dark:via-cyan-950/20 border border-blue-500/30 text-slate-800 dark:text-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-cyan-400 text-sm uppercase tracking-wider">
                <ShieldCheck className="w-5 h-5" />
                <span>Google API Services User Data Policy Compliance</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed">
                SocialSync AI's use and transfer to any other app of information received from Google APIs will adhere to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-cyan-400 underline font-semibold inline-flex items-center gap-0.5"
                >
                  <span>Google API Services User Data Policy</span>
                  <ExternalLink className="w-3 h-3" />
                </a>, including the <strong>Limited Use</strong> requirements. We never use Google user data to train generalized artificial intelligence or machine learning models, nor do we transfer Google data to third parties for advertising.
              </p>
            </div>

            {/* Section 1 */}
            <section id="section-1" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">1.</span> Introduction & Scope
              </h2>
              <p>
                Welcome to <strong>SocialSync AI</strong> ("we", "our", or "us"). SocialSync AI is an enterprise-grade multi-platform social media publishing, scheduling, and management SaaS platform operated from Colombo, Sri Lanka, accessible at <a href="https://socialsync.raccoon-ai.io" className="text-blue-600 dark:text-cyan-400 hover:underline">https://socialsync.raccoon-ai.io</a>.
              </p>
              <p>
                We are committed to maintaining the highest standards of data privacy, user autonomy, and security. This Privacy Policy details our practices concerning data collection, storage, processing, protection, and deletion when you use our website, authenticated web application, and backend publishing APIs across our six supported social platforms: <strong>Facebook, Instagram, LinkedIn, YouTube, Threads, and TikTok</strong>.
              </p>
              <p>
                By creating an account, authenticating via Google Sign-In, or connecting third-party social media accounts, you acknowledge the data handling practices described in this Privacy Policy.
              </p>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">2.</span> Categories of Personal Data Collected
              </h2>
              <p>
                SocialSync AI collects only the minimal required information necessary to provide account access, authenticate sessions, and broadcast social posts:
              </p>
              <div className="space-y-3 my-4">
                <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-1 shadow-xs">
                  <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-2 text-sm">
                    <Key className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                    <span>Account & Identity Data</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Full name, email address, profile picture URL, and password hash (for password-registered users, cryptographically hashed using bcrypt with 12 salt rounds). <strong>Plain-text passwords are never collected, stored, or inspected.</strong> For Google Sign-In users, we receive and verify your Google Subject ID, verified email, and profile avatar.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-1 shadow-xs">
                  <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-2 text-sm">
                    <Building className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                    <span>Billing Contact Information</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Phone number, street address, city, and country, collected strictly when initiating paid plan checkouts to satisfy merchant compliance requirements of our payment processor, PayHere. <strong>Raw credit card numbers, CVVs, and banking PINs are processed directly by PayHere on their PCI-DSS Level 1 compliant gateway and are never collected or stored on SocialSync AI servers.</strong> We store only masked card references (e.g. card brand and last 4 digits) for user receipt identification.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-1 shadow-xs">
                  <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-2 text-sm">
                    <Database className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                    <span>Connected Social Account Metadata & OAuth Tokens</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    When you link social networks (Facebook, Instagram, LinkedIn, YouTube, Threads, TikTok), we receive public channel/page metadata (platform user ID, page or channel name, handle, avatar URL) and official scoped OAuth 2.0 access and refresh tokens. We never receive or store your social network passwords.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-1 shadow-xs">
                  <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                    <span>User Authored Content & Uploaded Media</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Post captions, hashtags, scheduled publishing timestamps, attached images (up to 20MB), and video files (up to 100MB) that you explicitly upload to schedule or broadcast across your accounts.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-1 shadow-xs">
                  <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-2 text-sm">
                    <Server className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                    <span>Operational Telemetry & Credit Audit Logs</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Publishing job execution timestamps, platform API HTTP response codes, error telemetry, IP addresses for security rate-limiting, and an immutable credit ledger recording credit grants, usage deductions, and failed post refunds.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 - Multi-Platform Specific Disclosures */}
            <section id="section-3" className="space-y-6 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">3.</span> Multi-Platform Specific Data Disclosures
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                To satisfy the transparency requirements of each platform provider, the following subsections describe the exact data accessed, OAuth scopes requested, retention policies, and disconnection procedures for all six supported integrations:
              </p>

              {/* 3.1 Facebook Pages (Meta) */}
              <div id="section-3-1" className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-3 shadow-xs scroll-mt-28">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span>3.1 Facebook Pages (Meta Graph API v20.0)</span>
                </h3>
                <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <p><strong>OAuth Scopes Requested:</strong> <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">pages_show_list</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">pages_read_engagement</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">pages_manage_posts</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">public_profile</code>.</p>
                  <p><strong>Data Accessed:</strong> User Facebook ID, name, avatar; managed Facebook Pages (Page ID, Page name, Page category, Page tasks, Page avatar, Page access token).</p>
                  <p><strong>Purpose of Processing:</strong> To verify Page administration permissions, display connected Pages in the composer, and publish user-authored text posts, photos, and videos to selected Facebook Pages.</p>
                  <p><strong>Storage & Retention:</strong> Page access tokens and metadata are stored in our secure PostgreSQL database for up to 60 days (or until refreshed/revoked). User media is stored until post dispatch or post deletion.</p>
                  <p><strong>Disconnection & Revocation:</strong> Clicking "Disconnect" in Accounts calls Meta Graph API (<code className="text-[11px] font-mono">DELETE https://graph.facebook.com/v19.0/{'{targetId}'}/permissions</code>) to revoke permissions, and permanently deletes all stored tokens and records from our database.</p>
                </div>
              </div>

              {/* 3.2 Instagram Professional (Meta) */}
              <div id="section-3-2" className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-3 shadow-xs scroll-mt-28">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-600"></span>
                  <span>3.2 Instagram Professional (Meta Graph API v20.0)</span>
                </h3>
                <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <p><strong>OAuth Scopes Requested:</strong> <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">instagram_business_basic</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">instagram_business_content_publish</code>.</p>
                  <p><strong>Data Accessed:</strong> Instagram Professional account ID, username, profile picture URL, and account type.</p>
                  <p><strong>Purpose of Processing:</strong> To verify Professional (Business/Creator) eligibility, display the account in the composer, and publish user-authored photos and video Reels via Meta Instagram Media Containers.</p>
                  <p><strong>Storage & Retention:</strong> Long-lived access tokens (60 days) and account identifiers are stored in PostgreSQL on an internal Docker network. Tokens are purged immediately upon account disconnection.</p>
                  <p><strong>Disconnection & Revocation:</strong> Clicking "Disconnect" in Accounts dispatches a permissions deletion call to Meta and purges local database records immediately.</p>
                </div>
              </div>

              {/* 3.3 LinkedIn */}
              <div id="section-3-3" className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-3 shadow-xs scroll-mt-28">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0A66C2]"></span>
                  <span>3.3 LinkedIn Platform (REST Posts API)</span>
                </h3>
                <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <p><strong>OAuth Scopes Requested:</strong> <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">openid</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">profile</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">email</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">w_member_social</code>.</p>
                  <p><strong>Data Accessed:</strong> Authenticated LinkedIn Member URN ID (<code className="text-[11px] font-mono">sub</code>), full name, verified email address, and profile picture URL.</p>
                  <p><strong>Purpose of Processing:</strong> To authenticate the member, display the connected profile in the dashboard, and broadcast user-authored text posts, image shares, and video shares to the member profile or authorized organization page.</p>
                  <p><strong>Storage & Retention:</strong> LinkedIn OAuth access tokens (valid up to 60 days) and member identifiers are stored in PostgreSQL on an internal Docker network. Tokens are purged immediately upon account disconnection.</p>
                  <p><strong>Disconnection & Revocation:</strong> Disconnecting triggers an automated revocation POST request to <code className="text-[11px] font-mono">https://www.linkedin.com/oauth/v2/revoke</code> and immediately purges local database records.</p>
                </div>
              </div>

              {/* 3.4 Google & YouTube Data API */}
              <div id="section-3-4" className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-3 shadow-xs scroll-mt-28">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-red-500" />
                  <span>3.4 Google Sign-In & YouTube Data API v3</span>
                </h3>
                <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <p><strong>Google Sign-In Scopes:</strong> <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">openid</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">email</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">profile</code>.</p>
                  <p><strong>YouTube Publishing Scopes:</strong> <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">https://www.googleapis.com/auth/youtube.upload</code> and <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">https://www.googleapis.com/auth/youtube.readonly</code>.</p>
                  <p><strong>Data Accessed:</strong> For Sign-In: Google unique Subject ID (<code className="text-[11px] font-mono">sub</code>), verified email address, full name, and avatar URL. For YouTube: Channel ID, channel title, custom handle URL, and channel icon thumbnails (queried via <code className="text-[11px] font-mono">channels.list(part=snippet)</code>).</p>
                  <p><strong>Purpose of Processing:</strong> To authenticate user sessions, display connected YouTube channels, and upload user-authored video files and YouTube Shorts directly to the user's connected YouTube channel.</p>
                  <p><strong>Storage & Protection:</strong> OAuth access tokens (1 hour lifetime) and offline refresh tokens are stored in PostgreSQL on an internal container network. Short-lived tokens are refreshed automatically upon post dispatch. SocialSync AI does not store user Google passwords.</p>
                  <p><strong>Disconnection & Token Revocation:</strong> Disconnecting a YouTube channel dispatches an immediate revocation call to <code className="text-[11px] font-mono">https://oauth2.googleapis.com/revoke?token={'{token}'}</code> and permanently purges local access and refresh tokens from PostgreSQL. Users can also revoke access anytime at <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-cyan-400 underline font-semibold">Google Security Settings</a>.</p>
                </div>
              </div>

              {/* 3.5 Google API Limited Use Policy Disclosure */}
              <div id="section-3-5" className="p-6 rounded-2xl bg-blue-500/5 dark:bg-blue-950/20 border-2 border-blue-500/30 space-y-3 shadow-xs scroll-mt-28">
                <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-cyan-400 text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>3.5 Google API Limited Use Requirements Notice</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  SocialSync AI explicitly complies with the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-cyan-400 underline font-semibold">Google API Services User Data Policy</a>, including the Limited Use requirements:
                </p>
                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div><strong>Service Delivery Only:</strong> Information received from Google APIs is used strictly to provide user-facing features (account sign-in, YouTube channel display, and video publishing).</div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div><strong>Zero Advertising Transfers:</strong> SocialSync AI never transfers Google user data to third parties for advertising, retargeting, or data brokerage.</div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div><strong>No AI/ML Model Training:</strong> Google user data is <strong>NEVER used to train, fine-tune, or develop generalized artificial intelligence or machine learning models</strong>.</div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div><strong>Restricted Human Reading:</strong> No human may inspect Google user data unless under user affirmative agreement for debugging, for security abuse investigations, or to comply with applicable law.</div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  Users should also consult the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-cyan-400 underline">Google Privacy Policy</a> for additional details on Google's own data practices.
                </p>
              </div>

              {/* 3.6 Threads (Meta) */}
              <div id="section-3-6" className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-3 shadow-xs scroll-mt-28">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-slate-100"></span>
                  <span>3.6 Threads Platform (Meta Threads API v1.0)</span>
                </h3>
                <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <p><strong>OAuth Scopes Requested:</strong> <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">threads_basic</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">threads_content_publish</code>.</p>
                  <p><strong>Data Accessed:</strong> Threads User ID, username, display name, and Threads profile picture URL.</p>
                  <p><strong>Purpose of Processing:</strong> To authenticate the user, display the account in the composer, and publish text threads (up to 500 characters), image threads, and video threads using Meta Threads Media Containers.</p>
                  <p><strong>Storage & Retention:</strong> Long-lived Threads access tokens (60 days) and account metadata are stored in PostgreSQL while connected.</p>
                  <p><strong>Disconnection & Revocation:</strong> Disconnection calls the Meta permissions deletion endpoint and purges local database records immediately.</p>
                </div>
              </div>

              {/* 3.7 TikTok */}
              <div id="section-3-7" className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-3 shadow-xs scroll-mt-28">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-black dark:bg-cyan-400"></span>
                  <span>3.7 TikTok for Developers (Content Posting API v2)</span>
                </h3>
                <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <p><strong>OAuth Scopes Requested:</strong> <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">user.info.basic</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">video.publish</code>, <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">video.upload</code>.</p>
                  <p><strong>Protocol & Security:</strong> Utilizes OAuth 2.0 with PKCE (Proof Key for Code Exchange using SHA-256 code challenge) to prevent authorization code interception.</p>
                  <p><strong>Data Accessed:</strong> TikTok Open ID, Union ID, display name, username, and avatar image URL.</p>
                  <p><strong>Purpose of Processing:</strong> To authenticate the creator, query allowed privacy settings (public, friends, private), and upload video content (.mp4/.mov) via chunked upload through the Content Posting API v2.</p>
                  <p><strong>Storage & Retention:</strong> Access tokens (24 hours) and refresh tokens are stored in PostgreSQL while the integration remains active.</p>
                  <p><strong>Disconnection & Revocation:</strong> Disconnecting dispatches a revocation POST request to <code className="text-[11px] font-mono">https://open.tiktokapis.com/v2/oauth/revoke/</code> and permanently deletes all stored tokens and records from PostgreSQL.</p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">4.</span> AI Vision & Caption Generation
              </h2>
              <p>
                Subscribers to our Professional tier have access to optional AI Caption Generation powered by Google Gemini and OpenAI. When you opt in to generate captions for an uploaded image:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li>Your prompt and attached image are transmitted via encrypted HTTPS server-to-server API to Google Gemini or OpenAI.</li>
                <li>SocialSync AI does not store your prompts or images to train internal machine learning models.</li>
                <li>Under commercial developer API terms (such as OpenAI API policies and Google AI for Developers paid API terms), data submitted through paid API endpoints is not used to train foundation models, though providers may retain request data ephemerally (typically up to 30 days) strictly for abuse monitoring, safety filtering, and security debugging before deletion.</li>
                <li>Users should avoid submitting sensitive, confidential, proprietary, or personal data into AI prompt fields.</li>
                <li><strong>Strict Isolation: No Google user data received from YouTube or Google Sign-In is ever passed to AI providers.</strong></li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">5.</span> How We Use Information
              </h2>
              <p>
                SocialSync AI processes your data exclusively for legitimate operational purposes:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li><strong>Multi-Channel Publishing:</strong> Executing your direct instructions to broadcast authored posts, images, and videos to selected platforms.</li>
                <li><strong>Media Optimization & Transcoding:</strong> Automatically transcoding images into 1080p MP4 videos with silent audio for YouTube.</li>
                <li><strong>Session Authentication & Security:</strong> Verifying credentials, managing session tokens, rate-limiting malicious traffic, and detecting fraud.</li>
                <li><strong>Billing & Credit Ledger:</strong> Tracking monthly credit usage, provisioning plan allowances, processing PayHere renewals in LKR, and automatically refunding credits for failed post dispatches or canceled scheduled posts.</li>
                <li><strong>Customer Support:</strong> Investigating delivery errors, resolving billing discrepancies, and responding to inquiries sent to <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline">sltsocialsync@gmail.com</a>.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">6.</span> OAuth Token Storage & Technical Security
              </h2>
              <p>
                We enforce technical and architectural safeguards verified in our production implementation:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li><strong>Internal Container Isolation:</strong> OAuth tokens and user records reside in PostgreSQL within an internal Docker bridge network that is not exposed to any public host port.</li>
                <li><strong>Transport Layer Security:</strong> All external web traffic and API endpoints negotiate TLS 1.3 encryption with Let's Encrypt certificates on Nginx.</li>
                <li><strong>HTTP Security Headers:</strong> Production API responses enforce HTTP Strict Transport Security (<code className="text-[11px] font-mono">Strict-Transport-Security: max-age=15552000; includeSubDomains</code>), <code className="text-[11px] font-mono">X-Content-Type-Options: nosniff</code>, <code className="text-[11px] font-mono">X-Frame-Options: SAMEORIGIN</code> clickjacking defense, Cross-Origin-Opener-Policy, and Content Security Policy via Helmet middleware.</li>
                <li><strong>Password Hashing:</strong> Passwords are cryptographically salted and hashed using bcrypt with 12 rounds before database storage. Plaintext passwords never touch our database.</li>
                <li><strong>Zero Plaintext Secret Exposure:</strong> PayHere Merchant Secrets, Google Client Secrets, and platform API keys reside exclusively on the backend server and are never returned in client payloads or browser responses.</li>
                <li><strong>Audit Transparency:</strong> SocialSync AI does not claim third-party security certifications (such as SOC 2 or ISO 27001) that have not been formally audited and obtained.</li>
              </ul>
            </section>

            {/* Section 7 - Sub-processors Table */}
            <section id="section-7" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">7.</span> Sub-Processors & Data Sharing
              </h2>
              <p>
                SocialSync AI does NOT sell, rent, monetize, or trade your personal information. We share data only with verified sub-processors necessary to deliver the Service:
              </p>
              <div className="overflow-x-auto my-3">
                <table className="w-full text-left text-xs sm:text-sm border border-[#E2E8F0] dark:border-[#334155] rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                    <tr>
                      <th className="p-3 border-b border-[#E2E8F0] dark:border-[#334155]">Sub-Processor</th>
                      <th className="p-3 border-b border-[#E2E8F0] dark:border-[#334155]">Role & Purpose</th>
                      <th className="p-3 border-b border-[#E2E8F0] dark:border-[#334155]">Data Shared</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155] text-slate-600 dark:text-slate-400">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">PayHere (Payment Gateway)</td>
                      <td className="p-3">Processes subscription payments in LKR</td>
                      <td className="p-3">Billing contact (name, email, phone, city), order ID, amount</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Google LLC (Sign-In & YouTube)</td>
                      <td className="p-3">User authentication & YouTube video upload</td>
                      <td className="p-3">OAuth credentials, video files, post captions (for YouTube)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Meta Platforms, Inc. (FB/IG/Threads)</td>
                      <td className="p-3">Social media post broadcasting</td>
                      <td className="p-3">OAuth access tokens, post text, uploaded media</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">LinkedIn Corporation</td>
                      <td className="p-3">Social post broadcasting</td>
                      <td className="p-3">OAuth access tokens, post text, uploaded media</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">TikTok Pte. Ltd.</td>
                      <td className="p-3">Video publishing via Content Posting API</td>
                      <td className="p-3">OAuth access tokens, video files, post captions</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Google Gemini / OpenAI</td>
                      <td className="p-3">AI caption generation (Opt-in)</td>
                      <td className="p-3">User caption prompt or attached image (ephemeral API call)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Google Workspace / Gmail SMTP</td>
                      <td className="p-3">Transactional emails & OTPs</td>
                      <td className="p-3">Recipient email, password reset tokens/OTPs</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 8 */}
            <section id="section-8" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">8.</span> Data Retention, Reconciliation & Media Lifespan
              </h2>
              <p>
                We retain your data according to transparent operational policies:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li><strong>Account Data:</strong> Profile details, login records, and account settings are retained while your account remains active. Stale pending checkout sessions are automatically expired after 30 minutes.</li>
                <li><strong>Uploaded Media Files:</strong> Images and videos uploaded to schedule posts are stored on the server's persistent storage volume to fulfill scheduling and publishing. When a post is deleted, its database reference is removed. Physical files remain on the server storage volume until administrative storage maintenance cleanups.</li>
                <li><strong>Subscription vs. Financial Records:</strong> Subscription configuration records, credit transaction logs, and plan histories are purged upon account deletion. In contrast, financial transaction records (order IDs, PayHere payment references, amounts in LKR, payment statuses, and timestamps) are retained for legal, tax, and accounting compliance under Sri Lankan commercial law, but are permanently disassociated from personal identity (<code className="text-[11px] font-mono">payment.userId = null</code>).</li>
                <li><strong>OAuth Tokens:</strong> Retained in PostgreSQL while the integration remains connected; deleted immediately upon account disconnection or account deletion.</li>
                <li><strong>Backup Lifecycles:</strong> Automated database snapshots and routine server backups retain historical copies until overwritten according to routine backup rotation schedules.</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">9.</span> Disconnection & Token Revocation
              </h2>
              <p>
                You maintain direct control over linked social media accounts:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li><strong>Immediate Local Deletion:</strong> Clicking "Disconnect" in the Accounts manager deletes the connection record and all stored access and refresh tokens from our database immediately.</li>
                <li><strong>Provider-Side Revocation:</strong> SocialSync AI executes best-effort asynchronous token revocation API calls when an individual account is disconnected:
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-[11px]">
                    <li><strong>Google / YouTube:</strong> POST request to <code className="font-mono">https://oauth2.googleapis.com/revoke?token={'{token}'}</code>.</li>
                    <li><strong>Meta (Facebook / Instagram / Threads):</strong> DELETE request to <code className="font-mono">https://graph.facebook.com/v19.0/{'{targetId}'}/permissions</code>.</li>
                    <li><strong>LinkedIn:</strong> POST request to <code className="font-mono">https://www.linkedin.com/oauth/v2/revoke</code>.</li>
                    <li><strong>TikTok:</strong> POST request to <code className="font-mono">https://open.tiktokapis.com/v2/oauth/revoke/</code>.</li>
                  </ul>
                  If a provider's revocation endpoint is unreachable or errors, local tokens are deleted regardless so SocialSync AI cannot use them.
                </li>
                <li><strong>Direct Provider Security Portals:</strong> You can also revoke access anytime through official provider security dashboards:
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-[11px]">
                    <li>Google / YouTube: <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-cyan-400 underline">Google Permissions</a></li>
                    <li>Meta (Facebook / Instagram / Threads): <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-cyan-400 underline">Meta Business Integrations</a></li>
                    <li>LinkedIn: <a href="https://www.linkedin.com/psettings/permitted-services" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-cyan-400 underline">LinkedIn Permitted Services</a></li>
                    <li>TikTok: <a href="https://www.tiktok.com/setting" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-cyan-400 underline">TikTok Security Settings</a></li>
                  </ul>
                </li>
                <li><strong>Notice on Account Deletion:</strong> Bulk account deletion purges local tokens immediately from PostgreSQL, cutting all access. However, bulk deletion does not make network calls to provider revocation endpoints. To revoke provider-side credentials before deleting your account, disconnect accounts individually or use provider security portals.</li>
              </ul>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">10.</span> Permanent Account Deletion Trace
              </h2>
              <p>
                You may permanently delete your SocialSync AI account and personal data at any time through our self-service controls:
              </p>
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-3 shadow-xs text-xs sm:text-sm">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>Self-Service Permanent Deletion Process</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Navigate to <strong>Settings</strong> &rarr; <strong>Account Settings</strong> &rarr; <strong>Delete Account</strong>. For password users, entering your current password is required; for OAuth-only users, entering the confirmation text "DELETE" is required.
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Upon confirmation, SocialSync AI executes an atomic database transaction that permanently wipes:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600 dark:text-slate-400">
                  <li>Your user profile, name, email, and password hash.</li>
                  <li>All connected social accounts and stored OAuth access and refresh tokens.</li>
                  <li>All authored posts, scheduled publishing jobs, platform dispatch links, and drafts.</li>
                  <li>All subscription records, trial records, credit transactions, and plan change history.</li>
                  <li>All password reset tokens and OTP verification records.</li>
                  <li>All user-specific admin audit logs.</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-400 pt-1">
                  <strong>Lawful Retention & Exceptions:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600 dark:text-slate-400 text-xs">
                  <li><strong>Financial Payment Records:</strong> Invoices and transaction amounts are preserved for statutory accounting and tax compliance, but are anonymized by setting <code className="font-mono">payment.userId = null</code>.</li>
                  <li><strong>Server Storage Media:</strong> Uploaded media files in server storage remain until administrative storage maintenance cleanups.</li>
                  <li><strong>System Backups:</strong> Historical database snapshots and routine server backups retain encrypted records until overwritten according to automated backup rotation cycles.</li>
                  <li><strong>Third-Party Social Networks:</strong> Posts already published to external platforms (Facebook, Instagram, LinkedIn, YouTube, Threads, TikTok) remain on those networks; you must delete published posts directly through each platform.</li>
                </ul>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                  * A non-identifying cryptographic SHA-256 hash of the deleted user ID is recorded in <code className="font-mono">AccountDeletionEvent</code> containing zero personally identifiable information, strictly for anonymous churn metrics and legal accounting compliance.
                </p>
              </div>
            </section>

            {/* Section 11 */}
            <section id="section-11" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">11.</span> User Rights & Data Sovereignty
              </h2>
              <p>
                In accordance with recognized data protection principles, including the <strong>Personal Data Protection Act No. 9 of 2022 (PDPA) of Sri Lanka</strong> and applicable international privacy practices, SocialSync AI affords you clear rights regarding your personal information, subject to statutory retention exceptions:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li><strong>Right of Access:</strong> You can review your profile, connected accounts, posts, and payment receipts at any time in your dashboard.</li>
                <li><strong>Right to Rectification:</strong> You can edit your profile name, email, billing contact details, and password directly in Settings.</li>
                <li><strong>Right to Erasure:</strong> You can delete authored posts, disconnect social accounts, or initiate permanent account deletion via self-service controls (with anonymized preservation of financial payment records for legal/tax compliance).</li>
                <li><strong>Right to Restrict or Object:</strong> You can disconnect third-party integrations or opt out of optional AI captioning at any time.</li>
              </ul>
              <p>
                To exercise any additional data subject rights or request an export of your account data, email our privacy desk at <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">sltsocialsync@gmail.com</a>.
              </p>
            </section>

            {/* Section 12 */}
            <section id="section-12" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">12.</span> International Data Processing
              </h2>
              <p>
                SocialSync AI is operated from Sri Lanka. If you access the Service from outside Sri Lanka, please be aware that your information may be processed in server environments located across multiple jurisdictions to deliver multi-platform API dispatches. By using SocialSync AI, you consent to the processing of your data in accordance with this Privacy Policy and international industry security standards.
              </p>
            </section>

            {/* Section 13 */}
            <section id="section-13" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">13.</span> Children's Privacy
              </h2>
              <p>
                SocialSync AI is an enterprise-oriented social media management platform and is not directed to children under the age of 18. We do not knowingly collect or solicit personal information from minors. If we discover that a user under 18 has provided us with personal information, we will immediately delete their account and associated data.
              </p>
            </section>

            {/* Section 14 */}
            <section id="section-14" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">14.</span> Policy Updates & Contact Details
              </h2>
              <p>
                We may periodically update this Privacy Policy to reflect enhancements in our features, changes in third-party API requirements, or evolving legal standards. Any revisions will be published on this page with an updated "Last Updated" timestamp. We encourage you to review this policy periodically.
              </p>
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 my-3">
                <strong>Legal Advice & Regulatory Notice:</strong> This Privacy Policy accurately reflects our live software implementation and data handling architecture. It provides operational transparency and does not constitute formal legal counsel. Users and organizations subject to specialized corporate or international regulations are encouraged to consult qualified legal counsel admitted to practice in Sri Lanka. Updating this policy does not guarantee or claim automatic third-party platform certification or approval.
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-2 text-xs sm:text-sm shadow-xs mt-4">
                <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                  <span>Privacy Officer & Official Contact Desk:</span>
                </div>
                <p><strong>Platform:</strong> SocialSync AI</p>
                <p><strong>Data Protection Desk:</strong> <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline">sltsocialsync@gmail.com</a></p>
                <p><strong>Production Domain:</strong> <a href="https://socialsync.raccoon-ai.io" className="text-blue-600 dark:text-cyan-400 hover:underline">https://socialsync.raccoon-ai.io</a></p>
                <p><strong>Headquarters:</strong> Colombo, Sri Lanka</p>
              </div>
            </section>

            {/* Quick Navigation Footer Row */}
            <div className="pt-8 border-t border-[#E2E8F0] dark:border-[#334155] flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                <span>Also review:</span>
                <Link to="/terms" className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">
                  Terms of Service
                </Link>
                <span>•</span>
                <Link to="/faq" className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">
                  Knowledge Base & FAQ
                </Link>
                <span>•</span>
                <Link to="/contact" className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">
                  Contact Desk
                </Link>
              </div>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white hover:underline text-xs"
              >
                Back to Top ↑
              </button>
            </div>

          </div>
        </div>

      </main>

      <PublicFooter />
    </div>
  );
}

export default PrivacyPolicyPage;
