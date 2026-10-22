import React from 'react';
import { PublicNavbar } from '../components/public/PublicNavbar';
import { PublicFooter } from '../components/public/PublicFooter';
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-10">
        
        {/* Header */}
        <div className="space-y-3 border-b border-[#E2E8F0] dark:border-slate-800 pb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Legal & Data Protection
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#475569] dark:text-slate-400">
            Last updated: October 2026 • Effective Date: October 1, 2026
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm sm:text-base text-[#475569] dark:text-slate-300 leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">1.</span> Introduction
            </h2>
            <p>
              Welcome to <strong>SocialSync AI</strong> ("we", "our", or "us"). We are committed to protecting your personal information and respecting your privacy. This Privacy Policy details our practices concerning data collection, usage, and protection when you use our multi-platform social management platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">2.</span> Information We Collect
            </h2>
            <p>
              To deliver our SaaS services, we collect only the information necessary to provide account access and social media publishing capabilities:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#475569] dark:text-slate-400 pl-2">
              <li><strong>Account Credentials:</strong> Full name, email address, and cryptographically hashed passwords (using bcrypt with 12 salt rounds). Plain-text passwords are never collected or stored.</li>
              <li><strong>OAuth Authorization Tokens:</strong> When you connect Facebook, Instagram, LinkedIn, YouTube, TikTok, or Threads, we obtain scoped OAuth 2.0 access and refresh tokens. We never receive or store your social account passwords.</li>
              <li><strong>Uploaded Media & Content:</strong> Text captions, images, and videos that you explicitly upload to schedule or broadcast across your accounts.</li>
              <li><strong>System Logs:</strong> Non-sensitive metadata including operation timestamps, publishing HTTP status codes, and error telemetry.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">3.</span> How We Use Your Data
            </h2>
            <p>
              Your data is exclusively utilized to operate your SocialSync AI service:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[#475569] dark:text-slate-400 pl-2">
              <li>To broadcast your authored content to your selected social platforms via official APIs.</li>
              <li>To perform automatic media transcoding (such as image-to-MP4 video formatting for YouTube).</li>
              <li>To track your plan usage and credit consumption.</li>
              <li>To authenticate your session via JSON Web Tokens (JWT).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">4.</span> OAuth Token Security & Third-Party Platforms
            </h2>
            <p>
              All communication with third-party social platforms (Meta, Google, LinkedIn, TikTok) occurs over encrypted TLS connections using official API specifications. SocialSync AI does not sell, lease, or distribute your account data or tokens to any third-party marketing entities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">5.</span> Data Retention & Account Deletion
            </h2>
            <p>
              You maintain total sovereignty over your data. You may disconnect any linked social account at any time via your dashboard, which immediately revokes and invalidates stored access tokens. You may also request complete account deletion by contacting our privacy officer.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-cyan-400">6.</span> Contact Our Privacy Team
            </h2>
            <p>
              If you have any questions, inquiries, or privacy concerns regarding this policy, please reach out to:
            </p>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#475569] dark:text-slate-300 space-y-1 shadow-xs">
              <p><strong>Email:</strong> privacy@socialsync.ai (Placeholder)</p>
              <p><strong>Support Desk:</strong> support@socialsync.ai</p>
              <p><strong>Location:</strong> Colombo, Sri Lanka</p>
            </div>
          </section>

        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
export default PrivacyPolicyPage;
