import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Share2,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { PublicNavbar } from '../components/public/PublicNavbar';

export function HomePage() {
  // 4 Core Feature Cards exactly matching user's screenshot
  const featureCards = [
    {
      title: 'AI-Powered Content',
      desc: 'Generate engaging captions, hashtags and visuals with AI.',
      icon: Sparkles,
      iconBg: 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25',
      arrowBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400',
      borderHover: 'hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-[0_12px_25px_rgba(168,85,247,0.18)]'
    },
    {
      title: 'Smart Scheduling',
      desc: 'Plan and schedule your posts effortlessly.',
      icon: Calendar,
      iconBg: 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25',
      arrowBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400',
      borderHover: 'hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-[0_12px_25px_rgba(37,99,235,0.18)]'
    },
    {
      title: 'Multi-Platform Publishing',
      desc: 'Publish to all your connected accounts in one click.',
      icon: Share2,
      iconBg: 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25',
      arrowBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-[0_12px_25px_rgba(16,185,129,0.18)]'
    },
    {
      title: 'Track Performance',
      desc: 'View your publishing history and grow your audience.',
      icon: BarChart3,
      iconBg: 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25',
      arrowBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      borderHover: 'hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-[0_12px_25px_rgba(245,158,11,0.18)]'
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] dark:bg-[#070B14] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col justify-between overflow-x-hidden transition-colors duration-200 selection:bg-blue-600 selection:text-white">
      
      {/* ========================================================
          AMBIENT ORGANIC MESH GRADIENTS
      ======================================================== */}
      <div className="absolute top-0 left-0 w-[700px] h-[550px] bg-gradient-to-br from-cyan-400/15 via-blue-500/10 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-10 right-0 w-[750px] h-[600px] bg-gradient-to-bl from-purple-500/15 via-indigo-500/12 to-transparent rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/3 w-[650px] h-[380px] bg-gradient-to-tr from-blue-400/10 via-purple-400/8 to-transparent rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_80%_65%_at_50%_35%,#000_60%,transparent_100%)] pointer-events-none -z-10 opacity-50" />

      {/* 1. Header with brand logo & top-right Login / Get Started */}
      <PublicNavbar />

      {/* 2. Main Content Body */}
      <main className="flex-1 flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-10 sm:space-y-12">
        
        {/* ========================================================
            HERO SPLIT SECTION
            LEFT: "Stop Managing Apps. Start Growing Your Brand."
            RIGHT: 3D CREATOR STUDIO ARTWORK WITH ROBOT & ORBITS
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center pt-2">
          
          {/* LEFT COLUMN: HERO HEADLINE */}
          <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
            
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-cyan-400 text-xs font-bold tracking-wide backdrop-blur-md shadow-xs">
              <Sparkles className="w-3.5 h-3.5 fill-current text-blue-600 dark:text-cyan-400" />
              <span>AI-Powered Social Media Automation</span>
            </div>

            {/* Main Headline matching Screenshot */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-6xl md:text-6xl lg:text-[64px] font-black tracking-tight text-slate-900 dark:text-white leading-[1.08]">
                Your<br />Social Media.
              </h1>
              
              <div className="inline-block relative">
                <h1 className="text-4xl sm:text-6xl md:text-6xl lg:text-[64px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-300 leading-[1.08]">
                  All in One Place.
                </h1>
                
                {/* Curved underline brushstroke matching Screenshot */}
                <svg
                  className="w-64 sm:w-84 md:w-96 h-4 text-blue-600 dark:text-cyan-400 mt-1.5"
                  viewBox="0 0 320 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 11C75 3.5 220 3 317 10"
                    stroke="url(#underline_gradient)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="underline_gradient" x1="3" y1="11" x2="317" y2="10" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#2563EB" />
                      <stop offset="0.5" stopColor="#6366F1" />
                      <stop offset="1" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Subtitle exactly matching Screenshot */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Create content, get AI-powered captions, schedule posts and publish across all your social media accounts — easily, from one simple workspace.
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-3">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-base shadow-[0_10px_35px_rgba(79,70,229,0.35)] hover:shadow-[0_12px_45px_rgba(79,70,229,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group"
              >
                <span>Get Started for Free</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

          </div>

          {/* RIGHT COLUMN: 3D HERO ARTWORK SHOWCASE */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-[580px] rounded-3xl overflow-hidden bg-white/70 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 shadow-[0_25px_65px_rgba(79,70,229,0.2)] dark:shadow-[0_25px_65px_rgba(0,0,0,0.6)] group transition-all duration-500">
              
              {/* Subtle ambient lighting */}
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 via-transparent to-purple-600/10 pointer-events-none z-10" />

              {/* High-Res 3D Creator & Robot Artwork */}
              <img
                src="/hero-studio-robot.jpg"
                alt="Your Social Media. All in One Place."
                className="w-full h-auto object-cover rounded-3xl transition-transform duration-700 group-hover:scale-105"
              />

            </div>
          </div>

        </div>

        {/* ========================================================
            BOTTOM 4 FEATURE CARDS (COMPACT / SLEEK BOXES)
        ======================================================== */}
        <div className="pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
            {featureCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-xs hover:-translate-y-1 transition-all duration-300 group cursor-default ${card.borderHover}`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>

                    <div className={`w-7 h-7 rounded-full ${card.arrowBg} flex items-center justify-center group-hover:translate-x-1 transition-transform`}>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-[15px] font-black text-slate-900 dark:text-white tracking-tight">
                      {card.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* ========================================================
          3. FOOTER: EXACT 4 CLEAN SMALL TEXT LINKS
      ======================================================== */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8 bg-white/70 dark:bg-[#070B14]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span>© {new Date().getFullYear()} SocialSync AI. All rights reserved.</span>
          </div>

          {/* EXACT 4 FOOTER LINKS */}
          <div className="flex items-center gap-4 sm:gap-6 font-semibold">
            <Link
              to="/faq"
              className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors underline-offset-4 hover:underline"
            >
              FAQ
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link
              to="/terms"
              className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors underline-offset-4 hover:underline"
            >
              Terms & Conditions
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link
              to="/privacy-policy"
              className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link
              to="/contact"
              className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors underline-offset-4 hover:underline"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default HomePage;
