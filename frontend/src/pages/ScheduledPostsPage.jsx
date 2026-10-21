import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Plus,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Edit3,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Layers,
  Image as ImageIcon,
  Film,
  Zap,
  Info,
  X,
  Loader2,
  Copy,
  ChevronRight,
  CalendarCheck2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../components/common/ProtectedRoute';
import PlanUpgradeModal from '../components/subscription/PlanUpgradeModal';
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
import { useHeader } from '../context/HeaderContext';

export function ScheduledPostsPage() {
  const navigate = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();
  const { addToast } = useToast();
  const { setHeaderConfig } = useHeader();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'NEXT_24H' | 'LATER' | 'FAILED' | 'CANCELLED'
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [canUseScheduling, setCanUseScheduling] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Configure shared Topbar header with title, subtitle, count badge, SLST label, and + Schedule Post button
  useEffect(() => {
    setHeaderConfig({
      title: 'Scheduled Posts',
      badge: posts.length,
      subtitle: (
        <span className="flex items-center gap-1.5 flex-wrap">
          <span>Manage your upcoming and automated posts.</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
            <Clock className="w-3 h-3 text-blue-500" />
            <span>Sri Lanka Time (SLST)</span>
          </span>
        </span>
      ),
      actions: (
        <button
          type="button"
          onClick={() => {
            if (canUseScheduling === false) {
              setShowUpgradeModal(true);
            } else {
              navigate('/create-post?mode=schedule');
            }
          }}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Post</span>
        </button>
      )
    });
  }, [posts.length, canUseScheduling]);

  // Modal states for action triggers
  const [rescheduleModalPost, setRescheduleModalPost] = useState(null);
  const [newScheduleDate, setNewScheduleDate] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const [cancelModalPost, setCancelModalPost] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const [publishNowPost, setPublishNowPost] = useState(null);
  const [publishing, setPublishing] = useState(false);

  // Close modals on Escape key press and lock background scroll
  useEffect(() => {
    const isAnyModalOpen = Boolean(rescheduleModalPost || cancelModalPost || publishNowPost);
    if (!isAnyModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!rescheduling) setRescheduleModalPost(null);
        if (!cancelling) setCancelModalPost(null);
        if (!publishing) setPublishNowPost(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rescheduleModalPost, cancelModalPost, publishNowPost, rescheduling, cancelling, publishing]);

  // Standardized Sri Lanka Timezone (SLST / Asia/Colombo / GMT+05:30)
  const userTimezone = {
    name: APP_TIMEZONE,
    code: TIMEZONE_CODE,
    formatted: TIMEZONE_FULL_LABEL
  };

  // Fetch scheduling feature entitlement dynamically
  useEffect(() => {
    let isMounted = true;
    api.get('/subscriptions/features')
      .then((res) => {
        if (isMounted && res?.data?.canUseScheduling !== undefined) {
          setCanUseScheduling(Boolean(res.data.canUseScheduling));
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [user?.plan]);

  // Load scheduled posts from backend API with user isolation
  const fetchScheduledPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      // Fetch both SCHEDULED and DRAFT/FAILED if requested
      if (activeTab === 'CANCELLED') {
        params.append('status', 'DRAFT');
      } else if (activeTab === 'FAILED') {
        params.append('status', 'FAILED');
      } else {
        params.append('status', 'SCHEDULED');
      }

      if (platformFilter) {
        params.append('platform', platformFilter);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await api.get(`/posts?${params.toString()}`);
      if (res.success && res.data) {
        setPosts(res.data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load scheduled posts:', err);
      addToast(err.message || 'Failed to load scheduled queue.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledPosts();
  }, [activeTab, platformFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchScheduledPosts();
  };

  // Filter posts client-side for sub-filters (NEXT_24H vs LATER)
  const filteredPosts = useMemo(() => {
    const now = Date.now();
    const twentyFourHoursLater = now + 24 * 60 * 60 * 1000;

    return posts.filter((post) => {
      if (activeTab === 'NEXT_24H') {
        if (!post.scheduledAt) return false;
        const postTime = new Date(post.scheduledAt).getTime();
        return postTime >= now && postTime <= twentyFourHoursLater;
      }
      if (activeTab === 'LATER') {
        if (!post.scheduledAt) return false;
        const postTime = new Date(post.scheduledAt).getTime();
        return postTime > twentyFourHoursLater;
      }
      return true;
    });
  }, [posts, activeTab]);

  // Action: Open Reschedule Modal (Sri Lanka Timezone aware)
  const handleOpenReschedule = (post) => {
    setRescheduleModalPost(post);
    if (post.scheduledAt) {
      const parts = getSriLankaDateParts(post.scheduledAt);
      setNewScheduleDate(parts.dateStr);
      setNewScheduleTime(parts.timeStr);
    } else {
      const defaultSched = getSriLankaDefaultSchedule();
      setNewScheduleDate(defaultSched.date);
      setNewScheduleTime(defaultSched.time);
    }
  };

  // Action: Execute Reschedule
  const handleConfirmReschedule = async () => {
    if (!rescheduleModalPost || !newScheduleDate || !newScheduleTime) return;

    if (!isFutureInSriLanka(newScheduleDate, newScheduleTime)) {
      addToast('Rescheduled publication date and time must be in the future (Sri Lanka Time).', 'error');
      return;
    }

    try {
      setRescheduling(true);
      const combinedIso = sriLankaTimeToUtcIso(newScheduleDate, newScheduleTime);
      const res = await api.post(`/posts/${rescheduleModalPost.id}/reschedule`, {
        scheduledAt: combinedIso
      });

      if (res.success) {
        addToast('Post rescheduled successfully! Background queue synchronized.', 'success');
        setRescheduleModalPost(null);
        fetchScheduledPosts();
      } else {
        addToast(res.message || 'Failed to reschedule post.', 'error');
      }
    } catch (err) {
      addToast(err.message || 'An error occurred while rescheduling.', 'error');
    } finally {
      setRescheduling(false);
    }
  };

  // Action: Open Cancel Modal
  const handleOpenCancel = (post) => {
    setCancelModalPost(post);
  };

  // Action: Execute Cancel Schedule
  const handleConfirmCancel = async () => {
    if (!cancelModalPost) return;

    try {
      setCancelling(true);
      const res = await api.post(`/posts/${cancelModalPost.id}/cancel`);

      if (res.success) {
        if (res.remainingCredits !== undefined && updateUser) {
          updateUser({ credits: res.remainingCredits });
        } else if (refreshUser) {
          refreshUser();
        }

        addToast(
          res.message || `Scheduled post cancelled. ${res.refundedPoints || 0} credits refunded.`,
          'success'
        );
        setCancelModalPost(null);
        fetchScheduledPosts();
      } else {
        addToast(res.message || 'Failed to cancel scheduled post.', 'error');
      }
    } catch (err) {
      addToast(err.message || 'An error occurred while cancelling schedule.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  // Action: Execute Publish Now ahead of schedule
  const handleConfirmPublishNow = async () => {
    if (!publishNowPost) return;

    try {
      setPublishing(true);
      const res = await api.post(`/posts/${publishNowPost.id}/publish`);

      if (res.success && res.data) {
        if (res.data?.remainingCredits !== undefined && updateUser) {
          updateUser({ credits: res.data.remainingCredits });
        } else if (refreshUser) {
          refreshUser();
        }

        addToast('Post broadcast triggered immediately across selected platforms!', 'success');
        setPublishNowPost(null);
        navigate(`/posts/${publishNowPost.id}`);
      } else {
        addToast(res.message || 'Failed to publish post immediately.', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Failed to trigger immediate publication.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Copy Post ID
  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    addToast('Post ID copied to clipboard', 'info');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Free Tier Upgrade Notice if Scheduling is Disabled */}
      {canUseScheduling === false && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block">Scheduled Publishing is a Creator & Professional Feature</span>
              <span className="opacity-90">
                Upgrade your plan to automatically publish posts on future dates and times across all 6 social channels.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {/* ========================================================
          2. FILTER TABS & SEARCH BAR
      ======================================================== */}
      <div className="bg-white dark:bg-[#111827] p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs space-y-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium no-scrollbar">
          {[
            { key: 'ALL', label: `All Scheduled (${posts.length})` },
            { key: 'NEXT_24H', label: 'Next 24 Hours' },
            { key: 'LATER', label: 'Upcoming Later' },
            { key: 'CANCELLED', label: 'Cancelled / Drafts' },
            { key: 'FAILED', label: 'Failed' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Channel Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search captions in queue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50/60 dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </form>

          <div className="w-full sm:w-auto">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full sm:w-auto text-xs py-2 px-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50/60 dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
            >
              <option value="">All Social Channels</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="THREADS">Threads</option>
              <option value="TIKTOK">TikTok</option>
              <option value="YOUTUBE">YouTube</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. SCHEDULED POSTS LIST / GRID
      ======================================================== */}
      {loading ? (
        <LoadingState message="Fetching scheduled posts..." />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'CANCELLED'
              ? 'No cancelled drafts found'
              : activeTab === 'FAILED'
              ? 'No failed broadcasts'
              : 'Your scheduled queue is currently empty'
          }
          description="Plan your social content in advance. Select platforms, choose a date and time, and our system will publish automatically in Sri Lanka Time."
          actionLabel="Schedule Your First Post"
          onAction={() => {
            if (canUseScheduling === false) {
              setShowUpgradeModal(true);
            } else {
              navigate('/create-post?mode=schedule');
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => {
            const isDueSoon =
              post.scheduledAt &&
              new Date(post.scheduledAt).getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
              new Date(post.scheduledAt).getTime() > Date.now();

            const formattedScheduledDate = post.scheduledAt
              ? formatSriLankaDateTime(post.scheduledAt)
              : 'Not set';

            const formattedCreatedDate = formatSriLankaDateTime(post.createdAt, { includeTz: false });

            return (
              <div
                key={post.id}
                className={`bg-white dark:bg-[#111827] rounded-3xl border p-5 transition-all flex flex-col justify-between relative shadow-soft hover:shadow-premium ${
                  isDueSoon
                    ? 'border-blue-400 dark:border-blue-700/60 ring-1 ring-blue-400/20'
                    : 'border-[#E2E8F0] dark:border-[#334155]'
                }`}
              >
                <div>
                  {/* Card Header: Post ID, Status Badge & Due Soon Flag */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#E2E8F0] dark:border-[#334155]">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span>ID: #{post.id.slice(-8)}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyId(post.id)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                        title="Copy full post ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDueSoon && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          Due Soon
                        </span>
                      )}
                      <StatusBadge status={post.status} />
                    </div>
                  </div>

                  {/* Scheduled Date & Time Badge */}
                  {post.scheduledAt && (
                    <div className="mb-3 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-bold">{formattedScheduledDate}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                        SLST
                      </span>
                    </div>
                  )}

                  {/* Media Preview if attached */}
                  {post.mediaUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] max-h-40 flex items-center justify-center relative">
                      {post.mediaType === 'VIDEO' ? (
                        <div className="w-full py-8 flex flex-col items-center justify-center text-slate-400">
                          <Film className="w-7 h-7 text-blue-500 mb-1" />
                          <span className="text-[11px] font-semibold">Attached Video</span>
                        </div>
                      ) : (
                        <img
                          src={post.mediaUrl.split(',')[0]}
                          alt="Post attachment"
                          className="w-full h-36 object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* Caption Preview (Strictly visible only to owning user) */}
                  <p className="text-xs text-[#0F172A] dark:text-white line-clamp-3 mb-3 leading-relaxed whitespace-pre-line font-normal">
                    {post.caption || <span className="italic text-slate-400">No caption written</span>}
                  </p>

                  {/* Target Platforms */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.platforms?.map((target) => (
                      <span
                        key={target.id || target.platform}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      >
                        {target.platform}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Metadata & Action Buttons */}
                <div className="space-y-3 pt-3 border-t border-[#E2E8F0] dark:border-[#334155]">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Created: {formattedCreatedDate}</span>
                    {post.totalCreditsReserved > 0 && (
                      <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                        {post.totalCreditsReserved} cr. held
                      </span>
                    )}
                  </div>

                  {/* Action Buttons Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {post.status === 'SCHEDULED' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenReschedule(post)}
                          className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Reschedule</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCancel(post)}
                          className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Cancel Post</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPublishNowPost(post)}
                          className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Publish Now</span>
                        </button>

                        <Link
                          to={`/posts/${post.id}`}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0F172A] dark:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                        >
                          <span>Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to={`/create-post?draftId=${post.id}`}
                          className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit & Post</span>
                        </Link>

                        <Link
                          to={`/posts/${post.id}`}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0F172A] dark:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                        >
                          <span>View Logs</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}      {/* ========================================================
          MODAL 1: RESCHEDULE POST
      ======================================================== */}
      {rescheduleModalPost && (
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
            onClick={() => !rescheduling && setRescheduleModalPost(null)}
            aria-hidden="true"
          />

          <div
            className="bg-white dark:bg-[#111827] rounded-3xl w-full p-6 border border-[#E2E8F0] dark:border-[#334155] shadow-2xl space-y-4 animate-scale-up relative z-10 flex flex-col overflow-hidden"
            style={{
              width: 'min(480px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Reschedule Post</h3>
                  <span className="text-[11px] text-slate-400">Post #{rescheduleModalPost.id.slice(-8)}</span>
                </div>
              </div>
              <button
                onClick={() => !rescheduling && setRescheduleModalPost(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-0.5">
              <div className="p-2.5 bg-slate-50 dark:bg-[#1E293B] rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <span className="font-semibold block text-[#0F172A] dark:text-white">Caption preview:</span>
                <p className="line-clamp-2 italic text-slate-500">"{rescheduleModalPost.caption}"</p>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Timezone: <strong>{userTimezone.formatted}</strong></span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    New Date (Sri Lanka)
                  </label>
                  <input
                    type="date"
                    value={newScheduleDate}
                    min={getSriLankaMinDate()}
                    onChange={(e) => setNewScheduleDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    New Time (SLST)
                  </label>
                  <input
                    type="time"
                    value={newScheduleTime}
                    onChange={(e) => setNewScheduleTime(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {newScheduleDate && newScheduleTime && (
                <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 flex items-center gap-2 text-[11px] text-blue-700 dark:text-blue-300">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>
                    Will publish on <strong>{formatSriLankaDateTime(sriLankaTimeToUtcIso(newScheduleDate, newScheduleTime))}</strong>
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setRescheduleModalPost(null)}
                disabled={rescheduling}
                className="px-4 py-2 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-[#1E293B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={rescheduling || !newScheduleDate || !newScheduleTime}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {rescheduling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                <span>{rescheduling ? 'Updating Schedule...' : 'Save New Time'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: CANCEL SCHEDULE CONFIRMATION
      ======================================================== */}
      {cancelModalPost && (
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
            onClick={() => !cancelling && setCancelModalPost(null)}
            aria-hidden="true"
          />

          <div
            className="bg-white dark:bg-[#111827] rounded-3xl w-full p-6 border border-[#E2E8F0] dark:border-[#334155] shadow-2xl space-y-4 animate-scale-up relative z-10 flex flex-col overflow-hidden"
            style={{
              width: 'min(480px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Cancel Scheduled Post</h3>
                  <span className="text-[11px] text-slate-400">Post #{cancelModalPost.id.slice(-8)}</span>
                </div>
              </div>
              <button
                onClick={() => !cancelling && setCancelModalPost(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#475569] dark:text-slate-300 leading-relaxed overflow-y-auto flex-1 min-h-0 pr-0.5">
              <p>
                Are you sure you want to cancel this scheduled broadcast?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400">
                <li>The background automated job will be stopped immediately.</li>
                <li>Reserved platform credits will be refunded back to your balance.</li>
                <li>The post will be preserved in your Saved Drafts for future editing.</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setCancelModalPost(null)}
                disabled={cancelling}
                className="px-4 py-2 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-[#1E293B] cursor-pointer"
              >
                Keep Scheduled
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>{cancelling ? 'Cancelling...' : 'Yes, Cancel Schedule'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: PUBLISH NOW AHEAD OF TIME
      ======================================================== */}
      {publishNowPost && (
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
            onClick={() => !publishing && setPublishNowPost(null)}
            aria-hidden="true"
          />

          <div
            className="bg-white dark:bg-[#111827] rounded-3xl w-full p-6 border border-[#E2E8F0] dark:border-[#334155] shadow-2xl space-y-4 animate-scale-up relative z-10 flex flex-col overflow-hidden"
            style={{
              width: 'min(480px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Publish Immediately</h3>
                  <span className="text-[11px] text-slate-400">Post #{publishNowPost.id.slice(-8)}</span>
                </div>
              </div>
              <button
                onClick={() => !publishing && setPublishNowPost(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-0.5">
              <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                Do you want to broadcast this post right now across all {publishNowPost.platforms?.length || 0} selected channels without waiting for the scheduled time?
              </p>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setPublishNowPost(null)}
                disabled={publishing}
                className="px-4 py-2 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-[#1E293B] cursor-pointer"
              >
                Wait for Schedule
              </button>
              <button
                type="button"
                onClick={handleConfirmPublishNow}
                disabled={publishing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{publishing ? 'Publishing...' : 'Yes, Publish Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Upgrade Modal if Triggered */}
      {showUpgradeModal && (
        <PlanUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          featureName="Schedule"
        />
      )}
    </div>
  );
}

export default ScheduledPostsPage;
