import React, { useState, useMemo } from 'react';
import {
  MoreHorizontal,
  ChevronRight,
  User,
  Trash2,
  Settings,
  KeyRound
} from 'lucide-react';
import { Button } from './Button';

function ProfileAvatar({ image, name }) {
  const [hasError, setHasError] = useState(false);

  // Compute initials (e.g. "Alex Morgan" -> "AM", "Tech Creator" -> "TC")
  const initials = useMemo(() => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  if (image && !hasError) {
    return (
      <img
        src={image}
        alt={name || 'Profile'}
        onError={() => setHasError(true)}
        className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs"
        loading="lazy"
      />
    );
  }

  // Neutral, clean avatar fallback with initials
  return (
    <div
      className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200 dark:border-blue-900 shadow-2xs select-none"
      title={name || 'Connected Profile'}
    >
      {initials}
    </div>
  );
}

const PLATFORM_THEMES = {
  FACEBOOK: {
    logoBg: 'bg-[#1877F2]',
    description: 'Publish to Pages and groups with rich media.',
    boxPrompt: 'Connect your Facebook account to manage pages and groups.',
    buttonStyle: 'bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-sm shadow-[#1877F2]/25'
  },
  INSTAGRAM: {
    logoBg: 'bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4]',
    description: 'Post photos, reels, and carousel content.',
    boxPrompt: 'Connect your Instagram account to start sharing photos and reels.',
    buttonStyle: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] hover:opacity-95 text-white shadow-sm shadow-rose-500/25'
  },
  LINKEDIN: {
    logoBg: 'bg-[#0A66C2]',
    description: 'Share professional updates, media, and articles.',
    boxPrompt: 'Connect your LinkedIn profile to publish updates and articles.',
    buttonStyle: 'bg-[#0A66C2] hover:bg-[#095196] text-white shadow-sm shadow-[#0A66C2]/25'
  },
  THREADS: {
    logoBg: 'bg-black text-white dark:bg-white dark:text-black',
    description: 'Post text threads, discussions, and visual updates.',
    boxPrompt: 'Connect your Threads account to start posting text threads.',
    buttonStyle: 'bg-black hover:bg-neutral-900 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-black shadow-sm'
  },
  YOUTUBE: {
    logoBg: 'bg-[#FF0000]',
    description: 'Upload videos, shorts, and live streams.',
    boxPrompt: 'Connect your YouTube channel to start publishing videos.',
    buttonStyle: 'bg-[#FF0000] hover:bg-[#E60000] text-white shadow-sm shadow-red-500/25'
  },
  TIKTOK: {
    logoBg: 'bg-black shadow-md',
    description: 'Share short-form videos and vertical content.',
    boxPrompt: 'Connect your TikTok account to start sharing short videos.',
    buttonStyle: 'bg-black hover:bg-neutral-900 text-white shadow-sm'
  }
};

function renderTopWave(platformKey) {
  const p = (platformKey || '').toUpperCase();

  switch (p) {
    case 'FACEBOOK':
      return (
        <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none overflow-hidden rounded-t-3xl bg-gradient-to-br from-blue-100/70 via-blue-50/25 to-transparent">
          <svg className="absolute top-0 right-0 w-full h-full" viewBox="0 0 360 144" fill="none" preserveAspectRatio="none">
            <path d="M110 0C165 35 220 75 360 38V0H110Z" fill="#3B82F6" fillOpacity="0.16" />
            <path d="M185 0C235 45 280 85 360 65V0H185Z" fill="#60A5FA" fillOpacity="0.18" />
          </svg>
        </div>
      );

    case 'INSTAGRAM':
      return (
        <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none overflow-hidden rounded-t-3xl bg-gradient-to-br from-rose-100/70 via-orange-100/30 to-transparent">
          <svg className="absolute top-0 right-0 w-full h-full" viewBox="0 0 360 144" fill="none" preserveAspectRatio="none">
            <path d="M105 0C160 35 220 75 360 40V0H105Z" fill="#FB7185" fillOpacity="0.20" />
            <path d="M180 0C230 45 280 85 360 68V0H180Z" fill="#F43F5E" fillOpacity="0.14" />
          </svg>
        </div>
      );

    case 'LINKEDIN':
      return (
        <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none overflow-hidden rounded-t-3xl bg-gradient-to-br from-sky-100/75 via-blue-50/25 to-transparent">
          <svg className="absolute top-0 right-0 w-full h-full" viewBox="0 0 360 144" fill="none" preserveAspectRatio="none">
            <path d="M115 0C165 35 220 75 360 38V0H115Z" fill="#0EA5E9" fillOpacity="0.16" />
            <path d="M185 0C235 45 280 85 360 65V0H185Z" fill="#38BDF8" fillOpacity="0.18" />
          </svg>
        </div>
      );

    case 'THREADS':
      return (
        <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none overflow-hidden rounded-t-3xl bg-gradient-to-br from-slate-100/70 via-slate-50/30 to-transparent">
          <svg className="absolute top-0 right-0 w-full h-full" viewBox="0 0 360 144" fill="none" preserveAspectRatio="none">
            <path
              d="M85 0 C145 35 215 75 360 36 V0 H85 Z"
              fill="url(#threads-wave-1)"
            />
            <path
              d="M170 0 C225 45 270 82 360 60 V0 H170 Z"
              fill="url(#threads-wave-2)"
            />
            <defs>
              <linearGradient id="threads-wave-1" x1="85" y1="0" x2="360" y2="70" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0F172A" stopOpacity="0.32" />
                <stop offset="1" stopColor="#334155" stopOpacity="0.12" />
              </linearGradient>
              <linearGradient id="threads-wave-2" x1="170" y1="0" x2="360" y2="60" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1E293B" stopOpacity="0.25" />
                <stop offset="1" stopColor="#475569" stopOpacity="0.08" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      );

    case 'YOUTUBE':
      return (
        <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none overflow-hidden rounded-t-3xl bg-gradient-to-br from-red-100/75 via-rose-50/25 to-transparent">
          <svg className="absolute top-0 right-0 w-full h-full" viewBox="0 0 360 144" fill="none" preserveAspectRatio="none">
            <path d="M115 0C165 35 220 75 360 40V0H115Z" fill="#EF4444" fillOpacity="0.18" />
            <path d="M185 0C235 45 280 85 360 65V0H185Z" fill="#F87171" fillOpacity="0.15" />
          </svg>
        </div>
      );

    case 'TIKTOK':
      return (
        <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none overflow-hidden rounded-t-3xl bg-gradient-to-br from-cyan-100/70 via-rose-100/30 to-transparent">
          <svg className="absolute top-0 right-0 w-full h-full" viewBox="0 0 360 144" fill="none" preserveAspectRatio="none">
            <path d="M105 0C160 35 220 75 360 38V0H105Z" fill="#06B6D4" fillOpacity="0.18" />
            <path d="M180 0C230 45 280 85 360 65V0H180Z" fill="#FE2C55" fillOpacity="0.14" />
          </svg>
        </div>
      );

    default:
      return null;
  }
}

function renderPlatformLogo(platformKey) {
  const p = (platformKey || '').toUpperCase();

  switch (p) {
    case 'FACEBOOK':
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );

    case 'INSTAGRAM':
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );

    case 'LINKEDIN':
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      );

    case 'THREADS':
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white dark:text-black" fill="currentColor">
          <path d="M12.186 24h-.007C5.463 24 0 18.537 0 11.814 0 5.09 5.463 0 12.179 0c6.702 0 12.164 5.448 12.164 12.15 0 .546-.442.988-.988.988-.546 0-.988-.442-.988-.988 0-5.61-4.578-10.174-10.188-10.174-5.624 0-10.203 4.578-10.203 10.202 0 5.624 4.579 10.203 10.203 10.203.007 0 .013 0 .02 0 4.137-.024 7.644-2.527 8.943-6.38a.988.988 0 1 1 1.869.63c-1.57 4.654-5.808 7.681-10.803 7.69zm3.568-7.798c-.463 0-.912-.047-1.341-.14-1.85-.399-2.998-1.558-3.04-3.102-.046-1.745 1.342-3.114 3.238-3.193 1.096-.045 2.157.279 2.915.895.428.349.731.813.88 1.345.05.176.082.358.096.544.028.368.04.832.04 1.385v.068c0 1.258-.87 2.198-2.788 2.198zm-.124-4.664c-.958.04-1.547.632-1.523 1.554.021.782.553 1.378 1.492 1.58.261.056.539.085.827.085.952 0 1.411-.384 1.47-1.226-.002-.303-.012-.572-.032-.806-.113-.377-.323-.695-.615-.933-.443-.36-1.04-.564-1.619-.54l-.004.286z" />
        </svg>
      );

    case 'YOUTUBE':
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );

    case 'TIKTOK':
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 shrink-0">
          {/* Cyan layer shifted left */}
          <path
            fill="#25F4EE"
            d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5 2.592 2.592 0 0 1-2.59-2.5 2.592 2.592 0 0 1 2.59-2.5c.34 0 .66.06.96.17V9.89a5.71 5.71 0 0 0-.96-.08 5.736 5.736 0 0 0-5.74 5.73A5.736 5.736 0 0 0 9.86 21.27a5.736 5.736 0 0 0 5.74-5.73V8.89a7.35 7.35 0 0 0 4.25 1.34V7.07a4.28 4.28 0 0 1-3.25-1.25z"
            transform="translate(-0.8, -0.4)"
          />
          {/* Red/pink layer shifted right */}
          <path
            fill="#FE2C55"
            d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5 2.592 2.592 0 0 1-2.59-2.5 2.592 2.592 0 0 1 2.59-2.5c.34 0 .66.06.96.17V9.89a5.71 5.71 0 0 0-.96-.08 5.736 5.736 0 0 0-5.74 5.73A5.736 5.736 0 0 0 9.86 21.27a5.736 5.736 0 0 0 5.74-5.73V8.89a7.35 7.35 0 0 0 4.25 1.34V7.07a4.28 4.28 0 0 1-3.25-1.25z"
            transform="translate(0.8, 0.4)"
          />
          {/* White main layer */}
          <path
            fill="#FFFFFF"
            d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5 2.592 2.592 0 0 1-2.59-2.5 2.592 2.592 0 0 1 2.59-2.5c.34 0 .66.06.96.17V9.89a5.71 5.71 0 0 0-.96-.08 5.736 5.736 0 0 0-5.74 5.73A5.736 5.736 0 0 0 9.86 21.27a5.736 5.736 0 0 0 5.74-5.73V8.89a7.35 7.35 0 0 0 4.25 1.34V7.07a4.28 4.28 0 0 1-3.25-1.25z"
          />
        </svg>
      );

    default:
      return null;
  }
}

function renderButtonIcon(platformKey) {
  const p = (platformKey || '').toUpperCase();

  switch (p) {
    case 'FACEBOOK':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );

    case 'INSTAGRAM':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );

    case 'LINKEDIN':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      );

    case 'THREADS':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <path d="M12.186 24h-.007C5.463 24 0 18.537 0 11.814 0 5.09 5.463 0 12.179 0c6.702 0 12.164 5.448 12.164 12.15 0 .546-.442.988-.988.988-.546 0-.988-.442-.988-.988 0-5.61-4.578-10.174-10.188-10.174-5.624 0-10.203 4.578-10.203 10.202 0 5.624 4.579 10.203 10.203 10.203.007 0 .013 0 .02 0 4.137-.024 7.644-2.527 8.943-6.38a.988.988 0 1 1 1.869.63c-1.57 4.654-5.808 7.681-10.803 7.69zm3.568-7.798c-.463 0-.912-.047-1.341-.14-1.85-.399-2.998-1.558-3.04-3.102-.046-1.745 1.342-3.114 3.238-3.193 1.096-.045 2.157.279 2.915.895.428.349.731.813.88 1.345.05.176.082.358.096.544.028.368.04.832.04 1.385v.068c0 1.258-.87 2.198-2.788 2.198zm-.124-4.664c-.958.04-1.547.632-1.523 1.554.021.782.553 1.378 1.492 1.58.261.056.539.085.827.085.952 0 1.411-.384 1.47-1.226-.002-.303-.012-.572-.032-.806-.113-.377-.323-.695-.615-.933-.443-.36-1.04-.564-1.619-.54l-.004.286z" />
        </svg>
      );

    case 'YOUTUBE':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );

    case 'TIKTOK':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
          <path
            fill="#25F4EE"
            d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5 2.592 2.592 0 0 1-2.59-2.5 2.592 2.592 0 0 1 2.59-2.5c.34 0 .66.06.96.17V9.89a5.71 5.71 0 0 0-.96-.08 5.736 5.736 0 0 0-5.74 5.73A5.736 5.736 0 0 0 9.86 21.27a5.736 5.736 0 0 0 5.74-5.73V8.89a7.35 7.35 0 0 0 4.25 1.34V7.07a4.28 4.28 0 0 1-3.25-1.25z"
            transform="translate(-0.8, -0.4)"
          />
          <path
            fill="#FE2C55"
            d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5 2.592 2.592 0 0 1-2.59-2.5 2.592 2.592 0 0 1 2.59-2.5c.34 0 .66.06.96.17V9.89a5.71 5.71 0 0 0-.96-.08 5.736 5.736 0 0 0-5.74 5.73A5.736 5.736 0 0 0 9.86 21.27a5.736 5.736 0 0 0 5.74-5.73V8.89a7.35 7.35 0 0 0 4.25 1.34V7.07a4.28 4.28 0 0 1-3.25-1.25z"
            transform="translate(0.8, 0.4)"
          />
          <path
            fill="#FFFFFF"
            d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5 2.592 2.592 0 0 1-2.59-2.5 2.592 2.592 0 0 1 2.59-2.5c.34 0 .66.06.96.17V9.89a5.71 5.71 0 0 0-.96-.08 5.736 5.736 0 0 0-5.74 5.73A5.736 5.736 0 0 0 9.86 21.27a5.736 5.736 0 0 0 5.74-5.73V8.89a7.35 7.35 0 0 0 4.25 1.34V7.07a4.28 4.28 0 0 1-3.25-1.25z"
          />
        </svg>
      );

    default:
      return null;
  }
}

export function PlatformCard({
  platformKey,
  platformName,
  accounts = [],
  account = null,
  readiness,
  onConnect,
  onDisconnect,
  isDisconnecting = false,
  supportsMultiple = false
}) {
  const connectedAccounts = accounts && accounts.length > 0
    ? accounts
    : (account && account.status === 'CONNECTED' ? [account] : []);

  const isConnected = connectedAccounts.length > 0;
  const isConfigured = readiness?.isConfigured;
  const isComingSoon = readiness?.comingSoon;
  const theme = PLATFORM_THEMES[platformKey] || {
    logoBg: 'bg-blue-600',
    description: 'Link your official account to schedule and publish multi-platform content.',
    boxPrompt: `Connect your ${platformName} account to get started.`,
    buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
  };

  return (
    <div className="relative bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-[#334155] shadow-soft hover:shadow-md transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between overflow-hidden group w-full">
      {/* Top Ambient Fluid Mesh Wave */}
      {renderTopWave(platformKey)}

      {/* Top Right Options Menu Button (...) */}
      <button
        type="button"
        title="Platform options"
        onClick={() => !isConfigured && onConnect(platformKey, false)}
        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs z-10 bg-white/80 dark:bg-[#1E293B]/80 hover:bg-white dark:hover:bg-[#1E293B] text-slate-500 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Upper Section: Logo on Left, Platform Name on its Right Side */}
      <div className="relative z-10">
        <div className="flex items-center gap-3.5 pr-9">
          {/* Platform Icon */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 transition-transform duration-300 group-hover:scale-105 ${theme.logoBg}`}>
            {renderPlatformLogo(platformKey)}
          </div>

          {/* Platform Title (on the right side of the logo) */}
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] truncate">
              {platformName}
            </h3>
          </div>
        </div>

        {/* Description & Status Badge Row */}
        <div className="flex items-start justify-between gap-3 mt-3 min-h-[38px]">
          <p className="text-xs leading-relaxed max-w-[185px] sm:max-w-[200px] text-[#475569] dark:text-[#CBD5E1]">
            {theme.description}
          </p>

          <div className="shrink-0 pt-0.5">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            ) : isComingSoon ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                Coming Soon
              </span>
            ) : !isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                Setup Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium shadow-2xs bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Not Connected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Middle Account / Profile Preview Box */}
      <div className="relative z-10 my-4 p-3 rounded-2xl bg-slate-50/90 dark:bg-[#1E293B]/70 border border-slate-200/70 dark:border-[#334155] min-h-[66px] flex items-center justify-between gap-3">
        {isConnected ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              {/* Dynamic Real Profile Avatar */}
              <ProfileAvatar
                image={connectedAccounts[0]?.accountImage}
                name={connectedAccounts[0]?.accountName}
              />

              <div className="min-w-0">
                <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                  {connectedAccounts[0]?.accountName || 'Connected Account'}
                </p>
                {connectedAccounts[0]?.accountUsername && (
                  <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] truncate mt-0.5">
                    {connectedAccounts[0].accountUsername}
                  </p>
                )}
                {connectedAccounts.length > 1 && (
                  <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium truncate mt-0.5">
                    {connectedAccounts.length} pages connected
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200/80 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-snug">
              {theme.boxPrompt}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="relative z-10 w-full pt-1 shrink-0">
        {isConnected ? (
          <div className="flex items-center gap-2">
            {platformKey === 'FACEBOOK' && (
              <button
                type="button"
                onClick={() => onConnect(platformKey, true)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Manage Pages</span>
              </button>
            )}
            <button
              type="button"
              disabled={isDisconnecting}
              onClick={() => onDisconnect(connectedAccounts[0])}
              className={`${platformKey === 'FACEBOOK' ? 'flex-1' : 'w-full'} py-2.5 px-3 rounded-xl border border-rose-200/90 dark:border-rose-900/60 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        ) : isComingSoon ? (
          <Button variant="secondary" size="sm" disabled className="w-full font-bold opacity-60 text-xs py-2.5 rounded-xl">
            Coming Soon
          </Button>
        ) : !isConfigured ? (
          <Button
            variant="secondary"
            size="sm"
            icon={KeyRound}
            onClick={() => onConnect(platformKey, false)}
            className="w-full font-bold text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 text-xs py-2.5 rounded-xl"
          >
            Setup API Key
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => onConnect(platformKey, true)}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${theme.buttonStyle}`}
          >
            {renderButtonIcon(platformKey)}
            <span>Connect {platformName}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default PlatformCard;

