import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Crown, Check, X, ArrowRight, Clock, Layers, Share2, Wand2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function PlanUpgradeModal({
  isOpen,
  onClose,
  featureName = '',
  title,
  description,
  primaryButtonText,
  secondaryButtonText,
  currentPlan: currentPlanProp
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentPlan = (currentPlanProp || user?.plan || 'FREE').toUpperCase();
  const isCreatorPlan = currentPlan === 'CREATOR';
  const isFreePlan = currentPlan === 'FREE';

  // Prevent page background scrolling when modal is open and handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    onClose?.();
    const target = isAiCaption ? 'professional' : 'creator';
    navigate(`/packages?plan=${target}`);
  };

  const isSchedule = featureName === 'Schedule' || featureName === 'Scheduled Publishing';
  const isCollage = featureName === 'Collage Studio';
  const isMultiPlatform =
    featureName === 'Multi-Platform Selection Limit' ||
    featureName === 'Multi-Platform' ||
    featureName === 'Target Platform Selection Limit' ||
    featureName === 'Target Platforms';
  const isAiCaption =
    featureName === 'AI Caption Generator' ||
    featureName === 'AI Caption' ||
    featureName === 'AI Vision' ||
    featureName === 'AI Image Caption';

  // Dynamic Title based on feature & current plan
  const modalTitle = title || (
    isAiCaption
      ? 'Unlock AI Caption Generator'
      : isMultiPlatform
      ? (isCreatorPlan ? 'Choose All 6 Accounts to Share' : 'Unlock More Accounts to Share')
      : isSchedule
      ? 'Unlock Scheduled Publishing'
      : isCollage
      ? 'Unlock Photo Collage Studio'
      : isCreatorPlan
      ? 'Upgrade to Professional Plan'
      : 'This feature is not available on your current plan.'
  );

  // Dynamic Description based on feature & current plan
  const modalDescription = description || (
    isAiCaption
      ? isCreatorPlan
        ? 'AI Caption Generator is exclusive to the Professional plan. Upgrade from Creator to Professional to draft intelligent captions and hashtags automatically from your photos with AI Vision.'
        : 'AI Caption Generator is exclusive to the Professional plan. Upgrade your plan to automatically generate captions, hashtags, and unlock all premium tools.'
      : isMultiPlatform
      ? isCreatorPlan
        ? 'Your Creator plan allows choosing any 4 accounts to share. Upgrade to the Professional plan to broadcast across all 6 accounts simultaneously.'
        : 'On the Free plan, you can choose any 2 accounts to share. Upgrade your plan to connect and publish across more social media accounts simultaneously.'
      : isSchedule
      ? 'Upgrade your plan to schedule posts in advance and manage your social media publishing more efficiently.'
      : isCollage
      ? 'Photo Collage Studio is not available on the Free plan. Upgrade to the Creator or Professional plan to merge photos into stunning multi-image collages.'
      : isCreatorPlan
      ? 'Upgrade from Creator to Professional to unlock AI Caption Generator, all 6 social channels, and 1,500 monthly credits.'
      : 'Upgrade your plan to unlock advanced publishing tools, AI automation, and expanded quotas.'
  );

  // Dynamic Primary Button Label
  const primaryBtnLabel = primaryButtonText || (
    isAiCaption || isCreatorPlan
      ? 'Upgrade to Professional'
      : isMultiPlatform
      ? 'View Plans'
      : isSchedule
      ? 'View Plans'
      : isCollage
      ? 'View Subscription Plans'
      : 'View Plans'
  );

  const secondaryBtnLabel = secondaryButtonText || 'Maybe Later';

  // Dynamic Top Badge
  const badgeText = isAiCaption || (!isSchedule && !isCollage && isCreatorPlan)
    ? 'Professional Plan Exclusive'
    : isMultiPlatform
    ? (isCreatorPlan ? 'Professional Plan Exclusive' : 'Multi-Account Sharing')
    : isSchedule || isCollage
    ? 'Creator & Professional Plans'
    : 'Professional Plan Exclusive';

  // Dynamic Feature Highlights Header
  const highlightsHeader = isAiCaption
    ? (isCreatorPlan ? 'Upgrade from Creator to Professional Plan:' : 'Included in Professional Plan:')
    : isMultiPlatform
    ? (isCreatorPlan ? 'Upgrade to Professional to Unlock All Channels:' : 'Multi-Account Sharing Options by Plan:')
    : isSchedule
    ? 'Scheduled Publishing is Included In:'
    : isCollage
    ? 'Collage Studio is Included In:'
    : (isCreatorPlan ? 'Included in Professional Plan:' : 'Included in Upgraded Plans:');

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-upgrade-modal-title"
    >
      {/* Backdrop: subtle dark tint with minimal 2px blur */}
      <div
        className="fixed inset-0 transition-opacity animate-fade-in"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog: centered horizontally and vertically, responsive width, max-height calc(100dvh - 32px), flex-col */}
      <div
        className="relative z-10 flex flex-col overflow-hidden overflow-x-hidden rounded-3xl bg-white dark:bg-[#111827] text-left shadow-2xl border border-[#E2E8F0] dark:border-[#334155] animate-scale-up my-auto"
        style={{
          width: 'min(540px, calc(100vw - 32px))',
          maxHeight: 'calc(100dvh - 32px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar with Badge & Close Button (Non-scrolling Header, shrink-0) */}
        <div className="shrink-0 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between bg-white dark:bg-[#111827]">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
            (isSchedule || isCollage || (isMultiPlatform && !isCreatorPlan))
              ? 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
              : 'bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
          }`}>
            <Crown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{badgeText}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Independently Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 space-y-4">
          {/* Icon & Text Content */}
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0 mt-0.5 ${
              isAiCaption || (!isSchedule && !isCollage && isCreatorPlan)
                ? 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 shadow-indigo-500/25'
                : isMultiPlatform
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/25'
                : isSchedule || isCollage
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/25'
                : 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-indigo-500/25'
            }`}>
              {isAiCaption ? (
                <Wand2 className="w-6 h-6" />
              ) : isMultiPlatform ? (
                <Share2 className="w-6 h-6" />
              ) : isSchedule ? (
                <Clock className="w-6 h-6" />
              ) : isCollage ? (
                <Layers className="w-6 h-6" />
              ) : (
                <Sparkles className="w-6 h-6" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-snug">
                {modalTitle}
              </h3>
              <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                {modalDescription}
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120]/70 border border-[#E2E8F0] dark:border-[#334155] space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {highlightsHeader}
            </p>

            <ul className="space-y-2.5 text-xs text-[#0F172A] dark:text-[#F8FAFC]">
              {/* CASE 1: AI CAPTION GENERATOR */}
              {isAiCaption ? (
                isCreatorPlan ? (
                  <>
                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>AI Caption Generator (Vision)</strong>: Multi-lingual AI caption drafting &amp; trending hashtags directly from photos
                      </span>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>Choose All 6 Accounts to Share</strong>: Broadcast to Facebook, Instagram, LinkedIn, Threads, TikTok &amp; YouTube at once
                      </span>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>1,500 Monthly Credits</strong>: 3x more publishing credits per month (upgraded from 500)
                      </span>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>Priority Publishing Delivery</strong>: Dedicated high-speed queue dispatch across all channels
                      </span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>AI Caption Generator (Vision)</strong>: Multi-lingual AI caption drafting &amp; hashtags from photos
                      </span>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>Choose All 6 Accounts to Share</strong>: Broadcast across all supported social networks simultaneously
                      </span>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>1,500 Monthly Credits</strong>: 1,500 monthly publishing credits (up from 200)
                      </span>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>Post Scheduling &amp; Photo Collage Studio</strong>: Full calendar scheduler and multi-photo collage templates
                      </span>
                    </li>
                  </>
                )
              ) : isMultiPlatform ? (
                /* CASE 2: MULTI-PLATFORM SHARING LIMIT */
                isCreatorPlan ? (
                  <>
                    <li className="p-3 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-extrabold text-[#0F172A] dark:text-white">Creator Plan (Current)</strong>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                            4 Accounts
                          </span>
                        </div>
                        <p className="text-[#334155] dark:text-[#CBD5E1] font-medium">
                          You can currently choose <strong>any 4 accounts</strong> to share simultaneously.
                        </p>
                      </div>
                    </li>

                    <li className="p-3 rounded-2xl bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-blue-50/40 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-blue-950/20 border border-purple-200/80 dark:border-purple-800/60 flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-extrabold text-[#0F172A] dark:text-white">Professional Plan (Upgrade)</strong>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                            All 6 Accounts
                          </span>
                        </div>
                        <p className="text-[#334155] dark:text-[#CBD5E1] font-medium">
                          Upgrade to choose <strong>all 6 accounts</strong> to share simultaneously.
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Includes 1,500 monthly credits, AI captions &amp; priority publishing delivery.
                        </p>
                      </div>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="p-3 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-extrabold text-[#0F172A] dark:text-white">Creator Package</strong>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                            4 Accounts
                          </span>
                        </div>
                        <p className="text-[#334155] dark:text-[#CBD5E1] font-medium">
                          You can choose <strong>4 accounts</strong> to share simultaneously.
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Includes 500 monthly credits, post scheduling &amp; Photo Collage Studio.
                        </p>
                      </div>
                    </li>

                    <li className="p-3 rounded-2xl bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-blue-50/40 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-blue-950/20 border border-purple-200/80 dark:border-purple-800/60 flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-purple-500/10 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-extrabold text-[#0F172A] dark:text-white">Professional Plan</strong>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                            All 6 Accounts
                          </span>
                        </div>
                        <p className="text-[#334155] dark:text-[#CBD5E1] font-medium">
                          You can choose <strong>all 6 accounts</strong> to share simultaneously.
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Includes 1,500 monthly credits, AI captions, post scheduling &amp; priority publishing delivery.
                        </p>
                      </div>
                    </li>
                  </>
                )
              ) : isSchedule ? (
                /* CASE 3: SCHEDULED PUBLISHING (Only shown to Free users) */
                <>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="font-medium">
                      <strong>Creator Plan</strong>: 500 monthly credits, 4 connected accounts &amp; Full Post Scheduling
                    </span>
                  </li>

                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="font-medium">
                      <strong>Professional Plan</strong>: 1,500 monthly credits, 6 accounts, AI Captions &amp; Full Post Scheduling
                    </span>
                  </li>

                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="font-medium">
                      Automated queue dispatch, peak engagement scheduling &amp; multi-channel auto-broadcasting
                    </span>
                  </li>
                </>
              ) : isCollage ? (
                /* CASE 4: PHOTO COLLAGE STUDIO (Only shown to Free users) */
                <>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="font-medium">
                      <strong>Creator Plan</strong>: 500 monthly credits, 4 connected accounts &amp; Full Collage Studio access
                    </span>
                  </li>

                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="font-medium">
                      <strong>Professional Plan</strong>: 1,500 monthly credits, 6 accounts, AI Captions &amp; Full Collage Studio access
                    </span>
                  </li>

                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="font-medium">
                      Merge 2 to 6 images with custom layout templates, border radius, spacing &amp; backgrounds
                    </span>
                  </li>
                </>
              ) : (
                /* CASE 5: FALLBACK */
                isCreatorPlan ? (
                  <>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>AI Caption Generator (Vision)</strong>: Multi-lingual AI caption drafting from photos
                      </span>
                    </li>

                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>Choose All 6 Accounts to Share</strong>: Broadcast across all supported social channels
                      </span>
                    </li>

                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>1,500 Monthly Credits</strong>: 3x more publishing credits per month (upgraded from 500)
                      </span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>AI Caption Generator (Vision)</strong>: Multi-lingual AI caption drafting from photos
                      </span>
                    </li>

                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>Post Scheduling &amp; Collage Studio</strong>: Calendar automation and multi-photo templates
                      </span>
                    </li>

                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        <strong>1,500 Credits &amp; All 6 Channels</strong>: Full multi-network broadcast freedom
                      </span>
                    </li>
                  </>
                )
              )}
            </ul>
          </div>
        </div>

        {/* Sticky / Non-scrolling Footer CTA Section (shrink-0) */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 sm:py-4 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50/70 dark:bg-[#0B1120]/60 space-y-2">
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="w-full py-3 sm:py-3.5 px-5 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{primaryBtnLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl font-medium text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            {secondaryBtnLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}

export default PlanUpgradeModal;
