import React, { useState, useMemo } from 'react';
import { PublicNavbar } from '../components/public/PublicNavbar';
import { PublicFooter } from '../components/public/PublicFooter';
import {
  HelpCircle,
  ChevronDown,
  Sparkles,
  MessageCircle,
  Search,
  X,
  ShieldCheck,
  Key,
  Video,
  CreditCard,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function FaqPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState({ '0': true });

  const categories = [
    { id: 'all', name: 'All Questions', icon: HelpCircle },
    { id: 'getting-started', name: 'Getting Started', icon: Layers },
    { id: 'google-youtube', name: 'Google & YouTube', icon: Video },
    { id: 'publishing', name: 'Content & Publishing', icon: Sparkles },
    { id: 'credits-billing', name: 'Plans & Credits', icon: CreditCard },
    { id: 'security-privacy', name: 'Security & Privacy', icon: ShieldCheck }
  ];

  const allFaqs = [
    // ------------------------------------------------------------------------
    // 1. GETTING STARTED
    // ------------------------------------------------------------------------
    {
      category: 'getting-started',
      q: 'What is SocialSync AI?',
      a: 'SocialSync AI is an enterprise-grade multi-platform social media publishing, scheduling, and analytics SaaS. It empowers creators, marketing teams, and agencies to compose high-impact posts once and broadcast them simultaneously across Facebook, Instagram, LinkedIn, YouTube, TikTok, and Threads using official developer APIs.'
    },
    {
      category: 'getting-started',
      q: 'How do users create an account and sign in?',
      a: 'You can sign up in seconds by clicking "Get Started Free" or "Register". We offer two seamless authentication methods: standard email registration with strong password hashing (bcrypt with 12 salt rounds) and email verification, or 1-click Google Sign-In via official Google OAuth 2.0. No credit card is required to register.'
    },
    {
      category: 'getting-started',
      q: 'Which social platforms are supported by SocialSync AI?',
      a: 'SocialSync AI currently supports six major social networks: Facebook (Pages), Instagram (Business and Creator accounts), LinkedIn (Member Profiles and Company Pages), YouTube (Channels for videos and Shorts), TikTok (Video Publishing), and Threads. Each network connects through official, secure OAuth 2.0 authorization.'
    },
    {
      category: 'getting-started',
      q: 'How do users connect their social media accounts?',
      a: 'Navigate to the Accounts section in your dashboard and click "Connect Account" for your chosen platform. You are securely redirected to the official platform authorization page (e.g., Meta, Google, LinkedIn, or TikTok). Once you review and grant the required permissions, you are returned to SocialSync AI with a scoped authorization token. Your social account passwords are never handled, seen, or stored by SocialSync AI.'
    },

    // ------------------------------------------------------------------------
    // 2. GOOGLE & YOUTUBE INTEGRATION
    // ------------------------------------------------------------------------
    {
      category: 'google-youtube',
      q: 'How does Google Sign-In work on SocialSync AI?',
      a: 'Google Sign-In uses official Google OAuth 2.0 authorization. When you click "Continue with Google", you authenticate directly with Google on accounts.google.com. Google returns a cryptographically signed OpenID Connect ID token containing your basic profile information (name, email address, and profile picture). SocialSync AI verifies this token on its backend server to establish your authenticated session. SocialSync AI never sees or handles your Google password.'
    },
    {
      category: 'google-youtube',
      q: 'How does YouTube account authorization work?',
      a: 'Connecting your YouTube channel initiates an official Google OAuth 2.0 authorization code flow. You are redirected to Google\'s consent screen where you select your Google account and YouTube channel, and explicitly approve permissions to upload videos and view channel metadata. Upon completion, Google returns an OAuth access token and an offline refresh token that allows SocialSync AI to upload your scheduled videos directly to your channel.'
    },
    {
      category: 'google-youtube',
      q: 'Does SocialSync AI collect or store users\' Google passwords?',
      a: 'Explicitly NO. SocialSync AI strictly uses Google\'s official OAuth 2.0 protocol. The entire authentication and authorization dialogue occurs exclusively on Google\'s own secure servers (accounts.google.com). SocialSync AI never prompts for, collects, inspects, or stores your Google account password.'
    },
    {
      category: 'google-youtube',
      q: 'What Google and YouTube permissions are requested and why?',
      a: 'For YouTube publishing, SocialSync AI requests only the minimal necessary OAuth scopes: (1) "https://www.googleapis.com/auth/youtube.upload" to upload your authored video content and YouTube Shorts directly to your channel, and (2) "https://www.googleapis.com/auth/youtube.readonly" to query your channel name, custom URL, and channel icon to display in your SocialSync AI dashboard. For Google Sign-In, we request standard "openid", "email", and "profile" scopes solely to authenticate your identity.'
    },
    {
      category: 'google-youtube',
      q: 'How can users disconnect a YouTube channel?',
      a: 'You can disconnect your YouTube channel at any time with a single click. Go to Accounts in your dashboard, find your YouTube channel, and click "Disconnect". When you confirm, SocialSync AI immediately dispatches an automated revocation request to Google\'s OAuth endpoint (https://oauth2.googleapis.com/revoke) to invalidate the stored token with Google, and permanently purges the local access token, refresh token, and account record from our database.'
    },
    {
      category: 'google-youtube',
      q: 'What happens when Google authorization expires or is revoked?',
      a: 'Short-lived Google access tokens (which typically expire after 1 hour) are automatically refreshed in the background using your secure offline refresh token whenever a post is published. If you revoke SocialSync AI\'s access directly in your Google Security Settings (https://security.google.com/settings/security/permissions) or change your Google account security settings, the refresh token becomes invalid. SocialSync AI will mark the channel status as "Expired" and prompt you to reconnect before future posts can be published.'
    },

    // ------------------------------------------------------------------------
    // 3. CONTENT MANAGEMENT & PUBLISHING
    // ------------------------------------------------------------------------
    {
      category: 'publishing',
      q: 'How do users create and schedule posts?',
      a: 'From the "Create Post" composer, enter your caption text, attach images or video, and select your target social platforms using the platform toggles. You can click "Publish Now" for immediate multi-network broadcast, or enable "Schedule Post" to choose an exact future date and time in your local timezone. Scheduled posts are processed automatically by our server queue processor.'
    },
    {
      category: 'publishing',
      q: 'Which media formats and file sizes are supported?',
      a: 'SocialSync AI supports high-resolution images (JPEG, PNG, WebP) up to 20MB, and video files (MP4, MOV, WebM) up to 100MB. Uploaded media is validated and optimized for target platform specifications.'
    },
    {
      category: 'publishing',
      q: 'How does automatic image-to-video conversion work for YouTube?',
      a: 'YouTube exclusively accepts video formats and does not permit standalone image uploads. If you create a post containing a still image and include YouTube as a destination, SocialSync AI automatically transcodes the image into an optimized 1080p MP4 video with a silent audio track in the background using server-side FFmpeg processing. The resulting video is uploaded seamlessly to YouTube while Facebook, Instagram, and LinkedIn receive the native original image.'
    },
    {
      category: 'publishing',
      q: 'Why might a scheduled or broadcast post fail?',
      a: 'Post delivery failures usually stem from third-party social network constraints: (1) an expired or revoked OAuth access token requiring reconnection, (2) platform-specific API rate limits or temporary network outages on Meta, Google, LinkedIn, or TikTok, (3) media files exceeding platform duration or resolution limits, or (4) temporary account restrictions imposed by the target social network. SocialSync AI isolates platforms so a failure on one network never interrupts successful delivery to the others.'
    },
    {
      category: 'publishing',
      q: 'How can users review publishing status, error details, and retries?',
      a: 'Visit the "Posts" page in your dashboard to view a complete historical timeline of every published post. Each entry displays clear per-platform status badges (PUBLISHED, FAILED, or PENDING). If a specific platform delivery fails, clicking into the post details reveals the exact diagnostic error message returned by the platform API, accompanied by a 1-click retry button to re-attempt dispatch.'
    },

    // ------------------------------------------------------------------------
    // 4. CREDITS & PLANS
    // ------------------------------------------------------------------------
    {
      category: 'credits-billing',
      q: 'How do credits work in SocialSync AI?',
      a: 'Credits are SocialSync AI\'s publishing currency. Every time you dispatch a post to one of your connected accounts, a specific number of credits is deducted from your balance based on the destination platform (typically 5 to 15 credits per channel, reflecting API compute and payload bandwidth). Free plan users receive 200 monthly credits, Creator users receive 500 credits, and Professional users receive 1,500 credits.'
    },
    {
      category: 'credits-billing',
      q: 'What happens to my credits if a post fails to publish?',
      a: 'SocialSync AI includes automatic credit protection. When you submit a post, the estimated credit cost is reserved. If a destination platform fails to deliver or rejects the payload, SocialSync AI automatically releases and refunds the reserved credits for that failed destination immediately back into your account balance.'
    },
    {
      category: 'credits-billing',
      q: 'What are the differences between Free, Creator, and Professional plans?',
      a: 'The Free Plan includes 200 credits, 2 connected accounts, manual multi-platform publishing, and full history at LKR 0. The Creator Plan (LKR 1,000/month) includes 500 credits, 4 connected accounts, post scheduling, Photo Collage Studio, and priority queue dispatch. The Professional Plan (LKR 2,500/month) includes 1,500 credits, 6 connected accounts (all 6 platforms simultaneously), post scheduling, AI caption generation powered by Google Gemini and OpenAI, Photo Collage Studio, and priority dispatch.'
    },
    {
      category: 'credits-billing',
      q: 'Where can users view their plan, credit balance, and transaction history?',
      a: 'Navigate to "My Plan" or "Packages" in your dashboard. You can view your current plan tier, remaining credits, active billing cycle dates, connected account quota, and a complete auditable credit transaction ledger showing every grant, usage deduction, and automatic refund.'
    },
    {
      category: 'credits-billing',
      q: 'How do subscription renewals, cancellation, and refunds work?',
      a: 'Paid plans are billed monthly in Sri Lankan Rupees (LKR) via our secure PayHere payment gateway integration. You may cancel your subscription renewal at any time directly from the "My Plan" dashboard. Upon cancellation, your paid plan and credit balance remain fully active until the end of your current 30-day billing period. Subscriptions are non-refundable once activated, except where required by Sri Lankan consumer protection laws or in cases of verified billing system error.'
    },

    // ------------------------------------------------------------------------
    // 5. SECURITY & PRIVACY
    // ------------------------------------------------------------------------
    {
      category: 'security-privacy',
      q: 'What personal information does SocialSync AI collect?',
      a: 'We collect only the information necessary to operate your account and deliver posts: your name, email address, password hash (salted with bcrypt 12 rounds), billing contact details (phone, street address, city) required for PayHere payment gateway checkout, and authored post content/media. We never collect or store raw payment card numbers, CVVs, or social media passwords.'
    },
    {
      category: 'security-privacy',
      q: 'How is connected-account information stored and protected?',
      a: 'OAuth access tokens and refresh tokens are stored in a dedicated PostgreSQL database running on an isolated internal container network inaccessible from the public internet. All API transmissions use encrypted HTTPS/TLS 1.3 connections. Tokens are used exclusively to execute your direct publishing requests and are never sold, rented, or shared with third-party advertisers.'
    },
    {
      category: 'security-privacy',
      q: 'How does SocialSync AI comply with Google API Services User Data Policy?',
      a: 'SocialSync AI strictly adheres to the Google API Services User Data Policy, including its Limited Use requirements. Information received from Google APIs (Google Sign-In profile data and YouTube channel data) is used exclusively to provide user-facing social publishing and account management features. We never transfer Google user data to third parties for advertising or unauthorized purposes, and we never use Google user data to train generalized artificial intelligence or machine learning models.'
    },
    {
      category: 'security-privacy',
      q: 'How can users permanently delete their account and data?',
      a: 'You maintain full data sovereignty. You can delete your account at any time by going to Settings and clicking "Delete Account". For password users, password confirmation is required; for OAuth users, typing "DELETE" is required. Upon confirmation, SocialSync AI executes an atomic transaction that permanently deletes your profile, credentials, all connected social accounts, OAuth tokens, posts, media files, and subscriptions from our database. A non-identifying cryptographic SHA-256 hash of your ID is recorded solely for anonymized churn metrics and accounting compliance.'
    },
    {
      category: 'security-privacy',
      q: 'How can users contact SocialSync AI for technical support or privacy inquiries?',
      a: 'You can reach our official support and privacy desk via email at sltsocialsync@gmail.com, or submit a message through our Contact page. Our team is based in Colombo, Sri Lanka and responds to technical and data inquiries promptly.'
    }
  ];

  // Filter questions based on category and search query
  const filteredFaqs = useMemo(() => {
    let list = allFaqs;

    if (activeCategory !== 'all') {
      list = list.filter((f) => f.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeCategory, searchQuery, allFaqs]);

  const toggleItem = (idx) => {
    setOpenItems((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleExpandAll = () => {
    const all = {};
    filteredFaqs.forEach((_, idx) => {
      all[idx] = true;
    });
    setOpenItems(all);
  };

  const handleCollapseAll = () => {
    setOpenItems({});
  };

  // Category count helper
  const getCategoryCount = (catId) => {
    if (catId === 'all') return allFaqs.length;
    return allFaqs.filter((f) => f.category === catId).length;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-12">

        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-semibold tracking-wide uppercase">
            <HelpCircle className="w-3.5 h-3.5" />
            Knowledge Base & FAQ
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-base sm:text-lg text-[#475569] dark:text-slate-300 leading-relaxed">
            Everything you need to know about SocialSync AI features, Google & YouTube integration, publishing pipelines, credit systems, and security standards.
          </p>
        </div>

        {/* Live Search Bar */}
        <div className="max-w-2xl mx-auto relative">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              id="faq-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions by keyword (e.g. YouTube, credits, tokens, refunds)..."
              className="w-full pl-12 pr-11 py-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
              aria-label="Search frequently asked questions"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Clear search"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-2">
              Found {filteredFaqs.length} result{filteredFaqs.length === 1 ? '' : 's'} matching "{searchQuery}"
            </p>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            const count = getCategoryCount(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                id={`faq-tab-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.name}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Controls: Results count & Expand/Collapse All */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-[#475569] dark:text-slate-400 pt-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-3">
          <span>
            Showing <strong className="text-[#0F172A] dark:text-white">{filteredFaqs.length}</strong> question{filteredFaqs.length === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-blue-600 dark:text-cyan-400 hover:underline font-medium"
            >
              Expand All
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline font-medium"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* FAQ Accordions */}
        {filteredFaqs.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl space-y-4">
            <HelpCircle className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">No questions matched your query</h3>
            <p className="text-sm text-[#475569] dark:text-slate-400 max-w-md mx-auto">
              We couldn't find any questions matching "{searchQuery}". Try using different terms or contact our support desk directly.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = Boolean(openItems[idx]);
              const accordionId = `faq-accordion-${idx}`;
              const panelId = `faq-panel-${idx}`;

              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl overflow-hidden transition-all shadow-xs hover:border-slate-300 dark:hover:border-slate-600"
                >
                  <button
                    type="button"
                    id={accordionId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleItem(idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleItem(idx);
                      }
                    }}
                    className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-4 font-semibold text-[#0F172A] dark:text-white hover:text-blue-600 dark:hover:text-cyan-400 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span className="text-base sm:text-lg leading-snug">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-600 dark:text-cyan-400' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={accordionId}
                      className="px-5 pb-6 sm:px-6 text-sm sm:text-base text-[#475569] dark:text-[#CBD5E1] leading-relaxed border-t border-[#E2E8F0] dark:border-[#334155] pt-4"
                    >
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legal & Compliance Cross-Links Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <Link
            to="/privacy-policy"
            className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] hover:border-blue-500/50 dark:hover:border-cyan-500/50 transition-all group shadow-xs"
          >
            <div className="flex items-center gap-3 text-blue-600 dark:text-cyan-400 font-bold text-sm mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy Policy</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-auto" />
            </div>
            <p className="text-xs text-[#475569] dark:text-slate-400 leading-normal">
              Learn how we protect OAuth tokens, user data, and adhere to Google API Limited Use policies.
            </p>
          </Link>

          <Link
            to="/terms"
            className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] hover:border-blue-500/50 dark:hover:border-cyan-500/50 transition-all group shadow-xs"
          >
            <div className="flex items-center gap-3 text-blue-600 dark:text-cyan-400 font-bold text-sm mb-1">
              <Layers className="w-4 h-4" />
              <span>Terms of Service</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-auto" />
            </div>
            <p className="text-xs text-[#475569] dark:text-slate-400 leading-normal">
              Review acceptable use, content licensing, billing rules, and platform limitations.
            </p>
          </Link>

          <Link
            to="/contact"
            className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] hover:border-blue-500/50 dark:hover:border-cyan-500/50 transition-all group shadow-xs"
          >
            <div className="flex items-center gap-3 text-blue-600 dark:text-cyan-400 font-bold text-sm mb-1">
              <MessageCircle className="w-4 h-4" />
              <span>Contact Support</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-auto" />
            </div>
            <p className="text-xs text-[#475569] dark:text-slate-400 leading-normal">
              Direct technical help and inquiries at sltsocialsync@gmail.com, based in Colombo, Sri Lanka.
            </p>
          </Link>
        </div>

        {/* Bottom Help Desk Card */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-blue-600/5 via-cyan-500/5 to-transparent dark:from-blue-950/20 dark:via-cyan-950/20 border border-blue-500/20 dark:border-cyan-500/20 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/25">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white">
            Have a question not answered here?
          </h3>
          <p className="text-sm text-[#475569] dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
            Our support and engineering desk is available to assist you with channel connections, OAuth authorizations, plan upgrades, and API integration inquiries.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contact Support Desk</span>
            </Link>
            <a
              href="mailto:sltsocialsync@gmail.com"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0F172A] dark:text-white text-sm font-semibold transition-all shadow-xs"
            >
              <span>Email: sltsocialsync@gmail.com</span>
            </a>
          </div>
        </div>

      </main>

      <PublicFooter />
    </div>
  );
}

export default FaqPage;
