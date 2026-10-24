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
  Building
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
    { id: 'section-3', title: '3. Account Security & Responsibilities' },
    { id: 'section-4', title: '4. Acceptable Use & Prohibited Conduct' },
    { id: 'section-5', title: '5. User Content & Intellectual Property' },
    { id: 'section-6', title: '6. Connected Social Media Accounts' },
    { id: 'section-7', title: '7. Google & YouTube API Terms' },
    { id: 'section-8', title: '8. Scheduling & Publishing Limitations' },
    { id: 'section-9', title: '9. Plans, Credits & Payment Terms' },
    { id: 'section-10', title: '10. Subscription Renewals & Cancellation' },
    { id: 'section-11', title: '11. Refund Policy & Failed Post Credits' },
    { id: 'section-12', title: '12. Third-Party Platforms & API Outages' },
    { id: 'section-13', title: '13. Service Availability & Maintenance' },
    { id: 'section-14', title: '14. Account Suspension & Termination' },
    { id: 'section-15', title: '15. Intellectual Property of SocialSync AI' },
    { id: 'section-16', title: '16. Disclaimers of Warranties' },
    { id: 'section-17', title: '17. Limitation of Liability' },
    { id: 'section-18', title: '18. Indemnification' },
    { id: 'section-19', title: '19. Governing Law & Jurisdiction' },
    { id: 'section-20', title: '20. Changes to Terms & Contact Info' }
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
              Legal & Terms of Service
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-sm sm:text-base text-[#475569] dark:text-slate-300">
              Last Updated: October 24, 2026 • Effective Date: October 1, 2026
            </p>
          </div>

          {/* Print / Export Action */}
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
                Table of Contents
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
                Need help? <Link to="/contact" className="text-blue-600 dark:text-cyan-400 hover:underline">Contact Desk</Link>
              </div>
            </div>
          </aside>

          {/* Main Legal Content */}
          <div className="lg:col-span-3 space-y-10 text-sm sm:text-base text-[#475569] dark:text-slate-300 leading-relaxed">

            {/* Introductory Summary Card */}
            <div className="p-6 sm:p-7 rounded-2xl bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 text-slate-700 dark:text-slate-300 space-y-3">
              <h3 className="font-bold text-[#0F172A] dark:text-white text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-cyan-400 shrink-0" />
                <span>Important Notice Regarding Social Media Publishing</span>
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed">
                SocialSync AI is an independent software-as-a-service application operated from Sri Lanka (accessible at <span className="font-mono text-blue-600 dark:text-cyan-400">https://socialsync.raccoon-ai.io</span>). By creating an account, connecting social media accounts, or broadcasting content, you confirm that you own or possess valid licenses for all content you publish, and agree to abide by these Terms, our <Link to="/privacy-policy" className="text-blue-600 dark:text-cyan-400 underline font-semibold">Privacy Policy</Link>, and the developer terms of each connected third-party platform.
              </p>
            </div>

            {/* Section 1 */}
            <section id="section-1" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">1.</span> Agreement to Terms
              </h2>
              <p>
                These Terms and Conditions ("Terms", "Agreement") constitute a legally binding agreement between you (whether individually or on behalf of an entity, "User", "you") and <strong>SocialSync AI</strong> ("SocialSync AI", "we", "us", or "our"), governing your access to and use of the website at <a href="https://socialsync.raccoon-ai.io" className="text-blue-600 dark:text-cyan-400 hover:underline">https://socialsync.raccoon-ai.io</a>, our web application, backend application programming interfaces (APIs), and related software services (collectively, the "Service").
              </p>
              <p>
                By registering for an account, accessing the application, connecting third-party social media accounts, or scheduling posts, you acknowledge that you have read, understood, and agreed to be bound by all of these Terms. If you do not agree with all of these Terms, you are expressly prohibited from using the Service and must immediately discontinue use.
              </p>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">2.</span> Eligibility & Account Registration
              </h2>
              <p>
                To access and use SocialSync AI, you must be at least 18 years of age or the age of legal majority in your jurisdiction. By registering, you represent and warrant that:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
                <li>All registration information you submit is truthful, accurate, current, and complete.</li>
                <li>You will maintain the accuracy of such information and promptly update it when changes occur.</li>
                <li>You have the legal capacity and authority to enter into these Terms on behalf of yourself or the commercial organization you represent.</li>
                <li>Your use of the Service does not violate any applicable local, national, or international law or regulation.</li>
              </ul>
              <p>
                Users are permitted one primary user account. Automated mass account creation, bot registration, and unauthorized account reselling are strictly prohibited.
              </p>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">3.</span> Account Security & Responsibilities
              </h2>
              <p>
                You are responsible for safeguarding your SocialSync AI credentials and maintaining the confidentiality of your password and authentication tokens. You agree not to disclose your password to any third party.
              </p>
              <p>
                You accept full legal responsibility for all activities, posts, scheduled broadcasts, and credit transactions that occur under your account. You agree to notify us immediately at <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">sltsocialsync@gmail.com</a> if you discover or suspect any unauthorized access, security incident, or breach of your account.
              </p>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">4.</span> Acceptable Use & Prohibited Conduct
              </h2>
              <p>
                You agree to use SocialSync AI only for lawful content distribution in compliance with all relevant laws, copyright standards, and social media community guidelines. You expressly agree that you will NOT use the Service to upload, author, or broadcast content that:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
                <li>Infringes any patent, trademark, trade secret, copyright, right of publicity, or other intellectual property or proprietary right of any party.</li>
                <li>Is fraudulent, deceptive, defamatory, obscene, pornographic, harassing, hateful, threatening, or inciting violence against individuals or groups.</li>
                <li>Contains software viruses, malware, trojans, worms, or any automated scripts designed to disrupt, overload, or compromise computer systems or social media APIs.</li>
                <li>Constitutes unsolicited spam, commercial chain messages, deceptive phishing, or repetitive multi-channel bulk abuse.</li>
                <li>Violates the official terms of service, developer guidelines, or acceptable use rules of any connected social platform, including Meta, Google/YouTube, LinkedIn, TikTok, or Threads.</li>
                <li>Attempts to reverse-engineer, decompile, crawl, or tamper with SocialSync AI’s backend software, authentication tokens, rate limiters, or billing infrastructure.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">5.</span> User Content & Intellectual Property Rights
              </h2>
              <p>
                <strong>You retain 100% full ownership, title, and intellectual property rights</strong> in all text, captions, photographs, graphics, videos, hashtags, and media you author or upload through SocialSync AI ("User Content"). SocialSync AI does not claim any ownership rights over your User Content.
              </p>
              <p>
                By uploading User Content to SocialSync AI, you grant SocialSync AI a non-exclusive, worldwide, royalty-free, limited license solely to store, process, reformat, transcode (such as converting images to MP4 for YouTube), and transmit your content to the third-party social media platforms you explicitly select, strictly for the purpose of fulfilling your broadcasting instructions.
              </p>
              <p>
                You represent and warrant that you own or have obtained all necessary licenses, permissions, model releases, and rights to broadcast your User Content publicly across each selected destination channel.
              </p>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">6.</span> Connected Social Media Accounts & OAuth
              </h2>
              <p>
                SocialSync AI integrates with third-party social media platforms via official OAuth 2.0 authorization code workflows. When you link a Facebook Page, Instagram account, LinkedIn profile/company page, YouTube channel, TikTok account, or Threads account:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
                <li>You authorize SocialSync AI to access and store the scoped OAuth access tokens and refresh tokens provided by that platform.</li>
                <li>You authorize SocialSync AI to transmit posts and video content to that platform on your behalf in accordance with your scheduling settings.</li>
                <li>You acknowledge that you must maintain an active, valid account in good standing with each connected third-party platform.</li>
                <li>You can disconnect any linked account at any time via your dashboard, which triggers token revocation and permanent local record deletion.</li>
              </ul>
            </section>

            {/* Section 7 - Callout for Google & YouTube */}
            <section id="section-7" className="space-y-4 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">7.</span> Google & YouTube API Terms of Service
              </h2>
              <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/30 space-y-3 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400 text-sm">
                  <Video className="w-4 h-4" />
                  <span>Mandatory YouTube API Services Disclosure</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed">
                  SocialSync AI utilizes the official <strong>YouTube Data API v3</strong> to allow users to connect YouTube channels and publish video content and Shorts. By connecting your YouTube account or using YouTube features in SocialSync AI, you acknowledge and agree that you are also bound by:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm pl-2">
                  <li>
                    The <strong>YouTube Terms of Service</strong>, accessible at:{' '}
                    <a
                      href="https://www.youtube.com/t/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold inline-flex items-center gap-1"
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
                      className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <span>http://www.google.com/policies/privacy</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                </ul>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Users can view and revoke SocialSync AI's access to their Google account data at any time via Google’s official Security Settings page at{' '}
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
            </section>

            {/* Section 8 */}
            <section id="section-8" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">8.</span> Scheduling & Publishing Limitations
              </h2>
              <p>
                While SocialSync AI makes every commercially reasonable effort to dispatch scheduled posts at your designated date and time, <strong>scheduling a post does not guarantee delivery at an exact second or minute</strong>. Post dispatch depends on server queue workloads, asynchronous media transcoding, and the real-time operational status of each destination social network.
              </p>
              <p>
                Publishing may be delayed, degraded, or rejected due to:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600 dark:text-slate-400">
                <li>Expired, invalid, or revoked platform OAuth access tokens.</li>
                <li>Temporary platform API rate limiting or anti-spam throttles applied by Meta, Google, LinkedIn, or TikTok.</li>
                <li>Third-party platform outages, service maintenance, or breaking API deprecations.</li>
                <li>Media files exceeding target platform specifications (e.g. video bitrates, dimension ratios, or max file size).</li>
              </ul>
              <p>
                Users remain responsible for reviewing the status of their posts in the Posts dashboard and executing retries if a specific network delivery experiences an error.
              </p>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">9.</span> Plans, Credits & Payment Terms
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
                Payments for paid subscriptions are processed in Sri Lankan Rupees (LKR) through our certified payment gateway partner, <strong>PayHere</strong> (or Stripe where configured). Prices are exclusive of any statutory taxes that may apply in your jurisdiction.
              </p>
              <p>
                Credits are consumable publishing units deducted upon each post broadcast (typically 5 to 15 credits per channel). Credits expire at the end of each monthly billing period and do not roll over to subsequent months unless explicitly stated in your plan terms.
              </p>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">10.</span> Subscription Renewals & Cancellation
              </h2>
              <p>
                Paid subscriptions automatically renew at the beginning of each 30-day billing cycle unless you cancel the renewal prior to the renewal date. You may cancel your subscription at any time with zero penalty directly from the "My Plan" page in your dashboard.
              </p>
              <p>
                When you cancel auto-renewal:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
                <li>Your paid plan and credit balance remain active until the conclusion of your current 30-day paid billing cycle.</li>
                <li>Your payment card will not be charged on the next billing date.</li>
                <li>At the end of the billing period, your account automatically transitions to the Free plan tier without deleting your connected accounts or post history.</li>
              </ul>
            </section>

            {/* Section 11 */}
            <section id="section-11" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">11.</span> Refund Policy & Failed Post Credits
              </h2>
              <p>
                <strong>Subscription Fees:</strong> Because SocialSync AI grants immediate digital access to software features, monthly credit allocations, and API routing capacity, subscription payments are generally non-refundable once processed, except as mandated by the Consumer Affairs Authority Act of Sri Lanka or in cases of proven billing system error. We do not provide partial-month pro-rata refunds for early cancellations.
              </p>
              <p>
                <strong>Automatic Credit Refund for Failed Deliveries:</strong> If a scheduled or immediate post dispatch fails on any destination platform due to API errors, network interruptions, or validation failure, SocialSync AI’s backend automatically releases and refunds the reserved credit cost for that failed channel immediately back to your user account balance.
              </p>
            </section>

            {/* Section 12 */}
            <section id="section-12" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">12.</span> Third-Party Platforms & API Outages
              </h2>
              <p>
                SocialSync AI is an independent SaaS provider. Our Service connects with third-party social networks through their developer APIs. You acknowledge and agree that:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
                <li>SocialSync AI is not affiliated with, endorsed by, or sponsored by Meta Platforms, Google LLC, Alphabet Inc., YouTube, LinkedIn Corporation, Microsoft Corporation, ByteDance Ltd., or TikTok.</li>
                <li>Third-party social platforms may alter their API endpoints, modify permission scopes, enforce rate limits, or terminate developer access at any time at their sole discretion.</li>
                <li>SocialSync AI is not liable for any disruptions, delays, post removals, or account suspensions initiated by third-party social networks.</li>
              </ul>
            </section>

            {/* Section 13 */}
            <section id="section-13" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">13.</span> Service Availability & Maintenance
              </h2>
              <p>
                We strive for continuous, high-availability service uptime. However, we do not guarantee uninterrupted, error-free, or 100% continuous availability. SocialSync AI may perform scheduled maintenance, software upgrades, database indexing, or emergency security patches. When feasible, maintenance windows are scheduled during low-traffic periods.
              </p>
            </section>

            {/* Section 14 */}
            <section id="section-14" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">14.</span> Account Suspension & Termination
              </h2>
              <p>
                SocialSync AI reserves the right to suspend or terminate your account and access to the Service, with or without prior notice, if you breach these Terms, engage in unlawful activity, broadcast prohibited content, or abuse the platform's infrastructure.
              </p>
              <p>
                You may terminate your account at any time via the self-service "Delete Account" button in User Settings. Upon deletion, all your User Content, OAuth tokens, and profile data are permanently wiped via an atomic transaction.
              </p>
            </section>

            {/* Section 15 */}
            <section id="section-15" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">15.</span> Intellectual Property of SocialSync AI
              </h2>
              <p>
                Except for User Content, the Service and all materials therein, including but not limited to software code, website architecture, visual interface designs, algorithms, text, graphics, logos, and trademarks, are the exclusive intellectual property of SocialSync AI and are protected by applicable intellectual property laws.
              </p>
            </section>

            {/* Section 16 */}
            <section id="section-16" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">16.</span> Disclaimers of Warranties
              </h2>
              <p className="uppercase text-xs sm:text-sm tracking-wide font-medium bg-slate-100 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE, OR THAT POSTS WILL BE DELIVERED WITHOUT OCCASIONAL THIRD-PARTY DELAYS.
              </p>
            </section>

            {/* Section 17 */}
            <section id="section-17" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">17.</span> Limitation of Liability
              </h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SOCIALSYNC AI, ITS DIRECTORS, EMPLOYEES, OR PARTNERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, LOSS OF AUDIENCE REACH, DATA LOSS, LOSS OF GOODWILL, OR THIRD-PARTY ACCOUNT SUSPENSION, RESULTING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.
              </p>
              <p>
                IN NO EVENT SHALL SOCIALSYNC AI’S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS EXCEED THE GREATER OF LKR 5,000 OR THE TOTAL AMOUNT PAID BY YOU TO SOCIALSYNC AI IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            {/* Section 18 */}
            <section id="section-18" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">18.</span> Indemnification
              </h2>
              <p>
                You agree to defend, indemnify, and hold harmless SocialSync AI, its operators, officers, and contractors from and against any claims, liabilities, damages, judgments, awards, losses, costs, or expenses (including reasonable legal fees) arising out of or relating to your violation of these Terms or your User Content published across third-party social networks.
              </p>
            </section>

            {/* Section 19 */}
            <section id="section-19" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">19.</span> Governing Law & Jurisdiction
              </h2>
              <p>
                These Terms and your use of SocialSync AI shall be governed by and construed in accordance with the substantive laws of the <strong>Democratic Socialist Republic of Sri Lanka</strong>, without giving effect to any principles of conflicts of law.
              </p>
              <p>
                Any dispute, controversy, or claim arising out of or relating to this contract, including its formation, validity, breach, or termination, shall be subject to the exclusive jurisdiction of the competent courts of Colombo, Sri Lanka.
              </p>
            </section>

            {/* Section 20 */}
            <section id="section-20" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">20.</span> Changes to Terms & Contact Information
              </h2>
              <p>
                We reserve the right to amend or replace these Terms at our sole discretion. If a revision is material, we will provide at least 15 days' notice prior to any new terms taking effect by posting an announcement on our website or sending an email notification. Continued use of the Service following the effective date of revisions constitutes acceptance of the updated Terms.
              </p>
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-2 text-xs sm:text-sm shadow-xs mt-4">
                <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                  <span>Official Contact for Legal Inquiries:</span>
                </div>
                <p><strong>Platform:</strong> SocialSync AI</p>
                <p><strong>Official Support & Legal Desk:</strong> <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline">sltsocialsync@gmail.com</a></p>
                <p><strong>Production Domain:</strong> <a href="https://socialsync.raccoon-ai.io" className="text-blue-600 dark:text-cyan-400 hover:underline">https://socialsync.raccoon-ai.io</a></p>
                <p><strong>Corporate Base:</strong> Colombo, Sri Lanka</p>
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
