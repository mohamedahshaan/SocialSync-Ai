import React, { useState } from 'react';
import { PublicNavbar } from '../components/public/PublicNavbar';
import { PublicFooter } from '../components/public/PublicFooter';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Printer,
  Scale,
  Video,
  CreditCard,
  Lock,
  ArrowRight,
  HelpCircle,
  MessageCircle,
  Building,
  Share2,
  Sparkles,
  Layers,
  RefreshCw,
  Trash2,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function TermsPage() {
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
    { id: 'section-1', title: '1. Agreement to Terms' },
    { id: 'section-2', title: '2. Eligibility & Account Registration' },
    { id: 'section-3', title: '3. Account Security & Credentials' },
    { id: 'section-4', title: '4. SocialSync AI Services & Limitations' },
    { id: 'section-5', title: '5. Connecting Social Accounts via OAuth' },
    { id: 'section-6', title: '6. User Content & Intellectual Property' },
    { id: 'section-7', title: '7. Acceptable Use & Prohibited Conduct' },
    { id: 'section-8', title: '8. Multi-Platform Specific Terms' },
    { id: 'section-9', title: '9. Scheduling, Delivery & Post Failures' },
    { id: 'section-10', title: '10. AI Vision & Caption Features' },
    { id: 'section-11', title: '11. Plans, Credits & Payment Terms' },
    { id: 'section-12', title: '12. Subscription Renewals & Cancellation' },
    { id: 'section-13', title: '13. Refund Policy & Failed Post Credits' },
    { id: 'section-14', title: '14. Third-Party APIs & Provider Outages' },
    { id: 'section-15', title: '15. Service Availability & Maintenance' },
    { id: 'section-16', title: '16. Suspension & Account Termination' },
    { id: 'section-17', title: '17. Intellectual Property of SocialSync AI' },
    { id: 'section-18', title: '18. Disclaimers of Warranties' },
    { id: 'section-19', title: '19. Limitation of Liability' },
    { id: 'section-20', title: '20. Indemnification' },
    { id: 'section-21', title: '21. Governing Law & Jurisdiction' },
    { id: 'section-22', title: '22. Modifications & Contact Info' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Page Header */}
        <div className="border-b border-[#E2E8F0] dark:border-[#334155] pb-8 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-600/30 text-blue-600 dark:text-cyan-400 text-xs font-semibold tracking-wide uppercase">
              <Scale className="w-3.5 h-3.5" />
              Multi-Platform Legal Standards
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Terms of Service
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
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print Terms</span>
            </button>
            <Link
              to="/privacy-policy"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-500 transition-all shadow-xs"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy Policy</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

          {/* Left Sticky Table of Contents (Desktop) */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-28 space-y-4 p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] shadow-xs max-h-[calc(100vh-140px)] overflow-y-auto">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                Terms Contents
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
                Inquiries:{' '}
                <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline">
                  sltsocialsync@gmail.com
                </a>
              </div>
            </div>
          </aside>

          {/* Main Legal Content */}
          <div className="lg:col-span-3 space-y-10 text-sm sm:text-base text-[#475569] dark:text-slate-300 leading-relaxed">

            {/* Introductory Platform Scope Alert */}
            <div className="p-6 sm:p-7 rounded-2xl bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 text-slate-700 dark:text-slate-300 space-y-3">
              <h3 className="font-bold text-[#0F172A] dark:text-white text-base flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600 dark:text-cyan-400 shrink-0" />
                <span>Multi-Platform SaaS Scope Notice</span>
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed">
                SocialSync AI provides multi-network social media management across six distinct third-party platforms: <strong>Facebook, Instagram, LinkedIn, YouTube, Threads, and TikTok</strong>. SocialSync AI is an independent software application operated from Colombo, Sri Lanka (<span className="font-mono text-blue-600 dark:text-cyan-400">https://socialsync.raccoon-ai.io</span>). Each integration operates under the developer terms and API policies of its respective platform provider.
              </p>
            </div>

            {/* Section 1 */}
            <section id="section-1" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">1.</span> Agreement to Terms
              </h2>
              <p>
                These Terms of Service ("Terms", "Agreement") constitute a legally binding agreement between you (whether as an individual creator, business entity, or agency, "User", "you") and <strong>SocialSync AI</strong> ("SocialSync AI", "we", "us", or "our"), governing your access to and use of our website, web application, backend publishing engine, and APIs at <a href="https://socialsync.raccoon-ai.io" className="text-blue-600 dark:text-cyan-400 hover:underline">https://socialsync.raccoon-ai.io</a> (collectively, the "Service").
              </p>
              <p>
                By creating an account, authenticating via Google Sign-In, linking any social media account, or scheduling a post, you confirm that you have read, understood, and agreed to be bound by these Terms and our <Link to="/privacy-policy" className="text-blue-600 dark:text-cyan-400 font-semibold underline">Privacy Policy</Link>. If you do not agree, you must immediately discontinue use of the Service.
              </p>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">2.</span> Eligibility & Account Registration
              </h2>
              <p>
                To use SocialSync AI, you must be at least 18 years old or the age of majority in your jurisdiction. You represent and warrant that:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li>All registration details (full name, email address, billing contact details) provided are accurate, current, and complete.</li>
                <li>You will maintain the confidentiality and accuracy of your account information.</li>
                <li>You have full legal authority to bind yourself or the organization you represent.</li>
                <li>Your use of the Service complies with all applicable local, national, and international laws.</li>
              </ul>
              <p>
                Accounts created by automated bots, scrapers, or unauthorized third parties are strictly prohibited and subject to immediate termination.
              </p>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">3.</span> Account Security & Credentials
              </h2>
              <p>
                You are solely responsible for safeguarding your SocialSync AI credentials. We hash all user passwords using bcrypt with 12 salt rounds; plaintext passwords are never collected or stored.
              </p>
              <p>
                You assume full legal and operational responsibility for all posts authored, scheduled, or broadcast from your account. You agree to notify us immediately at <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 font-semibold hover:underline">sltsocialsync@gmail.com</a> if you suspect any compromise or unauthorized use of your credentials.
              </p>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">4.</span> SocialSync AI Services & Platform Scope
              </h2>
              <p>
                SocialSync AI provides a centralized dashboard for authoring, formatting, scheduling, and dispatching social media posts to supported third-party platforms. Available features include:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li>Multi-platform post creation with per-channel previews and character count validation.</li>
                <li>Automated media validation and server-side image-to-video transcoding for YouTube.</li>
                <li>Queue-based post scheduling across global timezones (standardized in SLST / Asia:Colombo).</li>
                <li>Post-delivery logging, error telemetry, and 1-click retry functionality.</li>
                <li>Optional AI Vision caption and hashtag suggestions for Professional plan subscribers.</li>
              </ul>
              <p>
                <strong>Feature Variations by Platform:</strong> Not all social networks support identical features. For example, TikTok exclusively supports video uploads; YouTube exclusively supports video formats (with automated still-image transcoding provided by our pipeline); Facebook Pages support text, images, and videos; and Threads supports text updates up to 500 characters and media. You acknowledge that feature availability depends on each platform provider's API capabilities.
              </p>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">5.</span> Connecting Social Accounts via OAuth 2.0
              </h2>
              <p>
                SocialSync AI connects to supported platforms exclusively using official OAuth 2.0 authorization protocols (and OAuth 2.0 with PKCE for TikTok). When you link an account:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li>You authenticate directly on the provider's official authorization dialog (e.g., accounts.google.com, facebook.com, instagram.com, linkedin.com, tiktok.com).</li>
                <li>SocialSync AI never receives, handles, or stores your third-party social media passwords.</li>
                <li>You grant SocialSync AI the specific, scoped permissions necessary to upload and publish posts on your behalf.</li>
                <li>You can disconnect any linked account at any time from your Accounts dashboard. Disconnection triggers an automated revocation request to the provider API and permanently deletes all stored access and refresh tokens from our database.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">6.</span> User Content & Intellectual Property Rights
              </h2>
              <p>
                <strong>You retain 100% full ownership, copyright, and title</strong> in all text captions, photographs, graphics, video files, audio tracks, hashtags, and media you author or upload through SocialSync AI ("User Content"). SocialSync AI does not claim any ownership rights over your User Content.
              </p>
              <p>
                By uploading User Content, you grant SocialSync AI a limited, worldwide, non-exclusive, royalty-free license solely to store, process, transcode (such as generating compliant 1080p MP4 videos for YouTube), and transmit your content to the destination platforms you explicitly select, strictly to fulfill your publishing instructions.
              </p>
              <p>
                You represent and warrant that you own or possess all necessary rights, licenses, model releases, and music clearances for all content you publish, and that your User Content does not infringe upon any third party’s intellectual property, privacy, or publicity rights.
              </p>
            </section>

            {/* Section 7 */}
            <section id="section-7" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">7.</span> Acceptable Use & Prohibited Conduct
              </h2>
              <p>
                You agree not to use SocialSync AI for any unlawful, deceptive, or abusive purposes. You expressly agree that you will NOT upload, author, or broadcast content that:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li>Violates copyright, trademark, trade secret, or other proprietary rights of any third party.</li>
                <li>Is defamatory, obscene, pornographic, harassing, threatening, hateful, or inciting violence against any individual or group.</li>
                <li>Contains malware, computer viruses, Trojan horses, or any automated scripts designed to compromise systems or bypass API quotas.</li>
                <li>Constitutes deceptive commercial spam, phishing, unauthorized multi-channel flooding, or repetitive automated manipulation.</li>
                <li>Violates the official developer terms, community standards, or platform rules of Meta, Google/YouTube, LinkedIn, TikTok, or Threads.</li>
                <li>Attempts to reverse-engineer, decompile, scrape, or interfere with SocialSync AI’s backend infrastructure, database, rate limiters, or billing systems.</li>
              </ul>
            </section>

            {/* Section 8 - Multi-Platform Specific Terms */}
            <section id="section-8" className="space-y-6 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">8.</span> Platform-Specific Provisions & Third-Party Requirements
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                SocialSync AI integrates with six distinct third-party social networks. Each network is operated by an independent third party and subject to its own developer policies, terms, and technical constraints. Provider names, logos, and trademarks belong exclusively to their respective owners:
              </p>

              {/* 8.1 Meta Platforms (Facebook & Instagram) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-3 shadow-xs">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>8.1 Meta Platforms (Facebook Pages & Instagram Professional)</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Facebook and Instagram integrations operate through the official Meta Graph API (v20.0). Users must abide by the <strong>Meta Commercial Terms</strong> and <strong>Meta Developer Policies</strong>.
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-2">
                  <li><strong>Facebook:</strong> SocialSync AI publishes content exclusively to <em>Facebook Pages</em> where the authenticated user holds administrative or content-publishing tasks. Personal user profiles are not supported for automated API publishing per Meta platform policy.</li>
                  <li><strong>Instagram:</strong> SocialSync AI publishes content exclusively to <em>Instagram Professional</em> (Business or Creator) accounts linked to a Facebook Page or standalone professional account. Personal/private Instagram profiles are not supported. Supported media includes single photos and video Reels/posts using Instagram Media Containers.</li>
                  <li><strong>Meta Trademarks:</strong> Facebook, Instagram, and Meta are registered trademarks of Meta Platforms, Inc. SocialSync AI is an independent software application and is not endorsed, sponsored, or certified by Meta.</li>
                </ul>
              </div>

              {/* 8.2 LinkedIn */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-3 shadow-xs">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0A66C2]"></span>
                  <span>8.2 LinkedIn Platform</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  LinkedIn integration utilizes the official LinkedIn REST API and Community Management APIs (version 202601) under OAuth 2.0 with scopes <code className="text-[11px] font-mono">openid, profile, email, w_member_social</code>. Users must comply with the <strong>LinkedIn User Agreement</strong> and <strong>LinkedIn API Terms of Use</strong>.
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-2">
                  <li>Supported publishing includes text posts, image shares, and video shares to member profiles and authorized organization pages.</li>
                  <li>LinkedIn is a registered trademark of LinkedIn Corporation and Microsoft Corporation. SocialSync AI is an independent application not affiliated with LinkedIn.</li>
                </ul>
              </div>

              {/* 8.3 Google & YouTube Data API */}
              <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/30 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400 text-sm">
                  <Video className="w-4 h-4" />
                  <span>8.3 Google & YouTube Data API Requirements</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  SocialSync AI utilizes the official <strong>YouTube Data API v3</strong> under Google OAuth 2.0. By linking your YouTube channel or publishing content to YouTube, you expressly agree to be bound by:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 dark:text-slate-300 pl-2">
                  <li>
                    The <strong>YouTube Terms of Service</strong>, accessible at:{' '}
                    <a
                      href="https://www.youtube.com/t/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-cyan-400 underline font-semibold inline-flex items-center gap-1"
                    >
                      <span>https://www.youtube.com/t/terms</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    The <strong>Google Privacy Policy</strong>, accessible at:{' '}
                    <a
                      href="http://www.google.com/policies/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-cyan-400 underline font-semibold inline-flex items-center gap-1"
                    >
                      <span>http://www.google.com/policies/privacy</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                </ul>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  YouTube exclusively accepts video media. Standalone still images are automatically transcoded to 1080p MP4 format with silent audio prior to upload. Text-only posts are rejected as unsupported by YouTube. Users can revoke SocialSync AI’s access to their Google account data at any time via{' '}
                  <a
                    href="https://security.google.com/settings/security/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-cyan-400 underline font-semibold"
                  >
                    https://security.google.com/settings/security/permissions
                  </a>.
                </p>
              </div>

              {/* 8.4 Threads (Meta) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-3 shadow-xs">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-100"></span>
                  <span>8.4 Threads Platform (Meta)</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Threads integration operates through Meta's official Threads API using OAuth 2.0 scopes <code className="text-[11px] font-mono">threads_basic, threads_content_publish</code>. Users must adhere to the <strong>Threads Terms of Use</strong> and <strong>Meta Community Standards</strong>.
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-2">
                  <li>Supports text updates (up to 500 characters), single image threads, and video threads.</li>
                  <li>Threads is a trademark of Meta Platforms, Inc. SocialSync AI is an independent software tool.</li>
                </ul>
              </div>

              {/* 8.5 TikTok */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-3 shadow-xs">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-black dark:bg-cyan-400"></span>
                  <span>8.5 TikTok for Developers</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  TikTok integration uses the official TikTok Content Posting API v2 with OAuth 2.0 and PKCE (Proof Key for Code Exchange) under scopes <code className="text-[11px] font-mono">user.info.basic, video.publish, video.upload</code>. Users must comply with the <strong>TikTok Terms of Service</strong> and <strong>TikTok Commercial Terms</strong>.
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-2">
                  <li><strong>Video Only:</strong> TikTok API exclusively supports video publishing (.mp4 or .mov format). Text-only and still-image posts are not supported for TikTok publishing.</li>
                  <li>Creator readiness checks and privacy levels (e.g. Public, Friends, Self-Only) are queried prior to chunked video upload.</li>
                  <li>TikTok is a trademark of ByteDance Ltd. SocialSync AI operates independently.</li>
                </ul>
              </div>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">9.</span> Scheduling, Delivery & Post Failures
              </h2>
              <p>
                SocialSync AI makes every commercially reasonable effort to dispatch scheduled posts at your designated date and time. However, <strong>scheduling a post does not guarantee delivery at an exact second or minute</strong>. Post dispatch depends on server queue workloads, asynchronous video transcoding, and real-time responsiveness of third-party platform endpoints.
              </p>
              <p>
                Delivery may fail or be delayed due to third-party API rate limits, revoked OAuth tokens, temporary platform outages, or invalid media dimensions. SocialSync AI enforces <strong>strict channel isolation</strong>: a failure on one network does not abort or prevent delivery to other selected channels.
              </p>
              <p>
                Users are responsible for monitoring post delivery in the Posts dashboard and initiating retries if a specific network delivery experiences an error.
              </p>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">10.</span> AI Vision & Caption Features
              </h2>
              <p>
                Subscribers to our Professional tier have access to optional AI-assisted caption generation and hashtag suggestions powered by Google Gemini and OpenAI.
              </p>
              <p>
                When using AI features, you acknowledge that AI suggestions are generated by automated statistical models and may occasionally contain inaccuracies or inappropriate phrasing. <strong>You remain solely responsible for reviewing, editing, and approving all AI-generated text</strong> before publishing it to your connected social channels. Prompts and images sent to AI APIs are processed ephemerally and are not used to train generalized AI models.
              </p>
            </section>

            {/* Section 11 */}
            <section id="section-11" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">11.</span> Plans, Credits & Payment Terms
              </h2>
              <p>
                SocialSync AI offers three subscription tiers:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-3 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-1.5 shadow-xs">
                  <div className="font-bold text-slate-900 dark:text-white text-base">Free Plan</div>
                  <div className="text-lg font-extrabold text-blue-600 dark:text-cyan-400">LKR 0 / mo</div>
                  <div className="text-slate-500 dark:text-slate-400">• 200 Monthly Credits</div>
                  <div className="text-slate-500 dark:text-slate-400">• Up to 2 Connected Accounts</div>
                  <div className="text-slate-500 dark:text-slate-400">• Multi-network Publishing</div>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-blue-500/40 dark:border-cyan-500/40 space-y-1.5 shadow-xs">
                  <div className="font-bold text-slate-900 dark:text-white text-base">Creator Plan</div>
                  <div className="text-lg font-extrabold text-blue-600 dark:text-cyan-400">LKR 1,000 / mo</div>
                  <div className="text-slate-500 dark:text-slate-400">• 500 Monthly Credits</div>
                  <div className="text-slate-500 dark:text-slate-400">• Up to 4 Connected Accounts</div>
                  <div className="text-slate-500 dark:text-slate-400">• Post Scheduling & Collage</div>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-1.5 shadow-xs">
                  <div className="font-bold text-slate-900 dark:text-white text-base">Professional</div>
                  <div className="text-lg font-extrabold text-blue-600 dark:text-cyan-400">LKR 2,500 / mo</div>
                  <div className="text-slate-500 dark:text-slate-400">• 1,500 Monthly Credits</div>
                  <div className="text-slate-500 dark:text-slate-400">• Up to 6 Accounts (All 6)</div>
                  <div className="text-slate-500 dark:text-slate-400">• AI Captions & Priority Queue</div>
                </div>
              </div>
              <p>
                Subscription payments are processed in Sri Lankan Rupees (LKR) through our certified payment partner, <strong>PayHere</strong> (or Stripe where configured). Prices exclude any statutory taxes that may apply in your jurisdiction.
              </p>
              <p>
                Publishing consumes usage credits (typically 5 to 15 credits per channel broadcast). Unused credits expire at the end of each monthly billing cycle and do not roll over to subsequent periods.
              </p>
            </section>

            {/* Section 12 */}
            <section id="section-12" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">12.</span> Subscription Renewals & Cancellation
              </h2>
              <p>
                Paid subscriptions automatically renew at the beginning of each 30-day billing cycle. You may cancel your subscription renewal at any time directly from the "My Plan" dashboard with zero penalties.
              </p>
              <p>
                When you cancel renewal:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li>Your paid plan and credit balance remain active until the end of your current 30-day billing period.</li>
                <li>Your payment card will not be billed on the next renewal date.</li>
                <li>At period end, your account automatically shifts to the Free plan tier without deleting your connected accounts or post history.</li>
              </ul>
            </section>

            {/* Section 13 */}
            <section id="section-13" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">13.</span> Refund Policy & Failed Post Credits
              </h2>
              <p>
                <strong>Subscription Fees:</strong> Because SocialSync AI grants immediate digital access to software tools, monthly credit allowances, and API dispatch capacity, subscription fees are generally non-refundable once processed, except where mandated by Sri Lankan consumer protection laws or in cases of verified billing system error. We do not provide partial-month pro-rata refunds for early cancellations.
              </p>
              <p>
                <strong>Automatic Credit Refund for Failed Deliveries:</strong> If a scheduled or immediate post dispatch fails on any destination platform due to API errors, validation failure, or network interruption, SocialSync AI’s backend automatically releases and refunds the reserved credit cost for that failed channel immediately back into your user balance.
              </p>
            </section>

            {/* Section 14 */}
            <section id="section-14" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">14.</span> Third-Party APIs & Provider Outages
              </h2>
              <p>
                SocialSync AI is an independent software application. We do not control, own, or operate Facebook, Instagram, LinkedIn, YouTube, Threads, or TikTok. You acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li>Third-party platform providers may alter their API endpoints, modify permission scopes, enforce rate limits, or suspend developer access at their sole discretion.</li>
                <li>SocialSync AI is not liable for service interruptions, post delays, post removals, or account suspensions initiated by third-party social networks.</li>
                <li>Continued integration with any provider is subject to the provider maintaining accessible public API endpoints.</li>
              </ul>
            </section>

            {/* Section 15 */}
            <section id="section-15" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">15.</span> Service Availability & Maintenance
              </h2>
              <p>
                We strive for continuous, high-availability service uptime. However, we do not guarantee 100% uninterrupted, error-free operation. SocialSync AI may perform scheduled maintenance, software updates, or emergency security patching. When feasible, maintenance windows are scheduled during low-traffic periods.
              </p>
            </section>

            {/* Section 16 */}
            <section id="section-16" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">16.</span> Suspension & Account Termination
              </h2>
              <p>
                SocialSync AI reserves the right to suspend or terminate your account and access to the Service, with or without prior notice, if you breach these Terms, engage in unlawful activity, broadcast prohibited content, or abuse the platform's infrastructure.
              </p>
              <p>
                You may terminate your account at any time via the self-service "Delete Account" button in Settings. Upon confirmation, all your User Content, OAuth tokens, and profile data are permanently wiped via an atomic database transaction.
              </p>
            </section>

            {/* Section 17 */}
            <section id="section-17" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">17.</span> Intellectual Property of SocialSync AI
              </h2>
              <p>
                Except for User Content, the Service and all materials therein, including but not limited to software code, website architecture, visual interface designs, algorithms, text, graphics, logos, and trademarks, are the exclusive intellectual property of SocialSync AI and are protected by applicable intellectual property laws.
              </p>
            </section>

            {/* Section 18 */}
            <section id="section-18" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">18.</span> Disclaimers of Warranties
              </h2>
              <p className="uppercase text-xs sm:text-sm tracking-wide font-medium bg-slate-100 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE, OR THAT POSTS WILL BE DELIVERED WITHOUT OCCASIONAL THIRD-PARTY DELAYS.
              </p>
            </section>

            {/* Section 19 */}
            <section id="section-19" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">19.</span> Limitation of Liability
              </h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SOCIALSYNC AI, ITS OPERATORS, EMPLOYEES, OR PARTNERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, LOSS OF AUDIENCE REACH, DATA LOSS, LOSS OF GOODWILL, OR THIRD-PARTY ACCOUNT SUSPENSION, RESULTING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.
              </p>
              <p>
                IN NO EVENT SHALL SOCIALSYNC AI’S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS EXCEED THE GREATER OF LKR 5,000 OR THE TOTAL AMOUNT PAID BY YOU TO SOCIALSYNC AI IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            {/* Section 20 */}
            <section id="section-20" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">20.</span> Indemnification
              </h2>
              <p>
                You agree to defend, indemnify, and hold harmless SocialSync AI, its operators, officers, and contractors from and against any claims, liabilities, damages, judgments, awards, losses, costs, or expenses (including reasonable legal fees) arising out of or relating to your violation of these Terms or your User Content published across third-party social networks.
              </p>
            </section>

            {/* Section 21 */}
            <section id="section-21" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">21.</span> Governing Law & Jurisdiction
              </h2>
              <p>
                These Terms and your use of SocialSync AI shall be governed by and construed in accordance with the substantive laws of the <strong>Democratic Socialist Republic of Sri Lanka</strong>, without giving effect to any principles of conflicts of law.
              </p>
              <p>
                Any dispute, controversy, or claim arising out of or relating to this contract, including its formation, validity, breach, or termination, shall be subject to the exclusive jurisdiction of the competent courts of Colombo, Sri Lanka.
              </p>
            </section>

            {/* Section 22 */}
            <section id="section-22" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">22.</span> Modifications & Contact Information
              </h2>
              <p>
                We reserve the right to amend or update these Terms at our sole discretion. If a revision is material, we will provide at least 15 days' notice prior to any new terms taking effect by posting an announcement on our website or sending an email notification. Continued use of the Service following the effective date of revisions constitutes acceptance of the updated Terms.
              </p>
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-2 text-xs sm:text-sm shadow-xs mt-4">
                <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                  <span>Official Contact for Legal Inquiries:</span>
                </div>
                <p><strong>Platform:</strong> SocialSync AI</p>
                <p><strong>Official Support & Legal Desk:</strong> <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline">sltsocialsync@gmail.com</a></p>
                <p><strong>Production Domain:</strong> <a href="https://socialsync.raccoon-ai.io" className="text-blue-600 dark:text-cyan-400 hover:underline">https://socialsync.raccoon-ai.io</a></p>
                <p><strong>Headquarters:</strong> Colombo, Sri Lanka</p>
              </div>
            </section>

            {/* Quick Navigation Footer Row */}
            <div className="pt-8 border-t border-[#E2E8F0] dark:border-[#334155] flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                <span>Also review:</span>
                <Link to="/privacy-policy" className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link to="/faq" className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">
                  Knowledge Base & FAQ
                </Link>
                <span>•</span>
                <Link to="/contact" className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">
                  Contact Support
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

export default TermsPage;
