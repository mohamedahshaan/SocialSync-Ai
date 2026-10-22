import React from 'react';
import { PublicNavbar } from '../components/public/PublicNavbar';
import { PublicFooter } from '../components/public/PublicFooter';
import { FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-10">
        
        {/* Header */}
        <div className="space-y-3 border-b border-[#E2E8F0] dark:border-[#334155] pb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            Terms & Conditions
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-[#475569] dark:text-slate-400">
            Last updated: October 2026 • Effective Date: October 1, 2026
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm sm:text-base text-[#475569] dark:text-slate-300 leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">1.</span> Agreement to Terms
            </h2>
            <p>
              By accessing or using <strong>SocialSync AI</strong>, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you disagree with any part of these terms, you may not access or use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">2.</span> Account Registration & Security
            </h2>
            <p>
              You must provide accurate and complete registration information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your session. Notify us immediately if you suspect unauthorized access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">3.</span> Acceptable Use & Content Policy
            </h2>
            <p>
              When authoring and broadcasting content through SocialSync AI to Facebook, Instagram, LinkedIn, YouTube, TikTok, or Threads, you agree NOT to publish:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[#475569] dark:text-slate-400 pl-2">
              <li>Content that violates copyright, trademark, or intellectual property rights.</li>
              <li>Spam, automated abuse, harassment, or malicious code.</li>
              <li>Material that breaches the Developer Policies and Community Standards of any connected third-party social network.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">4.</span> Credits, Plans & Proposed Billing
            </h2>
            <p>
              SocialSync AI features usage credit allowances across our Free (200 credits), Creator (500 credits), and Professional (1,000 credits) plan tiers. Broadcasting across your connected social channels automatically consumes credits from your account balance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">5.</span> Third-Party Social API Limitations
            </h2>
            <p>
              SocialSync AI interfaces with third-party social networks via their publicly supported developer APIs. We are not liable for service interruptions, API deprecations, rate limits, or account suspensions initiated by Meta, Google, LinkedIn, or TikTok.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">6.</span> Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, SocialSync AI and its operators shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">7.</span> Governing Law & Contact
            </h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of Sri Lanka. For questions or legal notices, contact:
            </p>
            <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-xs text-[#475569] dark:text-[#CBD5E1] space-y-1 shadow-xs">
              <p><strong>Legal Inquiries:</strong> legal@socialsync.ai (Placeholder)</p>
              <p><strong>Corporate Address:</strong> Colombo, Sri Lanka</p>
            </div>
          </section>

        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
export default TermsPage;
