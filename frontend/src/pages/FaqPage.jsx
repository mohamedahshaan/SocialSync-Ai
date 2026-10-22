import React, { useState } from 'react';
import { PublicNavbar } from '../components/public/PublicNavbar';
import { PublicFooter } from '../components/public/PublicFooter';
import { HelpCircle, ChevronDown, Sparkles, MessageCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FaqPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItems, setOpenItems] = useState({ '0': true });

  const categories = [
    { id: 'all', name: 'All Questions' },
    { id: 'publishing', name: 'Multi-Publishing' },
    { id: 'accounts', name: 'Accounts & OAuth' },
    { id: 'credits', name: 'Credits & Plans' },
    { id: 'media', name: 'Media & Video' }
  ];

  const allFaqs = [
    {
      category: 'publishing',
      q: 'How does SocialSync AI broadcast content across multiple platforms?',
      a: 'SocialSync AI communicates directly with official social media developer APIs using secure scoped OAuth 2.0 tokens. When you click Publish, our backend dispatches the payload to Facebook, Instagram, LinkedIn, YouTube, TikTok, and Threads simultaneously, tracking individual delivery statuses.'
    },
    {
      category: 'publishing',
      q: 'Can I schedule posts for future delivery?',
      a: 'Yes! Automated scheduling is included in both our Creator and Professional plan tiers. You can designate your desired date, time, and target platforms, and our automated queue processor executes delivery accurately across all timezones.'
    },
    {
      category: 'publishing',
      q: 'What happens if one platform fails to publish?',
      a: 'SocialSync AI enforces strict platform isolation. A failure or rate-limit on one network does not abort or compromise publishing to other networks. You receive detailed error status reporting for the failed channel with a 1-click retry option.'
    },
    {
      category: 'accounts',
      q: 'Does SocialSync AI ever see or store my social media passwords?',
      a: 'Never. In strict accordance with platform security standards, SocialSync AI uses OAuth 2.0 PKCE. You authenticate directly on the respective platform (such as Meta, Google, LinkedIn, or TikTok), and SocialSync AI receives only encrypted access tokens. Your passwords are never handled, seen, or stored.'
    },
    {
      category: 'accounts',
      q: 'How many social accounts can I connect?',
      a: 'On our Free plan, you can link up to 2 accounts. Our Creator plan supports up to 4 accounts, and the Professional plan supports up to 6 accounts spanning all six supported platforms.'
    },
    {
      category: 'credits',
      q: 'What is a credit and how are credits allocated?',
      a: 'Credits represent your monthly publishing capacity. Broadcasting to your connected social channels automatically consumes credits from your account balance. Free users receive 200 monthly credits, Creator users receive 500 credits, and Professional users receive 1,000 credits.'
    },
    {
      category: 'credits',
      q: 'Are the Creator and Professional plans actively charging right now?',
      a: 'When you sign up, you start with the Free tier (200 credits) with zero charges. You can upgrade to Creator (500 credits) or Professional (1,000 credits) to unlock post scheduling, AI caption generation, and increased channel allowances.'
    },
    {
      category: 'media',
      q: 'How does automatic image-to-video conversion work for YouTube?',
      a: 'YouTube exclusively accepts video formats (MP4, MOV, etc.). If you attach a still image (JPG/PNG) to a post targeting YouTube, SocialSync AI automatically transcodes the image into an optimized 1080p MP4 video with silent audio in the background before uploading, while still delivering the native image to Facebook, Instagram, and LinkedIn.'
    },
    {
      category: 'media',
      q: 'What are the file size limits for uploads?',
      a: 'Images up to 20MB and video files up to 100MB are supported through our integrated upload pipeline.'
    }
  ];

  const filteredFaqs = activeCategory === 'all'
    ? allFaqs
    : allFaqs.filter((f) => f.category === activeCategory);

  const toggleItem = (idx) => {
    setOpenItems((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            Knowledge Base
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-base text-[#475569] dark:text-slate-300 max-w-xl mx-auto">
            Everything you need to know about SocialSync AI features, accounts, media pipelines, and plans.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                  : 'bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* FAQ Accordions */}
        <div className="space-y-4">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = Boolean(openItems[idx]);
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl overflow-hidden transition-colors shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-semibold text-[#0F172A] dark:text-white hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
                >
                  <span className="text-base sm:text-lg">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-blue-600 dark:text-cyan-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed border-t border-[#E2E8F0] dark:border-[#334155] pt-4 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Contact Help Card */}
        <div className="p-8 rounded-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-center space-y-4 shadow-sm">
          <h3 className="text-xl font-bold text-[#0F172A] dark:text-white">Have a question not listed here?</h3>
          <p className="text-sm text-[#475569] dark:text-slate-400 max-w-md mx-auto">
            Our support team is available to assist you with account connections, publishing questions, and custom integration inquiries.
          </p>
          <div className="pt-2">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-sm transition-all shadow-md"
            >
              <MessageCircle className="w-4 h-4" />
              Contact Our Team
            </Link>
          </div>
        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
export default FaqPage;
