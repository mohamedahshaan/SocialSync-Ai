import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { PlatformCircle } from './PlatformIcon';

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-[#080D19] text-[#475569] dark:text-[#CBD5E1] border-t border-[#E2E8F0] dark:border-[#334155] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        
        {/* Main Footer Row: Brand on Left, Navigation Links on Right */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6">
          
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 fill-white text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent block leading-tight font-heading">
                SocialSync AI
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide -mt-0.5">
                Connect • Create • Publish
              </span>
            </div>
          </Link>

          {/* Navigation Links: Exactly 4 Footer Links */}
          <nav className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Link to="/faq" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors underline-offset-4 hover:underline">
              FAQ
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link to="/terms" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors underline-offset-4 hover:underline">
              Terms & Conditions
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link to="/privacy-policy" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link to="/contact" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors underline-offset-4 hover:underline">
              Contact
            </Link>
          </nav>
        </div>

        {/* Bottom Bar: Copyright on Left, 6 Circular Social Icons on Right */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © {currentYear} SocialSync AI. All rights reserved.
          </p>

          {/* Circular Official Social Media Icons */}
          <div className="flex items-center gap-2.5">
            <PlatformCircle platform="FACEBOOK" size="w-6 h-6" iconSize="w-3.5 h-3.5" />
            <PlatformCircle platform="INSTAGRAM" size="w-6 h-6" iconSize="w-3.5 h-3.5" />
            <PlatformCircle platform="LINKEDIN" size="w-6 h-6" iconSize="w-3.5 h-3.5" />
            <PlatformCircle platform="YOUTUBE" size="w-6 h-6" iconSize="w-3.5 h-3.5" />
            <PlatformCircle platform="TIKTOK" size="w-6 h-6" iconSize="w-3.5 h-3.5" />
            <PlatformCircle platform="THREADS" size="w-6 h-6" iconSize="w-3.5 h-3.5" />
          </div>
        </div>

      </div>
    </footer>
  );
}
export default PublicFooter;
