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
  MessageCircle
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
    { id: 'section-3', title: '3. Google Sign-In & YouTube Data API' },
    { id: 'section-4', title: '4. Google API Limited Use Disclosure' },
    { id: 'section-5', title: '5. Other Connected Social Platforms' },
    { id: 'section-6', title: '6. AI Vision & Caption Generation' },
    { id: 'section-7', title: '7. How We Use Information' },
    { id: 'section-8', title: '8. OAuth Token Storage & Security' },
    { id: 'section-9', title: '9. Data Sharing & Third-Party Providers' },
    { id: 'section-10', title: '10. Data Retention & Media Lifespan' },
    { id: 'section-11', title: '11. Account Disconnection & Revocation' },
    { id: 'section-12', title: '12. Permanent Account Deletion' },
    { id: 'section-13', title: '13. User Rights & Data Sovereignty' },
    { id: 'section-14', title: '14. International Data Processing' },
    { id: 'section-15', title: '15. Children\'s Privacy' },
    { id: 'section-16', title: '16. Changes & Contact Information' }
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
              Privacy & Data Protection
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

            {/* Google API Compliance Highlight Box */}
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
                Welcome to <strong>SocialSync AI</strong> ("we", "our", or "us"). SocialSync AI is an enterprise-grade multi-platform social media publishing, scheduling, and management SaaS platform operating from Colombo, Sri Lanka, accessible at <a href="https://socialsync.raccoon-ai.io" className="text-blue-600 dark:text-cyan-400 hover:underline">https://socialsync.raccoon-ai.io</a>.
              </p>
              <p>
                We are committed to maintaining the highest standards of data privacy, user autonomy, and security. This Privacy Policy describes how we collect, store, process, protect, and delete your personal data when you use our website, authenticated application, and associated API services.
              </p>
              <p>
                By creating an account, authenticating via Google Sign-In, or connecting third-party social media accounts, you acknowledge the data handling practices described in this Privacy Policy.
              </p>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">2.</span> Information We Collect
              </h2>
              <p>
                To provide account authentication, multi-network social broadcasting, and subscription billing, SocialSync AI collects only the minimal required information:
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
                    When you link social networks (Facebook, Instagram, LinkedIn, YouTube, TikTok, Threads), we receive public channel/page metadata (platform user ID, page or channel name, handle, avatar URL) and official scoped OAuth 2.0 access and refresh tokens. We never receive or store your social network passwords.
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

            {/* Section 3 - Google Sign-In & YouTube Data API */}
            <section id="section-3" className="space-y-4 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">3.</span> Google Sign-In & YouTube Data API Integration
              </h2>
              <p>
                SocialSync AI integrates with Google services through official OAuth 2.0 authorization flows. Here is exactly what data is accessed, why it is accessed, and how it is handled:
              </p>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-2 shadow-xs">
                  <div className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                    <span>Google Sign-In Authentication (OAuth 2.0 / OIDC)</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong>Scopes Requested:</strong> <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">openid</code>, <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">email</code>, <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">profile</code>.
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong>Purpose & Data Accessed:</strong> Used exclusively to authenticate your identity and provision your user account. SocialSync AI receives your Google unique subject ID (<code className="text-[11px] font-mono">sub</code>), verified email address, full name, and avatar picture URL. SocialSync AI does not receive, handle, or store your Google account password.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] space-y-2 shadow-xs">
                  <div className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                    <span>YouTube Channel Connection & Video Upload (YouTube Data API v3)</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong>Scopes Requested:</strong>{' '}
                    <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">https://www.googleapis.com/auth/youtube.upload</code> and{' '}
                    <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">https://www.googleapis.com/auth/youtube.readonly</code>.
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong>Purpose & Data Accessed:</strong> The <code className="text-[11px] font-mono">youtube.upload</code> scope is requested strictly to upload your authored video files and YouTube Shorts to your connected channel when you click "Publish" or schedule a post. The <code className="text-[11px] font-mono">youtube.readonly</code> scope queries only your channel's public metadata (channel ID, channel title, custom URL, and channel icon) via the YouTube Data API <code className="text-[11px] font-mono">channels.list(part=snippet)</code> endpoint so that your connected channel appears accurately in your SocialSync AI dashboard.
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    SocialSync AI does NOT access, read, or modify private user emails, private YouTube subscriber lists, personal watch history, or private search history.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 - Google API Limited Use Policy Disclosure */}
            <section id="section-4" className="space-y-4 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">4.</span> Google API Services User Data Policy — Limited Use Disclosure
              </h2>
              <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border-2 border-blue-500/30 space-y-4 shadow-sm text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white text-base">
                  SocialSync AI explicitly complies with the Google API Services User Data Policy, including the Limited Use requirements:
                </p>
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Strict Service Delivery Only:</strong> Information received from Google APIs is used strictly to provide or improve user-facing features that are prominent in SocialSync AI’s user interface (such as authenticating your session, displaying your connected channel name, and dispatching videos you authored).
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 dark:text-white">No Transfer for Advertising:</strong> SocialSync AI never transfers Google user data to third parties for serving advertisements, retargeting campaigns, data brokerage, or interest-based advertising.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 dark:text-white">No Unauthorized Third-Party Transfers:</strong> We do not transfer Google user data to third parties unless strictly necessary to provide the service, comply with applicable law, or as part of a merger or acquisition with prior user notification.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Prohibition on AI/ML Model Training:</strong> SocialSync AI explicitly does <strong>NOT</strong> use Google user data to train, fine-tune, retrain, or improve generalized artificial intelligence (AI) or machine learning (ML) models.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Restricted Human Access:</strong> No human is permitted to read user Google data unless: (1) we have obtained the user's explicit affirmative agreement for specific troubleshooting, (2) it is required for security investigations of abuse, (3) it is required by law, or (4) the data is aggregated and anonymized for internal system analytics.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">5.</span> Other Connected Social Platforms
              </h2>
              <p>
                In addition to Google and YouTube, SocialSync AI connects with the following official social network APIs using scoped OAuth 2.0 authorization:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li><strong>Meta Graph API (Facebook & Instagram):</strong> Requests <code className="text-[11px] font-mono">pages_show_list, pages_read_engagement, pages_manage_posts, instagram_business_basic, instagram_business_content_publish</code> to broadcast your posts and stories to your authorized Facebook Pages and Instagram accounts.</li>
                <li><strong>LinkedIn REST API:</strong> Requests <code className="text-[11px] font-mono">openid, profile, email, w_member_social</code> to publish authored text and media posts to your LinkedIn profile or organization page.</li>
                <li><strong>TikTok for Developers:</strong> Requests <code className="text-[11px] font-mono">user.info.basic, video.publish, video.upload</code> to publish video posts to your authorized TikTok creator account.</li>
                <li><strong>Threads API:</strong> Requests official publishing permissions to broadcast text and image updates to your Threads feed.</li>
              </ul>
              <p>
                Tokens and permissions granted by these platforms are used exclusively for your direct publishing and scheduling requests and are never shared or sold.
              </p>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">6.</span> AI Vision & Caption Generation
              </h2>
              <p>
                Subscribers to our Professional plan have access to optional AI Caption Generation and Vision features. When you submit a prompt or image to generate post captions:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li>The prompt or image is transmitted via secure, encrypted server-to-server API to our AI API providers (Google Gemini or OpenAI).</li>
                <li>Data submitted to AI APIs is processed ephemerally solely to return the requested caption suggestion and hashtags.</li>
                <li>Your prompts are not stored permanently by third-party AI providers, nor are they used by SocialSync AI to train generalized AI models.</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section id="section-7" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">7.</span> How We Use Information
              </h2>
              <p>
                SocialSync AI processes your data exclusively for legitimate operational purposes:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li><strong>Publishing & Delivery:</strong> Transmitting your authored posts, images, and videos to your chosen destination networks at your instructed times.</li>
                <li><strong>Media Optimization:</strong> Transcoding media (such as generating compliant 1080p MP4 videos with silent audio from still images for YouTube) to satisfy target platform requirements.</li>
                <li><strong>Account Authentication:</strong> Verifying your identity, issuing secure session JWTs, and enforcing role-based permissions.</li>
                <li><strong>Billing & Credits:</strong> Tracking monthly credit consumption, provisioning plan allowances, processing renewal payments via PayHere, and automatically refunding credits for failed post dispatches.</li>
                <li><strong>Customer Support:</strong> Diagnosing delivery errors, reviewing transaction receipts, and answering technical inquiries sent to <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline">sltsocialsync@gmail.com</a>.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="section-8" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">8.</span> OAuth Token Storage & Security
              </h2>
              <p>
                We implement robust, defense-in-depth technical safeguards to protect your account and tokens:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li><strong>Database Isolation:</strong> OAuth tokens and user records are stored in PostgreSQL running on an internal, private Docker network with no direct public host port exposure.</li>
                <li><strong>Encrypted Transport:</strong> All communication between your browser, our backend, and third-party APIs (Meta, Google, LinkedIn, TikTok) occurs over TLS 1.3 encrypted HTTPS channels.</li>
                <li><strong>Password Protection:</strong> Passwords are cryptographically hashed using bcrypt with 12 salt rounds before database storage. Plaintext passwords never touch our database.</li>
                <li><strong>Backend Security Headers:</strong> The application enforces strict HTTP security headers via Helmet and Nginx, including CORS origin restrictions and cross-origin resource policies.</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">9.</span> Data Sharing & Third-Party Service Providers
              </h2>
              <p>
                SocialSync AI does NOT sell, rent, monetize, or trade your personal data or OAuth credentials. We share data only with verified sub-processors necessary to operate the Service:
              </p>
              <div className="overflow-x-auto my-3">
                <table className="w-full text-left text-xs sm:text-sm border border-[#E2E8F0] dark:border-[#334155] rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                    <tr>
                      <th className="p-3 border-b border-[#E2E8F0] dark:border-[#334155]">Service Provider</th>
                      <th className="p-3 border-b border-[#E2E8F0] dark:border-[#334155]">Purpose</th>
                      <th className="p-3 border-b border-[#E2E8F0] dark:border-[#334155]">Data Shared</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155] text-slate-600 dark:text-slate-400">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">PayHere</td>
                      <td className="p-3">Payment gateway processing in LKR</td>
                      <td className="p-3">Billing contact (name, email, phone, city), order ID, amount</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Google / YouTube API</td>
                      <td className="p-3">Sign-In & video publishing</td>
                      <td className="p-3">OAuth credentials, video files, post captions (for YouTube posts)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Meta / LinkedIn / TikTok</td>
                      <td className="p-3">Social media post broadcasting</td>
                      <td className="p-3">OAuth access tokens, post text, uploaded media</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Google Gemini / OpenAI</td>
                      <td className="p-3">AI caption generation (opt-in)</td>
                      <td className="p-3">User caption prompt or attached image (ephemeral)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Gmail SMTP Service</td>
                      <td className="p-3">Transactional emails & OTPs</td>
                      <td className="p-3">Recipient email, password reset tokens/OTPs</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">10.</span> Data Retention & Media Lifespan
              </h2>
              <p>
                We retain your data in accordance with clear operational policies:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li><strong>Account Data:</strong> Retained while your account remains active. Stale pending checkout sessions are automatically expired after 30 minutes.</li>
                <li><strong>Uploaded Media Files:</strong> Images and videos uploaded to schedule posts are stored on the server's persistent storage volume to fulfill scheduling and publishing. When a post is deleted, its linked media references are removed.</li>
                <li><strong>OAuth Tokens:</strong> Retained until you disconnect the social account or delete your SocialSync AI account.</li>
                <li><strong>Financial Records:</strong> Transaction references and invoices are retained for legal, tax, and accounting compliance under Sri Lankan business regulations, but are permanently disassociated from personal identity (<code className="text-[11px] font-mono">payment.userId = null</code>) upon user account deletion.</li>
              </ul>
            </section>

            {/* Section 11 */}
            <section id="section-11" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">11.</span> Account Disconnection & Token Revocation
              </h2>
              <p>
                You maintain sovereign control over all linked social media accounts:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li><strong>Immediate Local Deletion:</strong> Clicking "Disconnect" in the Accounts manager deletes the connection record and all stored access and refresh tokens from our database immediately.</li>
                <li><strong>Provider-Side Revocation:</strong> When disconnecting a YouTube channel, SocialSync AI calls Google’s revocation API (<code className="text-[11px] font-mono">https://oauth2.googleapis.com/revoke?token=...</code>) to invalidate the token at Google. Similar revocation calls are executed for Meta, LinkedIn, and TikTok.</li>
                <li><strong>Google Security Settings:</strong> You can also revoke SocialSync AI's access at any time directly through Google’s official Security Settings at{' '}
                  <a
                    href="https://security.google.com/settings/security/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-cyan-400 underline font-semibold"
                  >
                    https://security.google.com/settings/security/permissions
                  </a>.
                </li>
              </ul>
            </section>

            {/* Section 12 */}
            <section id="section-12" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">12.</span> Permanent Account Deletion (Right to Erasure)
              </h2>
              <p>
                You have the absolute right to permanently delete your SocialSync AI account and all associated data at any time without contacting support:
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
                  <li>All connected social accounts and stored OAuth access/refresh tokens.</li>
                  <li>All authored posts, scheduled publishing jobs, platform statuses, and drafts.</li>
                  <li>All subscription records, trial records, and plan change history.</li>
                  <li>All password reset tokens and OTP verification records.</li>
                  <li>All user-specific admin audit logs.</li>
                </ul>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  * A non-identifying cryptographic SHA-256 hash of the deleted user ID is recorded in <code className="font-mono">AccountDeletionEvent</code> containing zero personally identifiable information, strictly for anonymous churn metrics and legal accounting compliance.
                </p>
              </div>
            </section>

            {/* Section 13 */}
            <section id="section-13" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">13.</span> User Rights & Data Sovereignty
              </h2>
              <p>
                Regardless of your geographic location, SocialSync AI affords you clear rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                <li><strong>Right of Access:</strong> You can review your profile, connected accounts, posts, and payment receipts at any time in your dashboard.</li>
                <li><strong>Right to Rectification:</strong> You can edit your profile name, email, billing contact details, and password directly in Settings.</li>
                <li><strong>Right to Erasure:</strong> You can delete any post, disconnect any social account, or delete your entire account permanently via self-service controls.</li>
                <li><strong>Right to Restrict or Object:</strong> You can disconnect third-party integrations or opt out of optional AI captioning at any time.</li>
              </ul>
              <p>
                To exercise any additional data subject rights or request an export of your account data, email our privacy desk at <a href="mailto:sltsocialsync@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">sltsocialsync@gmail.com</a>.
              </p>
            </section>

            {/* Section 14 */}
            <section id="section-14" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">14.</span> International Data Processing
              </h2>
              <p>
                SocialSync AI is operated from Sri Lanka. If you access the Service from outside Sri Lanka, please be aware that your information may be processed in server environments located across multiple jurisdictions to deliver multi-platform API dispatches. By using SocialSync AI, you consent to the processing of your data in accordance with this Privacy Policy and international industry security standards.
              </p>
            </section>

            {/* Section 15 */}
            <section id="section-15" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">15.</span> Children's Privacy
              </h2>
              <p>
                SocialSync AI is an enterprise-oriented social media management platform and is not directed to children under the age of 18. We do not knowingly collect or solicit personal information from minors. If we discover that a user under 18 has provided us with personal information, we will immediately delete their account and associated data.
              </p>
            </section>

            {/* Section 16 */}
            <section id="section-16" className="space-y-3 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
                <span className="text-blue-600 dark:text-cyan-400">16.</span> Changes to This Privacy Policy & Contact Information
              </h2>
              <p>
                We may periodically update this Privacy Policy to reflect enhancements in our features, changes in third-party API requirements, or evolving legal standards. Any revisions will be published on this page with an updated "Last Updated" timestamp. We encourage you to review this policy periodically.
              </p>
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
