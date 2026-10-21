import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Calendar,
  Clock,
  AlertCircle,
  Check,
  Trash2,
  Tag,
  Image as ImageIcon,
  Play,
  LayoutTemplate,
  Layers,
  UploadCloud,
  Pencil,
  ChevronRight,
  Plus,
  X,
  Film,
  ExternalLink,
  MessageSquare,
  Loader2,
  RefreshCw,
  Copy,
  Languages,
  Wand2,
  Smile,
  ChevronLeft,
  Zap,
  Coins,
  BookmarkCheck,
  Save,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';
import { LoadingState } from '../components/common/ProtectedRoute';
import { PlatformIcon } from '../components/public/PlatformIcon';
import { EmojiPicker } from '../components/common/EmojiPicker';
import CollageTemplateModal from '../components/post/CollageTemplateModal';
import PlanUpgradeModal from '../components/subscription/PlanUpgradeModal';
import { getMaxTargetPlatformsForPlan } from '../utils/planConfig';
import {
  APP_TIMEZONE,
  TIMEZONE_LABEL,
  TIMEZONE_FULL_LABEL,
  TIMEZONE_CODE,
  getSriLankaDateParts,
  getSriLankaMinDate,
  sriLankaTimeToUtcIso,
  isFutureInSriLanka,
  formatSriLankaDateTime,
  getSriLankaDefaultSchedule
} from '../utils/timezone';

// 6 Supported Social Platforms
const SUPPORTED_PLATFORMS = [
  {
    key: 'FACEBOOK',
    name: 'Facebook',
    iconBg: 'bg-[#1877F2]',
    iconColor: 'text-white'
  },
  {
    key: 'INSTAGRAM',
    name: 'Instagram',
    iconBg: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    iconColor: 'text-white'
  },
  {
    key: 'LINKEDIN',
    name: 'LinkedIn',
    iconBg: 'bg-[#0A66C2]',
    iconColor: 'text-white'
  },
  {
    key: 'THREADS',
    name: 'Threads',
    iconBg: 'bg-black dark:bg-[#080D19] border border-slate-700',
    iconColor: 'text-white'
  },
  {
    key: 'TIKTOK',
    name: 'TikTok',
    iconBg: 'bg-black dark:bg-[#080D19] border border-cyan-500/40',
    iconColor: 'text-white'
  },
  {
    key: 'YOUTUBE',
    name: 'YouTube',
    iconBg: 'bg-[#FF0000]',
    iconColor: 'text-white'
  }
];

// Pre-defined Quick Tags
const INITIAL_QUICK_TAGS = [
  '#SocialSync',
  '#ContentCreator',
  '#TechNews',
  '#AI',
  '#Community',
  '#Innovation'
];

// High-performing Post Templates
const POST_TEMPLATES = [
  {
    title: '🚀 Major Feature Announcement',
    text: "Excited to unveil our latest release! 🎉\n\nWe just launched a brand new capability designed to save hours every single week. Here is what you can now do:\n\n✨ Direct multi-channel scheduling\n⚡ Intelligent AI caption assistance\n📊 Unified performance metrics\n\nTry it out today and let us know your thoughts below! 👇\n\n#ProductUpdate #BuildInPublic #Community"
  },
  {
    title: '💡 Quick Pro Tip & Insight',
    text: "Quick insight for creators and builders:\n\nConsistency beats intensity every time. Posting high-value insights 3-4 times a week generates 2.8x more engagement than irregular bursts.\n\n3 rules we live by:\n1. Hook them in the first line\n2. Deliver actionable takeaway\n3. Ask an open-ended question\n\nWhat is your #1 strategy this month?\n\n#ContentStrategy #CreatorTips #SocialSync"
  },
  {
    title: '📈 Milestone & Gratitude Celebration',
    text: "We just reached a huge milestone! 🥂\n\nThank you to every customer, creator, and partner who trusted us on this journey. We could not have built this without your constant feedback.\n\nHere is to the next chapter of building together! 🚀\n\n#Milestone #ThankYou #Community #StartupLife"
  },
  {
    title: '❓ Community Discussion & Question',
    text: "Question for the community:\n\nWhat is the biggest bottleneck in your current social media workflow? Is it caption drafting, asset creation, or tracking metrics across separate platforms?\n\nDrop your thoughts in the comments — let’s exchange notes! 💬\n\n#Community #Discussion #SocialMedia"
  }
];

export function CreatePostPage() {
  const [caption, setCaption] = useState('');
  const [mediaList, setMediaList] = useState([]); // array of { url, mediaType, filename }
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [showCollageModal, setShowCollageModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState('');

  // Derived primary media item for backwards compatibility with single-media checks
  const media = mediaList[activeMediaIdx] || mediaList[0] || null;
  const setMedia = (newMedia) => {
    if (!newMedia) {
      setMediaList([]);
      setActiveMediaIdx(0);
    } else if (Array.isArray(newMedia)) {
      setMediaList(newMedia);
      setActiveMediaIdx(0);
    } else {
      setMediaList([newMedia]);
      setActiveMediaIdx(0);
    }
  };
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Interactive UI Modals & Popovers
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [quickTags, setQuickTags] = useState(INITIAL_QUICK_TAGS);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [customTagVal, setCustomTagVal] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showModalEmojiPicker, setShowModalEmojiPicker] = useState(false);

  // AI Image Caption States
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [pendingCaption, setPendingCaption] = useState('');
  const [showImageCaptionModal, setShowImageCaptionModal] = useState(false);
  const [captionStyle, setCaptionStyle] = useState('Engaging & Casual');
  const [captionLanguage, setCaptionLanguage] = useState('English');
  const [captionPrompt, setCaptionPrompt] = useState('');
  const [generatedCaptionResult, setGeneratedCaptionResult] = useState('');
  const [lastGeneratedStyle, setLastGeneratedStyle] = useState('');
  const [lastGeneratedLang, setLastGeneratedLang] = useState('');
  const [isGeneratingVisionCaption, setIsGeneratingVisionCaption] = useState(false);
  const [visionCaptionError, setVisionCaptionError] = useState('');

  // AI Generator Form State
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('Professional & Engaging');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Close modals on Escape key press and lock background scroll
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      showImageCaptionModal || showAiModal || showTemplatesModal || showOverwriteModal
    );
    if (!isAnyModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showImageCaptionModal && !isGeneratingVisionCaption) setShowImageCaptionModal(false);
        if (showAiModal && !aiGenerating) setShowAiModal(false);
        if (showTemplatesModal) setShowTemplatesModal(false);
        if (showOverwriteModal) setShowOverwriteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    showImageCaptionModal,
    showAiModal,
    showTemplatesModal,
    showOverwriteModal,
    isGeneratingVisionCaption,
    aiGenerating
  ]);

  const { user, updateUser, refreshUser } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = isSuperAdmin || user?.role === 'ADMIN';

  // Plan-Based Target Platform Limits (Free: 2, Creator: 4, Professional: 6)
  const userPlan = (isSuperAdmin ? 'PROFESSIONAL' : (user?.plan || 'FREE')).toUpperCase();
  const maxTargetPlatforms = isSuperAdmin ? 6 : getMaxTargetPlatformsForPlan(userPlan);
  const userPlanTitle = userPlan === 'PROFESSIONAL' ? 'Professional' : userPlan === 'CREATOR' ? 'Creator' : 'Free';

  // Real-time Subscription Feature Entitlements from PostgreSQL
  const [featureEntitlements, setFeatureEntitlements] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.get('/subscriptions/features')
      .then((res) => {
        if (isMounted && res?.data) {
          setFeatureEntitlements(res.data);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [user?.plan, user?.subscription?.status]);

  const isSubscriptionActive = isSuperAdmin || !user?.subscription || (
    !['EXPIRED', 'CANCELLED', 'PAYMENT_FAILED', 'PAST_DUE'].includes(user?.subscription?.status) &&
    (!user?.subscription?.currentPeriodEnd || new Date(user?.subscription?.currentPeriodEnd) > new Date() || user?.subscription?.status === 'ACTIVE' || user?.subscription?.status === 'TRIALING')
  );

  // Professional Plan Check (AI Caption Generator exclusive to Professional Plan)
  const isProfessionalUser = isSuperAdmin || (featureEntitlements?.canUseAiCaption !== undefined
    ? Boolean(featureEntitlements.canUseAiCaption)
    : (userPlan === 'PROFESSIONAL' && isSubscriptionActive));

  // Collage Studio Check (Available in Creator and Professional plans, not in Free)
  const canAccessCollageStudio = isSuperAdmin || (featureEntitlements?.canUseCollageStudio !== undefined
    ? Boolean(featureEntitlements.canUseCollageStudio)
    : ((userPlan === 'CREATOR' || userPlan === 'PROFESSIONAL') && isSubscriptionActive));

  // Scheduled Publishing Check (Enforced dynamically based on plan configuration, not available on Free)
  const canUseScheduling = isSuperAdmin || (featureEntitlements?.canUseScheduling !== undefined
    ? Boolean(featureEntitlements.canUseScheduling)
    : (userPlan !== 'FREE' && isSubscriptionActive));

  const handleOpenCollageStudio = () => {
    if (!canAccessCollageStudio) {
      setUpgradeFeatureName('Collage Studio');
      setShowUpgradeModal(true);
      return;
    }
    setShowCollageModal(true);
  };
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ========================================================
  // AUTO-SAVE & DRAFT RECOVERY ENGINE
  // ========================================================
  const draftIdParam = searchParams.get('draftId') || searchParams.get('draft');
  const [editingDraftId, setEditingDraftId] = useState(draftIdParam || null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [saveError, setSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [isRestoredDraft, setIsRestoredDraft] = useState(false);

  // Synchronization Refs to prevent race conditions and stale closures
  const captionRef = useRef(caption);
  const mediaListRef = useRef(mediaList);
  const selectedPlatformsRef = useRef(selectedPlatforms);
  const isScheduledRef = useRef(isScheduled);
  const scheduleDateRef = useRef(scheduleDate);
  const scheduleTimeRef = useRef(scheduleTime);
  const editingDraftIdRef = useRef(editingDraftId);
  const isDirtyRef = useRef(false);
  const inFlightSaveRef = useRef(false);
  const pendingSaveRef = useRef(null);
  const requestSeqRef = useRef(0);
  const lastFinishedSeqRef = useRef(0);
  const debounceTimerRef = useRef(null);
  const hasInitialLoadedRef = useRef(false);

  // Sync refs with state
  useEffect(() => { captionRef.current = caption; }, [caption]);
  useEffect(() => { mediaListRef.current = mediaList; }, [mediaList]);
  useEffect(() => { selectedPlatformsRef.current = selectedPlatforms; }, [selectedPlatforms]);
  useEffect(() => { isScheduledRef.current = isScheduled; }, [isScheduled]);
  useEffect(() => { scheduleDateRef.current = scheduleDate; }, [scheduleDate]);
  useEffect(() => { scheduleTimeRef.current = scheduleTime; }, [scheduleTime]);
  useEffect(() => { editingDraftIdRef.current = editingDraftId; }, [editingDraftId]);

  const userCredits = user?.credits ?? 200;
  const isInsufficientCredits = userCredits <= 0;

  // Restore post data into state & refs
  const restoreDraftData = (draft) => {
    if (!draft) return false;

    const draftId = draft.id || draft.draftId || null;
    setEditingDraftId(draftId);
    editingDraftIdRef.current = draftId;

    const restoredCaption = draft.caption || '';
    setCaption(restoredCaption);
    captionRef.current = restoredCaption;

    // Restore media items with persistent backend URLs
    if (Array.isArray(draft.mediaList) && draft.mediaList.length > 0) {
      setMediaList(draft.mediaList);
      mediaListRef.current = draft.mediaList;
    } else if (Array.isArray(draft.mediaUrls) && draft.mediaUrls.length > 0) {
      const items = draft.mediaUrls.map((u, i) => ({
        url: u,
        mediaType: draft.mediaType || 'IMAGE',
        filename: `media_${i + 1}`
      }));
      setMediaList(items);
      mediaListRef.current = items;
    } else if (draft.mediaUrl) {
      const urls = draft.mediaUrl.split(',').map((s) => s.trim()).filter(Boolean);
      const items = urls.map((u, i) => ({
        url: u,
        mediaType: draft.mediaType || 'IMAGE',
        filename: `media_${i + 1}`
      }));
      setMediaList(items);
      mediaListRef.current = items;
    } else {
      setMediaList([]);
      mediaListRef.current = [];
    }

    // Restore platform selections
    if (Array.isArray(draft.platforms) && draft.platforms.length > 0) {
      const seen = new Set();
      const platformItems = [];
      for (const p of draft.platforms) {
        const key = String(p.platform).toUpperCase();
        if (!seen.has(key)) {
          seen.add(key);
          platformItems.push({
            platform: p.platform,
            socialAccountId: p.socialAccountId
          });
        }
      }
      const cappedItems = platformItems.slice(0, maxTargetPlatforms);
      setSelectedPlatforms(cappedItems);
      selectedPlatformsRef.current = cappedItems;
    }

    // Restore scheduling settings only if entitled (Sri Lanka Standard Time)
    if (draft.scheduledAt) {
      if (canUseScheduling) {
        try {
          const parts = getSriLankaDateParts(draft.scheduledAt);
          setIsScheduled(true);
          isScheduledRef.current = true;
          setScheduleDate(parts.dateStr);
          scheduleDateRef.current = parts.dateStr;
          setScheduleTime(parts.timeStr);
          scheduleTimeRef.current = parts.timeStr;
        } catch (e) {
          console.warn('Failed to parse scheduledAt in Sri Lanka timezone:', e);
        }
      }
    } else if (draft.isScheduled) {
      if (canUseScheduling) {
        setIsScheduled(true);
        isScheduledRef.current = true;
        if (draft.scheduleDate) {
          setScheduleDate(draft.scheduleDate);
          scheduleDateRef.current = draft.scheduleDate;
        }
        if (draft.scheduleTime) {
          setScheduleTime(draft.scheduleTime);
          scheduleTimeRef.current = draft.scheduleTime;
        }
      }
    }

    const savedAt = draft.updatedAt ? new Date(draft.updatedAt) : new Date();
    setDraftSavedAt(savedAt);
    setLastSavedAt(savedAt);
    setSaveStatus('saved');
    setIsRestoredDraft(true);
    isDirtyRef.current = false;

    return true;
  };

  // Manual Save as Draft: Explicit user action only
  const handleSaveDraft = async () => {
    const currentCaption = caption.trim();
    const currentMedia = mediaList;
    if (!currentCaption && currentMedia.length === 0) {
      addToast('Please enter a caption or upload media before saving a draft.', 'error');
      return;
    }

    try {
      setSaveStatus('saving');
      setSaveError('');

      const allUrls = currentMedia.map((m) => m.url);
      const isAnyVideo = currentMedia.some((m) => m.mediaType === 'VIDEO');
      let scheduledAtIso = null;
      if (isScheduled && scheduleDate && scheduleTime) {
        try {
          scheduledAtIso = sriLankaTimeToUtcIso(scheduleDate, scheduleTime);
        } catch (e) {
          scheduledAtIso = null;
        }
      }

      const payload = {
        id: editingDraftId || undefined,
        draftId: editingDraftId || undefined,
        caption: currentCaption,
        mediaUrl: allUrls.join(',') || null,
        mediaUrls: allUrls,
        mediaType: isAnyVideo ? 'VIDEO' : (currentMedia.length > 0 ? 'IMAGE' : 'NONE'),
        platforms: selectedPlatforms,
        scheduledAt: scheduledAtIso
      };

      const res = await api.post('/posts/draft', payload);
      if (res.success && res.data) {
        const savedDraft = res.data;
        setEditingDraftId(savedDraft.id);
        editingDraftIdRef.current = savedDraft.id;

        // Update URL with draftId so the user clearly knows they are editing this draft
        const newParams = new URLSearchParams(window.location.search);
        newParams.set('draftId', savedDraft.id);
        window.history.replaceState(null, '', `${window.location.pathname}?${newParams.toString()}`);

        const savedAt = savedDraft.updatedAt ? new Date(savedDraft.updatedAt) : new Date();
        setDraftSavedAt(savedAt);
        setLastSavedAt(savedAt);
        setSaveStatus('saved');
        isDirtyRef.current = false;
        setIsRestoredDraft(true);

        addToast('Draft saved successfully! You can find it in your Drafts.', 'success');
      } else {
        setSaveStatus('error');
        addToast(res.message || 'Failed to save draft.', 'error');
      }
    } catch (err) {
      console.error('Save draft error:', err);
      setSaveStatus('error');
      addToast(err.response?.data?.message || err.message || 'Failed to save draft.', 'error');
    }
  };

  // 1. Initial Mount: Explicit Draft Restoration Only (via ?draftId=) or Fresh Canvas
  useEffect(() => {
    let isMounted = true;

    async function initEditor() {
      try {
        setLoadingDraft(true);

        // Case A: User explicitly requested fresh blank canvas or starter template
        const isExplicitNew = searchParams.get('new') === 'true' || searchParams.get('newPost') === 'true';
        const templateParam = searchParams.get('template') || searchParams.get('caption');
        if (isExplicitNew || templateParam) {
          if (user?.id) {
            localStorage.removeItem(`socialsync_draft_backup_${user.id}`);
          }
          setEditingDraftId(null);
          editingDraftIdRef.current = null;
          if (templateParam) {
            setCaption(templateParam);
          }
          setSearchParams({});
          hasInitialLoadedRef.current = true;
          return;
        }

        // Case B: Explicit draftId requested via URL (e.g. from Drafts page Edit button)
        const paramId = searchParams.get('draftId') || searchParams.get('draft');
        if (paramId) {
          try {
            const res = await api.get(`/posts/${paramId}`);
            if (!isMounted) return;
            if (res.success && res.data) {
              if (res.data.status === 'DRAFT') {
                restoreDraftData(res.data);
              } else {
                // Post was already published or scheduled - do not bind to this ID
                const newParams = new URLSearchParams(window.location.search);
                newParams.delete('draftId');
                newParams.delete('draft');
                window.history.replaceState(null, '', `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`);
                restoreDraftData({ ...res.data, id: null, draftId: null });
                setEditingDraftId(null);
                editingDraftIdRef.current = null;
              }
            }
          } catch (e) {
            console.warn('Failed to load requested draft by URL param:', e);
            const newParams = new URLSearchParams(window.location.search);
            newParams.delete('draftId');
            newParams.delete('draft');
            window.history.replaceState(null, '', `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`);
            setEditingDraftId(null);
            editingDraftIdRef.current = null;
          }
          hasInitialLoadedRef.current = true;
          return;
        }

        // Case C: Standard navigation (Sidebar / Create Post button)
        // Never automatically restore abandoned drafts or localStorage caches. Always start fresh!
        if (user?.id) {
          localStorage.removeItem(`socialsync_draft_backup_${user.id}`);
        }
        setEditingDraftId(null);
        editingDraftIdRef.current = null;
        isDirtyRef.current = false;
      } catch (err) {
        console.error('Draft init error:', err);
      } finally {
        if (isMounted) {
          setLoadingDraft(false);
          hasInitialLoadedRef.current = true;
        }
      }
    }

    initEditor();

    return () => {
      isMounted = false;
    };
  }, [user?.id, searchParams]);

  // Handle URL mode=schedule or schedule=true with entitlement gating
  useEffect(() => {
    const isScheduleMode = searchParams.get('mode') === 'schedule' || searchParams.get('schedule') === 'true';
    if (!isScheduleMode) return;

    if (canUseScheduling) {
      setIsScheduled(true);
      isScheduledRef.current = true;
      if (!scheduleDateRef.current || !scheduleTimeRef.current) {
        const defaultSched = getSriLankaDefaultSchedule();
        setScheduleDate(defaultSched.date);
        scheduleDateRef.current = defaultSched.date;
        setScheduleTime(defaultSched.time);
        scheduleTimeRef.current = defaultSched.time;
      }
    } else {
      setIsScheduled(false);
      isScheduledRef.current = false;
      setUpgradeFeatureName('Schedule');
      setShowUpgradeModal(true);
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('mode');
      newParams.delete('schedule');
      window.history.replaceState(null, '', `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`);
    }
  }, [searchParams, canUseScheduling]);

  // 2. Track Unsaved Changes (Dirty State) for Accidental Data Loss Prevention
  useEffect(() => {
    if (!hasInitialLoadedRef.current) return;
    if (caption.trim() !== '' || mediaList.length > 0) {
      isDirtyRef.current = true;
    }
  }, [caption, mediaList, selectedPlatforms]);

  // 3. Prevent Accidental Data Loss: Browser tab closing warning
  // Does NOT silently save to backend or localStorage!
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirtyRef.current && (captionRef.current.trim() || mediaListRef.current.length > 0)) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Start Fresh blank canvas
  const handleStartFresh = () => {
    if (user?.id) {
      localStorage.removeItem(`socialsync_draft_backup_${user.id}`);
    }
    setEditingDraftId(null);
    editingDraftIdRef.current = null;
    setDraftSavedAt(null);
    setLastSavedAt(null);
    setSaveStatus('idle');
    setSaveError('');
    setIsRestoredDraft(false);
    isDirtyRef.current = false;

    setCaption('');
    captionRef.current = '';
    setMediaList([]);
    mediaListRef.current = [];
    setIsScheduled(false);
    isScheduledRef.current = false;
    setScheduleDate('');
    scheduleDateRef.current = '';
    setScheduleTime('');
    scheduleTimeRef.current = '';

    const initial = connectedAccounts.slice(0, maxTargetPlatforms).map((acc) => ({
      platform: acc.platform,
      socialAccountId: acc.id
    }));
    setSelectedPlatforms(initial);
    selectedPlatformsRef.current = initial;

    setSearchParams({});
    addToast('Started fresh post canvas.', 'info');
  };

  // Load connected accounts on mount (preserving restored platforms if draft already loaded)
  useEffect(() => {
    async function fetchAccounts() {
      try {
        setLoadingAccounts(true);
        const res = await api.get('/social-accounts');
        if (res.success && res.data) {
          setConnectedAccounts(res.data);
          setSelectedPlatforms((prev) => {
            if (prev.length > 0) return prev;
            return res.data.slice(0, maxTargetPlatforms).map((acc) => ({
              platform: acc.platform,
              socialAccountId: acc.id
            }));
          });
        }
      } catch (err) {
        setError('Failed to load your connected social accounts.');
      } finally {
        setLoadingAccounts(false);
      }
    }

    fetchAccounts();
  }, []);

  // Hashtag adder
  const handleAddHashtag = (tag) => {
    if (!tag) return;
    const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
    setCaption((prev) => {
      if (prev.includes(cleanTag)) return prev;
      return prev ? `${prev} ${cleanTag}` : cleanTag;
    });
    addToast(`Added ${cleanTag} to post`, 'info');
  };

  // Custom Tag creation
  const handleCreateCustomTag = (e) => {
    e.preventDefault();
    if (!customTagVal.trim()) return;
    const tag = customTagVal.trim().startsWith('#') ? customTagVal.trim() : `#${customTagVal.trim()}`;
    if (!quickTags.includes(tag)) {
      setQuickTags((prev) => [...prev, tag]);
    }
    handleAddHashtag(tag);
    setCustomTagVal('');
    setShowCustomTagInput(false);
  };

  // Vision-based AI Image Caption Generator
  const openImageCaptionStudio = () => {
    if (!isProfessionalUser) {
      setUpgradeFeatureName('AI Caption Generator');
      setShowUpgradeModal(true);
      return;
    }

    setError('');
    setVisionCaptionError('');

    // If media is not uploaded yet
    if (!media || !media.url) {
      addToast('Please upload an image first to generate an AI caption.', 'warning');
      setError('Please upload an image first. Click "Add Image" or drop an image into the upload box below.');
      fileInputRef.current?.click();
      return;
    }

    // If media is a video
    const isVideo = media.mediaType === 'VIDEO' || /\.(mp4|mov|webm|avi)$/i.test(media.url);
    if (isVideo) {
      addToast('AI Image Captioning requires an image file (JPG, PNG, WEBP). Videos are not supported.', 'warning');
      setError('AI Image Captioning requires an image file. Please upload an image to generate an AI caption.');
      return;
    }

    setShowImageCaptionModal(true);
    // User chooses style and language first, then clicks "Generate Now"
  };

  const handleGenerateCaptionFromImage = async (overrideStyle, overrideLang) => {
    if (!media || !media.url) return;
    setVisionCaptionError('');
    setIsGeneratingVisionCaption(true);
    setAnalyzingImage(true);

    const styleToUse = overrideStyle || captionStyle;
    const langToUse = overrideLang || captionLanguage;

    try {
      const res = await api.post('/posts/generate-caption', {
        mediaUrl: media.url,
        style: styleToUse,
        language: langToUse,
        prompt: captionPrompt?.trim() || undefined
      });

      if (res.success && res.caption) {
        const text = res.caption.trim();
        setGeneratedCaptionResult(text);
        setLastGeneratedStyle(styleToUse);
        setLastGeneratedLang(langToUse);
        addToast(`AI caption generated successfully (${langToUse})!`, 'success');
      } else {
        const msg = (res.message || 'Could not generate caption for this image.')
          .replace(/Gemini Vision|Google Gemini|Gemini/gi, 'AI');
        setVisionCaptionError(msg);
        addToast(msg, 'error');
      }
    } catch (err) {
      if (err.status === 403 || err.response?.status === 403 || err.code === 'PLAN_UPGRADE_REQUIRED' || err.data?.code === 'PLAN_UPGRADE_REQUIRED') {
        setShowImageCaptionModal(false);
        setUpgradeFeatureName('AI Caption Generator');
        setShowUpgradeModal(true);
        return;
      }
      const msg = (err.message || 'Failed to analyze image. Please try again.')
        .replace(/Gemini Vision|Google Gemini|Gemini/gi, 'AI');
      setVisionCaptionError(msg);
      addToast(msg, 'error');
    } finally {
      setIsGeneratingVisionCaption(false);
      setAnalyzingImage(false);
    }
  };

  const handleInsertCaptionIntoEditor = () => {
    if (!generatedCaptionResult?.trim()) return;

    if (caption && caption.trim()) {
      setPendingCaption(generatedCaptionResult.trim());
      setShowImageCaptionModal(false);
      setShowOverwriteModal(true);
    } else {
      setCaption(generatedCaptionResult.trim());
      setShowImageCaptionModal(false);
      addToast('Caption inserted into your draft!', 'success');
    }
  };

  const handleAiCaptionClick = () => {
    openImageCaptionStudio();
  };

  // Clear caption
  const handleClearCaption = () => {
    if (!caption) return;
    setCaption('');
    addToast('Caption cleared.', 'info');
  };

  // Insert emoji at cursor position or append to caption
  const handleInsertEmoji = (emoji) => {
    if (!textareaRef.current) {
      setCaption((prev) => prev + emoji);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? caption.length;
    const end = textarea.selectionEnd ?? caption.length;
    const newCaption = caption.substring(0, start) + emoji + caption.substring(end);
    setCaption(newCaption);
    setTimeout(() => {
      textarea.focus();
      const nextPos = start + emoji.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 0);
  };

  // Insert emoji into modal caption
  const handleInsertModalEmoji = (emoji) => {
    setGeneratedCaptionResult((prev) => prev + emoji);
  };

  // AI Generator Handler
  const handleGenerateAi = (e) => {
    if (e) e.preventDefault();
    setAiGenerating(true);
    setTimeout(() => {
      const topic = aiTopic.trim() || 'Exciting update from our team';
      const generatedText = `🚀 Big Announcement: ${topic}!\n\nWe're thrilled to share this with our entire community. Every step of this was crafted with passion, innovation, and direct user feedback.\n\n✨ Key Highlights:\n• Seamless cross-platform reach\n• Faster workflows with real-time sync\n• Built for creator & brand impact\n\n👉 What do you think? Drop a comment below!\n\n#SocialSync #Innovation #TechLaunch #Community`;
      setCaption(generatedText);
      setAiGenerating(false);
      setShowAiModal(false);
      setAiTopic('');
      addToast('AI Caption generated and inserted!', 'success');
    }, 600);
  };

  // File Upload Handling (Supports single & multiple files)
  const handleFiles = async (filesInput, forceType) => {
    setError('');
    if (!filesInput) return;

    const filesArray = Array.from(filesInput instanceof FileList ? filesInput : (Array.isArray(filesInput) ? filesInput : [filesInput])).filter(Boolean);
    if (filesArray.length === 0) return;

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov'];

    for (const file of filesArray) {
      const ext = `.${file.name.split('.').pop().toLowerCase()}`;
      if (!allowedExtensions.includes(ext)) {
        setError(`Unsupported format in "${file.name}". Please upload JPG, PNG, WEBP, MP4, or MOV.`);
        return;
      }
      const isVideo = forceType === 'video' || file.type.startsWith('video/') || ['.mp4', '.mov'].includes(ext);
      const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`File "${file.name}" exceeds limit (${isVideo ? '100MB for video' : '10MB for image'}).`);
        return;
      }
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const uploadedItems = [];
      const totalFiles = filesArray.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = filesArray[i];
        const isVideo = forceType === 'video' || file.type.startsWith('video/') || /\.(mp4|mov)$/i.test(file.name);

        const formData = new FormData();
        formData.append('media', file);

        const res = await api.post('/uploads/media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const currentPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              const aggregatePercent = Math.round(((i + currentPercent / 100) / totalFiles) * 100);
              setUploadProgress(aggregatePercent);
            }
          }
        });

        const mediaUrl = res.mediaUrl || res.data?.mediaUrl || res.data?.url;
        const mediaType = (res.mediaType || res.data?.mediaType || (isVideo ? 'VIDEO' : 'IMAGE')).toUpperCase();
        const originalName = res.originalName || res.data?.originalName || file.name;

        if (mediaUrl) {
          uploadedItems.push({
            url: mediaUrl,
            mediaType: mediaType,
            filename: originalName
          });
        }
      }

      if (uploadedItems.length > 0) {
        setMediaList((prev) => [...prev, ...uploadedItems]);
        setGeneratedCaptionResult('');
        setLastGeneratedStyle('');
        setLastGeneratedLang('');
        addToast(
          uploadedItems.length > 1
            ? `${uploadedItems.length} photos added to post!`
            : 'Media uploaded successfully!',
          'success'
        );
      }
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFile = (file, forceType) => handleFiles(file, forceType);

  const handleRemoveMediaItem = (idxToRemove) => {
    setMediaList((prev) => {
      const updated = prev.filter((_, idx) => idx !== idxToRemove);
      if (activeMediaIdx >= updated.length) {
        setActiveMediaIdx(Math.max(0, updated.length - 1));
      }
      return updated;
    });
    setGeneratedCaptionResult('');
    setLastGeneratedStyle('');
    setLastGeneratedLang('');
    addToast('Photo removed from post.', 'info');
  };

  const handleClearMedia = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setMediaList([]);
    setActiveMediaIdx(0);
    setGeneratedCaptionResult('');
    setLastGeneratedStyle('');
    setLastGeneratedLang('');
    addToast('All media attachments removed.', 'info');
  };

  // Platform selection toggle
  const togglePlatform = (platformKey) => {
    const acc = connectedAccounts.find((a) => a.platform === platformKey);
    const isSelected = selectedPlatforms.some((p) => p.platform === platformKey);

    if (isSelected) {
      // Always allow deselecting
      setSelectedPlatforms((prev) => prev.filter((p) => p.platform !== platformKey));
    } else {
      // Require an eligible connected account
      if (!acc) {
        addToast(`Please connect your ${platformKey} account in Social Accounts first before selecting it.`, 'warning');
        return;
      }

      // Enforce plan selection limit (Free: 2, Creator: 4, Professional: 6)
      if (selectedPlatforms.length >= maxTargetPlatforms) {
        addToast(
          `You have reached your ${userPlanTitle} plan limit of ${maxTargetPlatforms} platform${maxTargetPlatforms === 1 ? '' : 's'} per post. Deselect a platform or upgrade your plan.`,
          'warning'
        );
        return;
      }

      setSelectedPlatforms((prev) => [
        ...prev,
        { platform: platformKey, socialAccountId: acc.id }
      ]);
    }
  };

  // Submit Post
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!caption.trim()) {
      setError('Please write a caption for your post.');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError('Please select at least one social media platform to publish to.');
      return;
    }

    if (selectedPlatforms.length > maxTargetPlatforms) {
      setError(`Your ${userPlanTitle} plan allows selecting a maximum of ${maxTargetPlatforms} target platforms per post. Please deselect ${selectedPlatforms.length - maxTargetPlatforms} platform(s) or upgrade your plan.`);
      return;
    }

    // Check if any selected platform lacks a connected account
    const unconfigured = selectedPlatforms.filter((p) => !p.socialAccountId);
    if (unconfigured.length > 0) {
      const names = unconfigured.map((p) => p.platform).join(', ');
      setError(`The following channels are not connected to an account: ${names}. Please connect them in Connect Accounts or uncheck them.`);
      return;
    }

    // Platform-specific content validation
    const hasTikTok = selectedPlatforms.some((p) => p.platform === 'TIKTOK');
    const isAnyVideo = mediaList.some((m) => m.mediaType === 'VIDEO');
    if (hasTikTok && !isAnyVideo) {
      setError('TikTok publishing requires a video file (.mp4 or .mov). Please upload a video or uncheck TikTok.');
      return;
    }

    const hasInstagram = selectedPlatforms.some((p) => p.platform === 'INSTAGRAM');
    if (hasInstagram && mediaList.length === 0) {
      setError('Instagram publishing requires media (photo or video). Please attach a file or uncheck Instagram.');
      return;
    }

    const hasYouTube = selectedPlatforms.some((p) => p.platform === 'YOUTUBE');
    if (hasYouTube && mediaList.length === 0) {
      setError('YouTube publishing requires media (image or video). Please attach a file or uncheck YouTube.');
      return;
    }

    let scheduledAtIso = null;
    if (isScheduled) {
      if (!canUseScheduling) {
        setUpgradeFeatureName('Schedule');
        setShowUpgradeModal(true);
        setError('Scheduled publishing is not available on your plan. Upgrade your plan to schedule posts in advance.');
        return;
      }
      if (!scheduleDate || !scheduleTime) {
        setError('Please select both a date and time for scheduled publication.');
        return;
      }
      if (!isFutureInSriLanka(scheduleDate, scheduleTime)) {
        setError('Scheduled date and time must be in the future (Sri Lanka Time).');
        return;
      }
      scheduledAtIso = sriLankaTimeToUtcIso(scheduleDate, scheduleTime);
    }

    try {
      setSubmitting(true);
      const allUrls = mediaList.map((m) => m.url);
      const payload = {
        draftId: editingDraftId || undefined,
        caption: caption.trim(),
        mediaUrl: allUrls.join(',') || (media?.url || null),
        mediaUrls: allUrls,
        mediaType: isAnyVideo ? 'VIDEO' : (mediaList.length > 0 ? 'IMAGE' : 'NONE'),
        platforms: selectedPlatforms,
        scheduledAt: scheduledAtIso
      };

      let res;
      try {
        res = await api.post('/posts', payload);
      } catch (postErr) {
        // If the post failed due to a stale or invalid draft ID, clear it and retry posting cleanly
        if (payload.draftId && (
          postErr.response?.status === 404 ||
          postErr.response?.data?.error === 'DRAFT_NOT_FOUND' ||
          postErr.message?.includes('Draft post not found')
        )) {
          console.warn('Draft ID was stale or invalid. Retrying post creation without draftId...');
          setEditingDraftId(null);
          editingDraftIdRef.current = null;
          if (user?.id) {
            localStorage.removeItem(`socialsync_draft_backup_${user.id}`);
          }
          const retryPayload = { ...payload, draftId: undefined };
          res = await api.post('/posts', retryPayload);
        } else {
          throw postErr;
        }
      }

      if (res && res.success && res.data) {
        if (res.data?.remainingCredits !== undefined) {
          updateUser({ credits: res.data.remainingCredits });
        } else if (refreshUser) {
          refreshUser();
        }

        // Clean up draft persistence on successful publish/schedule
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        if (user?.id) {
          localStorage.removeItem(`socialsync_draft_backup_${user.id}`);
          sessionStorage.setItem(`socialsync_cleared_editor_${user.id}`, String(Date.now()));
        }
        isDirtyRef.current = false;
        setEditingDraftId(null);
        editingDraftIdRef.current = null;

        if (isScheduled) {
          addToast('Post scheduled successfully! Queued for automated broadcast.', 'success');
          navigate('/scheduled');
        } else {
          const postStatus = res.data?.status;
          if (postStatus === 'PUBLISHED') {
            addToast('Post published successfully across all channels!', 'success');
          } else if (postStatus === 'PARTIALLY_PUBLISHED') {
            addToast('Post partially published. Check platform delivery details.', 'info');
          } else if (postStatus === 'FAILED') {
            addToast('Publishing failed across channels. Review details.', 'error');
          } else {
            addToast('Post broadcast initiated across channels!', 'success');
          }
          navigate(`/posts/${res.data.id}`);
        }
      }
    } catch (err) {
      console.error('Post submit error:', err);
      if (err.message?.includes('Draft post not found') || err.response?.data?.error === 'DRAFT_NOT_FOUND') {
        setEditingDraftId(null);
        editingDraftIdRef.current = null;
        if (user?.id) {
          localStorage.removeItem(`socialsync_draft_backup_${user.id}`);
        }
      }
      if (
        (err.response?.status === 403 || err.status === 403) &&
        (err.response?.data?.error === 'PLAN_UPGRADE_REQUIRED' || err.response?.data?.code === 'PLAN_UPGRADE_REQUIRED' || err.code === 'PLAN_UPGRADE_REQUIRED') &&
        (err.response?.data?.message?.toLowerCase().includes('schedule') || err.message?.toLowerCase().includes('schedule'))
      ) {
        setUpgradeFeatureName('Schedule');
        setShowUpgradeModal(true);
      }
      setError(err.message || 'Failed to create post. Please review inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAccounts) {
    return <LoadingState message="Loading your account channels..." />;
  }

  const selectedCount = selectedPlatforms.length;
  const isLimitReached = selectedCount >= maxTargetPlatforms;

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300 font-medium animate-shake">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:bg-rose-200/50 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Draft Indicator Banner */}
      {editingDraftId && (
        <div className="p-3.5 px-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <BookmarkCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">
              Editing saved draft <strong className="font-mono">#{editingDraftId.slice(-8)}</strong>
              {draftSavedAt && (
                <span className="opacity-75 ml-1.5 hidden sm:inline">
                  • Last saved {formatSriLankaDateTime(draftSavedAt)}
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={handleStartFresh}
            className="px-3 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
          >
            Start Fresh Post
          </button>
        </div>
      )}

      {/* ========================================================
          2. MAIN CONTENT GRID (LEFT COMPOSER, RIGHT CONTROLS)
      ======================================================== */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          
          {/* ========================================================
              LEFT COLUMN (COL-SPAN-8): CONTENT, TAGS, MEDIA
          ======================================================== */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-7 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-6">
              {/* --- Post Caption Section --- */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A] dark:text-white">
                    <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Post Caption</span>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500">
                    {caption.length} / 5000
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    rows={4}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="What would you like to share with your audience?"
                    className="w-full rounded-2xl p-4 pb-11 pr-11 text-sm bg-slate-50/70 dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-y min-h-[135px] placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />

                  {/* Emoji Icon inside Caption Box - Right Side Under */}
                  <div className="absolute right-2.5 bottom-2.5 z-10">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                        showEmojiPicker
                          ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30'
                          : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 bg-white/80 dark:bg-[#1E293B]/80 border border-[#E2E8F0] dark:border-[#334155] shadow-xs'
                      }`}
                      title="Insert emojis into caption"
                      aria-label="Insert emojis into caption"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    {showEmojiPicker && (
                      <EmojiPicker
                        align="right"
                        onSelect={handleInsertEmoji}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    )}
                  </div>
                </div>

                {/* Analyzing Image Status Banner */}
                {analyzingImage && (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-300 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="font-medium">Analyzing image and generating caption...</span>
                  </div>
                )}

                {/* Toolbar underneath Textarea (Clean: AI Caption on left, Clear on right) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={openImageCaptionStudio}
                    disabled={analyzingImage || isGeneratingVisionCaption}
                    title={media?.url ? 'Generate caption from uploaded image with AI Vision' : 'Upload an image first to generate an AI caption'}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/10 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white disabled:opacity-60 disabled:cursor-wait transition-all shadow-xs"
                  >
                    {analyzingImage || isGeneratingVisionCaption ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing image...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Caption from Image</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClearCaption}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#1E293B] text-rose-600 dark:text-rose-400 border border-[#E2E8F0] dark:border-[#334155] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* --- Quick Tags Section --- */}
              <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[#334155]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-white">
                  <Tag className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Quick Tags</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {quickTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddHashtag(tag)}
                      className={`text-xs font-medium px-3 py-1 rounded-xl border transition-all ${
                        caption.includes(tag)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-100/80 dark:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] border-[#E2E8F0] dark:border-[#334155] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}

                  {/* Add Custom Tag Button / Form */}
                  {showCustomTagInput ? (
                    <div className="inline-flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customTagVal}
                        onChange={(e) => setCustomTagVal(e.target.value)}
                        placeholder="Tag..."
                        className="text-xs px-2.5 py-1 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-24"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomTag(e)}
                      />
                      <button
                        type="button"
                        onClick={handleCreateCustomTag}
                        className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomTagInput(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCustomTagInput(true)}
                      className="w-7 h-7 rounded-xl border border-dashed border-[#E2E8F0] dark:border-[#334155] flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 transition-colors"
                      title="Add Custom Tag"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* --- Media Attachment (Optional) Section --- */}
              <div className="space-y-3 pt-2 border-t border-[#E2E8F0] dark:border-[#334155]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                    <ImageIcon className="w-4 h-4 text-indigo-500" />
                    <span>Media Attachment (Optional)</span>
                  </div>
                  <span className="text-[11px] text-[#475569] dark:text-slate-400">
                    Supported formats: JPG, JPEG, PNG, WEBP, MP4, MOV | Max size: 100MB
                  </span>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.mp4,.mov"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFiles(e.target.files);
                    }
                  }}
                />

                {/* Media Preview or Dropzone */}
                {mediaList.length > 1 ? (
                  /* Case A: Multiple Images Attached (2+ Photos) */
                  <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] dark:border-[#334155] bg-slate-900 shadow-sm space-y-0">
                    {/* Multi-Image Header Banner */}
                    <div className="p-3 bg-white dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-[#334155] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0F172A] dark:text-white">
                          📸 {mediaList.length} Photos Attached
                        </span>
                        <span className="px-2 py-0.5 rounded-full font-extrabold text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          Multi-Photo Post
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenCollageStudio}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-sm transition-all"
                          title="Combine these images into 1 stylish collage in Collage Studio"
                        >
                          <LayoutTemplate className="w-3.5 h-3.5" />
                          <span>Make as 1 Collage</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = 'image/*';
                              fileInputRef.current.click();
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#1E293B] text-[#0F172A] dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add More</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearMedia}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                          title="Remove all photos"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Active Main Preview */}
                    <div className="relative bg-slate-950/60 flex items-center justify-center min-h-[220px] max-h-72">
                      {media?.mediaType === 'VIDEO' ? (
                        <video src={media.url} controls className="w-full max-h-72 object-contain bg-black" />
                      ) : (
                        <img src={media?.url} alt="Active preview" className="w-full max-h-72 object-contain" />
                      )}

                      {/* Navigation Overlays */}
                      <button
                        type="button"
                        onClick={() => setActiveMediaIdx((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black text-white transition-all shadow-md"
                        title="Previous image"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMediaIdx((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black text-white transition-all shadow-md"
                        title="Next image"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-[11px] font-mono font-bold">
                        Photo {activeMediaIdx + 1} of {mediaList.length}
                      </div>
                    </div>

                    {/* Thumbnails Tray */}
                    <div className="p-3 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2.5 overflow-x-auto">
                      {mediaList.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveMediaIdx(idx)}
                          className={`relative group shrink-0 w-16 h-16 rounded-xl overflow-hidden border cursor-pointer transition-all ${
                            activeMediaIdx === idx
                              ? 'ring-2 ring-emerald-500 border-emerald-500 scale-105'
                              : 'border-[#E2E8F0] dark:border-[#334155] opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                          <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-black/60 text-white font-mono text-[9px] font-bold">
                            #{idx + 1}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMediaItem(idx);
                            }}
                            className="absolute top-1 right-1 p-1 rounded-md bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove this photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {mediaList.length < 10 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = 'image/*';
                              fileInputRef.current.click();
                            }
                          }}
                          className="shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-[#E2E8F0] dark:border-[#334155] hover:border-emerald-500 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-500 text-[10px] font-bold transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>

                    {/* Bottom Toolbar for AI caption */}
                    <div className="p-2.5 bg-slate-50 dark:bg-[#0B1120] border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {media?.filename || 'Active Photo'}
                      </span>
                      <button
                        type="button"
                        onClick={openImageCaptionStudio}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-xs transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Caption for Active Photo</span>
                      </button>
                    </div>
                  </div>
                ) : mediaList.length === 1 ? (
                  /* Case B: Single Media Item */
                  <div className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] dark:border-[#334155] bg-slate-900 group">
                    {media.mediaType === 'VIDEO' || /\.(mp4|mov)$/i.test(media.url) ? (
                      <video
                        src={media.url}
                        controls
                        className="w-full max-h-72 object-contain bg-black"
                      />
                    ) : (
                      <img
                        src={media.url}
                        alt="Uploaded preview"
                        className="w-full max-h-72 object-contain bg-slate-950/20"
                      />
                    )}

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {media.mediaType !== 'VIDEO' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = 'image/*';
                              fileInputRef.current.click();
                            }
                          }}
                          className="px-2.5 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1"
                          title="Add more photos"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add More</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClearMedia}
                        className="p-1.5 bg-black/75 hover:bg-black text-white rounded-full transition-all shadow-md"
                        title="Remove Media"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#334155] flex flex-wrap items-center justify-between gap-2 text-xs text-[#475569] dark:text-[#CBD5E1]">
                      <div className="flex items-center gap-2 truncate">
                        {media.mediaType === 'VIDEO' ? (
                          <Film className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                        )}
                        <span className="font-semibold text-[#0F172A] dark:text-white truncate">
                          {media.filename || 'Attached Media File'}
                        </span>
                        {media.isCollageTemplate && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                            Template Collage
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Case C: Empty Dropzone */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleFiles(e.dataTransfer.files);
                      }
                    }}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl py-8 px-6 sm:py-9 sm:px-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-950/40 scale-[0.99]'
                        : 'border-[#E2E8F0] dark:border-[#334155] hover:border-blue-400 bg-slate-50/50 dark:bg-[#0B1120]/60 hover:bg-blue-50/20 dark:hover:bg-[#1E293B]/60'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
                        <UploadCloud className="w-6 h-6" />
                      </div>

                      {uploading ? (
                        <div className="w-full max-w-xs space-y-2">
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            Uploading media...
                          </p>
                          <div className="w-full bg-slate-200 dark:bg-[#1E293B] rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                            <span className="text-blue-600 dark:text-blue-400 hover:underline">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-[#475569] dark:text-slate-400 mt-1">
                            Upload single or multiple images/videos (up to 100MB)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Media Action Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*';
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#CBD5E1] hover:border-blue-500 hover:text-blue-600 transition-all shadow-xs"
                  >
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    <span>Add Images</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'video/*';
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#CBD5E1] hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-xs"
                  >
                    <Play className="w-4 h-4 text-indigo-500" />
                    <span>Add Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saveStatus === 'saving' || submitting}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#CBD5E1] hover:border-blue-500 hover:text-blue-600 dark:hover:border-cyan-400 dark:hover:text-cyan-400 transition-all shadow-xs disabled:opacity-50"
                    title="Save current progress as a draft"
                  >
                    {saveStatus === 'saving' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    ) : (
                      <BookmarkCheck className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400" />
                    )}
                    <span>{saveStatus === 'saving' ? 'Saving...' : 'Save as Draft'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCollageStudio}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 hover:bg-emerald-100 transition-all shadow-xs"
                    title="Choose 2, 3, 4, 5, or 6 images and create a collage template in Collage Studio"
                  >
                    <LayoutTemplate className="w-4 h-4 text-emerald-500" />
                    <span>Collage Studio</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN (COL-SPAN-4): PLATFORMS & PUBLISHING MODE
          ======================================================== */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* --- 1. Target Platforms Card (Compact) --- */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                  <Layers className="w-4 h-4 text-[#3B5BFF] dark:text-[#818cf8]" />
                  <span>Target Platforms</span>
                </div>
                <span
                  id="target-platform-counter"
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors whitespace-nowrap shrink-0 ${
                    isLimitReached
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      : 'bg-blue-50 text-[#3B5BFF] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {selectedCount}/{maxTargetPlatforms} Active
                </span>
              </div>

              {/* Explanatory Banner when Plan Limit is Reached */}
              {isLimitReached && (
                <div
                  id="platform-limit-warning"
                  className="p-2.5 sm:p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 animate-fadeIn"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                      {userPlan === 'PROFESSIONAL'
                        ? 'You can choose all 6 accounts to share.'
                        : `You can choose any ${maxTargetPlatforms} accounts to share.`}
                    </p>
                  </div>
                  {userPlan !== 'PROFESSIONAL' && (
                    <button
                      type="button"
                      onClick={() => {
                        setUpgradeFeatureName('Multi-Platform Selection Limit');
                        setShowUpgradeModal(true);
                      }}
                      className="shrink-0 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Upgrade</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* 2x3 Grid of Platforms */}
              <div className="grid grid-cols-2 gap-2.5">
                {SUPPORTED_PLATFORMS.map((p) => {
                  const isSelected = selectedPlatforms.some((sp) => sp.platform === p.key);
                  const isConnected = connectedAccounts.some((acc) => acc.platform === p.key);
                  const isCardDisabled = !isSelected && (isLimitReached || !isConnected);

                  return (
                    <div
                      key={p.key}
                      id={`platform-card-${p.key.toLowerCase()}`}
                      onClick={() => togglePlatform(p.key)}
                      title={
                        !isConnected
                          ? `${p.name} is not connected. Connect in Social Accounts first.`
                          : isSelected
                          ? `Click to deselect ${p.name}`
                          : isLimitReached
                          ? `Plan limit reached (${selectedCount}/${maxTargetPlatforms}). Deselect a platform or upgrade plan to select ${p.name}.`
                          : `Click to select ${p.name}`
                      }
                      className={`relative p-2.5 rounded-xl border select-none transition-all flex flex-col items-center justify-center gap-1.5 text-center group ${
                        isSelected
                          ? 'border-[#3B5BFF] bg-[#3B5BFF]/10 dark:bg-[#3B5BFF]/20 shadow-xs ring-1 ring-[#3B5BFF]/30 cursor-pointer'
                          : isCardDisabled
                          ? 'border-[#E2E8F0] dark:border-[#334155] bg-slate-100/70 dark:bg-[#0B1120]/60 opacity-60 cursor-not-allowed'
                          : 'border-[#E2E8F0] dark:border-[#334155] bg-slate-50/60 dark:bg-[#0B1120] hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'
                      }`}
                    >
                      {/* Checkbox in top right */}
                      <div
                        className={`absolute top-2 right-2 w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-[#3B5BFF] border-[#3B5BFF] text-white'
                            : isCardDisabled
                            ? 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800'
                            : 'border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827]'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>

                      {/* Official Platform Icon Tile */}
                      <div className={`w-9 h-9 rounded-lg ${p.iconBg} flex items-center justify-center shadow-xs ${!isSelected && isCardDisabled ? 'filter grayscale-[30%]' : ''}`}>
                        <PlatformIcon platform={p.key} className="w-5 h-5 text-white" colored={false} />
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-[#0F172A] dark:text-white block leading-tight">
                          {p.name}
                        </span>
                        <span className={`text-[9px] font-medium block mt-0.5 ${
                          !isConnected
                            ? 'text-slate-400'
                            : isSelected
                            ? 'text-[#3B5BFF] dark:text-[#818cf8] font-semibold'
                            : isLimitReached
                            ? 'text-amber-500 font-medium'
                            : 'text-emerald-500'
                        }`}>
                          {!isConnected ? 'Not linked' : isSelected ? 'Selected' : isLimitReached ? 'Limit reached' : 'Connected'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>



              {connectedAccounts.length === 0 && (
                <div className="pt-1 text-center">
                  <Link
                    to="/accounts"
                    className="inline-flex items-center gap-1 text-[11px] text-[#3B5BFF] dark:text-[#818cf8] font-semibold hover:underline"
                  >
                    <span>Connect your first social account</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* --- 2. Publishing Mode Card (Compact) --- */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Publishing Mode</span>
              </div>

              {/* Mode Toggle: Share Now vs Schedule */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduled(false)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    !isScheduled
                      ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 ring-1 ring-blue-500/30'
                      : 'border-[#E2E8F0] dark:border-[#334155] bg-slate-50/50 dark:bg-[#0B1120] text-[#475569] dark:text-[#CBD5E1] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Send className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">Share Now</span>
                  </div>
                  <p className="text-[10px] opacity-80">Publish immediately</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!canUseScheduling) {
                      setUpgradeFeatureName('Schedule');
                      setShowUpgradeModal(true);
                      return;
                    }
                    setIsScheduled(true);
                    if (!scheduleDate || !scheduleTime) {
                      const defaultSched = getSriLankaDefaultSchedule();
                      if (!scheduleDate) setScheduleDate(defaultSched.date);
                      if (!scheduleTime) setScheduleTime(defaultSched.time);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isScheduled
                      ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 ring-1 ring-blue-500/30'
                      : 'border-[#E2E8F0] dark:border-[#334155] bg-slate-50/50 dark:bg-[#0B1120] text-[#475569] dark:text-[#CBD5E1] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">Schedule Post</span>
                  </div>
                  <p className="text-[10px] opacity-80">Choose date & time</p>
                </button>
              </div>

              {/* Schedule Fields */}
              {isScheduled && (
                <div className="space-y-3 pt-2 border-t border-[#E2E8F0] dark:border-[#334155] animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#CBD5E1]">
                      Publication Schedule
                    </label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      Auto-broadcasts when reached
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                    <span>
                      Timezone: <strong>{TIMEZONE_FULL_LABEL}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">
                        Publication Date (Sri Lanka)
                      </label>
                      <input
                        type="date"
                        value={scheduleDate}
                        min={getSriLankaMinDate()}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required={isScheduled}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">
                        Publication Time (SLST)
                      </label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required={isScheduled}
                      />
                    </div>
                  </div>

                  {scheduleDate && scheduleTime && (
                    <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 flex items-center gap-2 text-[11px] text-blue-700 dark:text-blue-300">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span>
                        Will publish on <strong>{formatSriLankaDateTime(sriLankaTimeToUtcIso(scheduleDate, scheduleTime))}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Insufficient Credits Warning Alert */}
              {isInsufficientCredits && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1.5 animate-shake">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Insufficient Credits</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-600 dark:text-rose-300/90">
                    You do not have enough credits to complete this broadcast. Please upgrade your package tier to get more credits.
                  </p>
                  <Link
                    to="/packages"
                    className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-300 hover:underline text-[11px] pt-0.5"
                  >
                    <span>View Packages & Tiers</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Big CTA Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={submitting || selectedPlatforms.length === 0 || isInsufficientCredits}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between text-white shadow-md transition-all cursor-pointer ${
                    submitting || selectedPlatforms.length === 0 || isInsufficientCredits
                      ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 hover:scale-[1.01] active:scale-95'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {submitting
                        ? (isScheduled ? 'Scheduling Post...' : 'Broadcasting Across Channels...')
                        : (isScheduled ? 'Schedule Post' : 'Share Now')}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </form>

      {/* ========================================================
          MODAL 0: GENERATE CAPTION FROM IMAGE (AI VISION)
      ======================================================== */}
      {showImageCaptionModal && (() => {
        const isStyleChanged = Boolean(
          generatedCaptionResult && lastGeneratedStyle && captionStyle !== lastGeneratedStyle
        );
        const isLangChanged = Boolean(
          generatedCaptionResult && lastGeneratedLang && captionLanguage !== lastGeneratedLang
        );
        const hasOptionsChanged = isStyleChanged || isLangChanged;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 transition-opacity animate-fade-in"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
              onClick={() => !isGeneratingVisionCaption && setShowImageCaptionModal(false)}
              aria-hidden="true"
            />

            <div
              className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scale-up relative z-10 flex flex-col overflow-hidden"
              style={{
                width: 'min(640px, calc(100vw - 32px))',
                maxHeight: 'calc(100dvh - 32px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header (shrink-0) */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Generate Caption from Image</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        AI Vision Studio
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                      Analyze visible context, subjects, and details to generate the perfect social post
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImageCaptionModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body Container */}
              <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-0.5">
                {/* Image Preview Thumbnail Card */}
              {media?.url && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#334155]">
                  <img
                    src={media.url}
                    alt="Uploaded attachment"
                    className="w-14 h-14 rounded-xl object-cover border border-[#E2E8F0] dark:border-[#334155] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#0F172A] dark:text-white truncate">
                      {media.filename || 'Attached image'}
                    </p>
                    <p className="text-[11px] text-[#475569] dark:text-slate-400">
                      Ready for intelligent vision analysis
                    </p>
                  </div>
                </div>
              )}

              {/* Style & Language Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-white mb-1.5">
                    Caption Style
                  </label>
                  <select
                    value={captionStyle}
                    onChange={(e) => setCaptionStyle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option>Engaging & Casual</option>
                    <option>Professional & Informative</option>
                    <option>Promotional & Marketing</option>
                    <option>Punchy & Minimalist</option>
                    <option>Storytelling & Inspiring</option>
                    <option>Humorous & Fun</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-white mb-1.5">
                    Language
                  </label>
                  <select
                    value={captionLanguage}
                    onChange={(e) => setCaptionLanguage(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Tamil</option>
                    <option>Sinhala</option>
                    <option>Hindi</option>
                    <option>Arabic</option>
                    <option>Japanese</option>
                    <option>Portuguese</option>
                  </select>
                </div>
              </div>

              {/* Optional Guidance / Focus */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-white mb-1.5">
                  Custom Focus / Guidance (Optional)
                </label>
                <input
                  type="text"
                  value={captionPrompt}
                  onChange={(e) => setCaptionPrompt(e.target.value)}
                  placeholder="e.g. Highlight upcoming date, focus on the smile, mention limited offer..."
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400"
                />
              </div>

              {/* Error Message if API fails */}
              {visionCaptionError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400">
                  {visionCaptionError}
                </div>
              )}

              {/* Notification Banner when Style or Language has changed */}
              {hasOptionsChanged && (
                <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-3 text-xs text-purple-700 dark:text-purple-300 animate-fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                    <p className="truncate">
                      {isStyleChanged && isLangChanged
                        ? `Style changed to "${captionStyle}" & Language to "${captionLanguage}"`
                        : isStyleChanged
                        ? `Caption style changed to "${captionStyle}"`
                        : `Language changed to "${captionLanguage}"`}
                      {' — Click Regenerate to update!'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateCaptionFromImage()}
                    disabled={isGeneratingVisionCaption}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGeneratingVisionCaption ? 'animate-spin' : ''}`} />
                    <span>Regenerate Now</span>
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5 text-purple-500" />
                    <span>Generated Caption (You can edit before inserting):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowModalEmojiPicker(!showModalEmojiPicker)}
                        disabled={isGeneratingVisionCaption}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-all"
                        title="Add emoji to generated caption"
                      >
                        <Smile className="w-3 h-3" />
                        <span>Add Emoji</span>
                      </button>
                      {showModalEmojiPicker && (
                        <EmojiPicker
                          onSelect={handleInsertModalEmoji}
                          onClose={() => setShowModalEmojiPicker(false)}
                        />
                      )}
                    </div>
                    {generatedCaptionResult && (
                      <span className="text-[11px] font-mono text-[#475569] dark:text-slate-400">
                        {generatedCaptionResult.length} chars
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={generatedCaptionResult}
                    onChange={(e) => setGeneratedCaptionResult(e.target.value)}
                    placeholder={
                      isGeneratingVisionCaption
                        ? 'AI is analyzing your image and writing a caption...'
                        : "Choose your style & language above, then click 'Generate Now' below..."
                    }
                    disabled={isGeneratingVisionCaption}
                    className="w-full rounded-2xl p-3.5 text-xs bg-slate-50 dark:bg-[#0B1120] text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-[#334155] focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-y min-h-[90px]"
                  />
                  {isGeneratingVisionCaption && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-[#0B1120]/70 backdrop-blur-2xs rounded-2xl flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        Analyzing image and generating caption...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons (shrink-0) */}
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
                {generatedCaptionResult ? (
                  <button
                    type="button"
                    onClick={() => handleGenerateCaptionFromImage()}
                    disabled={isGeneratingVisionCaption}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      hasOptionsChanged
                        ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-600/25 ring-2 ring-purple-400/60'
                        : 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingVisionCaption ? 'animate-spin' : ''}`} />
                    <span>
                      {isGeneratingVisionCaption
                        ? 'Regenerating...'
                        : isStyleChanged
                        ? `Regenerate (${captionStyle})`
                        : isLangChanged
                        ? `Regenerate (${captionLanguage})`
                        : 'Regenerate Caption'}
                    </span>
                  </button>
                ) : (
                  <div className="text-[11px] text-slate-400 hidden sm:block">
                    Click &apos;Generate Now&apos; to create your caption
                  </div>
                )}

                <div className="w-full sm:w-auto flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImageCaptionModal(false)}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                  >
                    Cancel
                  </button>

                  {generatedCaptionResult ? (
                    <button
                      type="button"
                      onClick={handleInsertCaptionIntoEditor}
                      disabled={!generatedCaptionResult?.trim() || isGeneratingVisionCaption}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Insert into Caption Editor</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleGenerateCaptionFromImage()}
                      disabled={isGeneratingVisionCaption}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition-all"
                    >
                      {isGeneratingVisionCaption ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Now</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ========================================================
          MODAL 1: AI CAPTION STUDIO
      ======================================================== */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 transition-opacity animate-fade-in"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)'
            }}
            onClick={() => !aiGenerating && setShowAiModal(false)}
            aria-hidden="true"
          />

          <div
            className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-up relative z-10 flex flex-col overflow-hidden"
            style={{
              width: 'min(540px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A] dark:text-white">AI Caption Studio</h3>
                  <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Draft compelling multi-platform captions in seconds</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateAi} className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-0.5">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                  What is this post about?
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Announcing our new 1-click video conversion update"
                  className="w-full text-xs p-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
                  Voice & Tone
                </label>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option>Professional & Engaging</option>
                  <option>Casual & Friendly</option>
                  <option>Excited & High-Energy</option>
                  <option>Thought Leadership & Insightful</option>
                  <option>Short, Punchy & Viral</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={aiGenerating}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 flex items-center gap-2 shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiGenerating ? 'Generating...' : 'Insert AI Caption'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: HIGH-PERFORMING TEMPLATES
      ======================================================== */}
      {showTemplatesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 transition-opacity animate-fade-in"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)'
            }}
            onClick={() => setShowTemplatesModal(false)}
            aria-hidden="true"
          />

          <div
            className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-up relative z-10 flex flex-col overflow-hidden"
            style={{
              width: 'min(640px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <LayoutTemplate className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Post Templates</h3>
                  <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">Pick a battle-tested structure to kickstart your draft</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-0.5">
              {POST_TEMPLATES.map((tpl, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50/70 dark:bg-[#0B1120] hover:border-emerald-500/50 space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">{tpl.title}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setCaption(tpl.text);
                        setShowTemplatesModal(false);
                        addToast('Template loaded into caption!', 'success');
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                    >
                      Use Template
                    </button>
                  </div>
                  <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] whitespace-pre-line line-clamp-3">
                    {tpl.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: OVERWRITE CONFIRMATION MODAL
      ======================================================== */}
      {showOverwriteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 transition-opacity animate-fade-in"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)'
            }}
            onClick={() => {
              setShowOverwriteModal(false);
              setPendingCaption('');
            }}
            aria-hidden="true"
          />

          <div
            className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scale-up relative z-10 flex flex-col overflow-hidden"
            style={{
              width: 'min(480px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">AI Caption Generated</h3>
                  <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1]">Generated from your uploaded image</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowOverwriteModal(false);
                  setPendingCaption('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 overflow-y-auto flex-1 min-h-0 pr-0.5">
              <div className="p-3.5 bg-slate-50 dark:bg-[#0B1120] rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs text-[#0F172A] dark:text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                  New AI Vision Caption:
                </span>
                <p className="italic leading-relaxed font-medium">"{pendingCaption}"</p>
              </div>

              <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                You already have text in the caption editor. How would you like to apply the newly generated caption?
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCaption(pendingCaption);
                    setShowOverwriteModal(false);
                    setPendingCaption('');
                    addToast('Caption replaced with AI caption!', 'success');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer"
                >
                  Replace Existing Caption
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCaption((prev) => (prev ? `${prev}\n\n${pendingCaption}` : pendingCaption));
                    setShowOverwriteModal(false);
                    setPendingCaption('');
                    addToast('AI caption appended to existing text!', 'success');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#0F172A] dark:text-white bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-[#E2E8F0] dark:border-[#334155] cursor-pointer"
                >
                  Append to Existing Caption
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOverwriteModal(false);
                    setPendingCaption('');
                  }}
                  className="w-full py-2 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Discard (Keep Current Text)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO COLLAGE & LAYOUT TEMPLATE STUDIO */}
      <CollageTemplateModal
        isOpen={showCollageModal}
        onClose={() => setShowCollageModal(false)}
        initialImages={
          mediaList[0]?.sourceImages && mediaList[0]?.sourceImages.length > 0
            ? mediaList[0].sourceImages
            : mediaList.filter((m) => m.mediaType !== 'VIDEO')
        }
        onApplyCollage={(compositeMedia) => {
          setMediaList([compositeMedia]);
          setActiveMediaIdx(0);
        }}
        addToast={addToast}
      />

      {/* PLAN UPGRADE MODAL */}
      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName={upgradeFeatureName}
        currentPlan={userPlan}
      />

    </div>
  );
}

export default CreatePostPage;
