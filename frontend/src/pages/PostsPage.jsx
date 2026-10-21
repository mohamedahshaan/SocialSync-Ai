import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  Check,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  CalendarCheck2,
  Calendar,
  Send,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { PostCard } from '../components/common/PostCard';
import { LoadingState, EmptyState } from '../components/common/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import {
  getSriLankaDateParts,
  getSriLankaMinDate,
  sriLankaTimeToUtcIso,
  isFutureInSriLanka,
  formatSriLankaDateTime,
  getSriLankaDefaultSchedule,
  TIMEZONE_FULL_LABEL
} from '../utils/timezone';

export function PostsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { updateUser, refreshUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const initialStatus = searchParams.get('status') || searchParams.get('filter') || '';
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [platformFilter, setPlatformFilter] = useState('');

  // Reschedule & Cancel Modal States
  const [reschedulePost, setReschedulePost] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const [cancelPost, setCancelPost] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Post Selection State
  const [selectedPostIds, setSelectedPostIds] = useState([]);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null); // null when bulk deleting
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Prevent background scrolling and support Escape to close modals
  useEffect(() => {
    const isAnyOpen = Boolean(isDeleteModalOpen || reschedulePost || cancelPost);
    if (!isAnyOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!deleting) handleCloseDeleteModal();
        if (!rescheduling) setReschedulePost(null);
        if (!cancelling) setCancelPost(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDeleteModalOpen, reschedulePost, cancelPost, deleting, rescheduling, cancelling]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (platformFilter) params.append('platform', platformFilter);

      const res = await api.get(`/posts?${params.toString()}`);
      if (res.success && res.data) {
        setPosts(res.data.posts);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const paramStatus = searchParams.get('status') || searchParams.get('filter');
    if (paramStatus !== null && paramStatus !== undefined && paramStatus !== statusFilter) {
      setStatusFilter(paramStatus);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPosts();
  }, [statusFilter, platformFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPosts();
  };

  // Toggle single post selection
  const handleToggleSelect = (postId) => {
    setSelectedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  // Toggle select all visible posts
  const handleToggleSelectAll = () => {
    if (selectedPostIds.length === posts.length && posts.length > 0) {
      setSelectedPostIds([]);
    } else {
      setSelectedPostIds(posts.map((p) => p.id));
    }
  };

  // Open delete modal for single post
  const handleOpenSingleDelete = (post) => {
    setPostToDelete(post);
    setIsDeleteModalOpen(true);
  };

  // Open delete modal for batch delete
  const handleOpenBatchDelete = () => {
    if (selectedPostIds.length === 0) return;
    setPostToDelete(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (deleting) return;
    setIsDeleteModalOpen(false);
    setPostToDelete(null);
  };

  // Execute deletion (single or batch)
  const handleConfirmDelete = async () => {
    setDeleting(true);
    setFeedback(null);

    try {
      if (postToDelete) {
        // Single delete
        const res = await api.delete(`/posts/${postToDelete.id}`);
        if (res.success) {
          setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
          setSelectedPostIds((prev) => prev.filter((id) => id !== postToDelete.id));
          setFeedback({
            type: 'success',
            message: res.message || 'Post removed from history successfully.'
          });
        } else {
          setFeedback({
            type: 'error',
            message: res.message || 'Failed to delete post.'
          });
        }
      } else {
        // Batch delete
        const res = await api.post('/posts/batch-delete', { postIds: selectedPostIds });
        if (res.success) {
          const removedIds = new Set(selectedPostIds);
          setPosts((prev) => prev.filter((p) => !removedIds.has(p.id)));
          setSelectedPostIds([]);
          setFeedback({
            type: 'success',
            message: res.message || `Selected posts removed from history.`
          });
        } else {
          setFeedback({
            type: 'error',
            message: res.message || 'Failed to delete selected posts.'
          });
        }
      }

      setIsDeleteModalOpen(false);
      setPostToDelete(null);
      setTimeout(() => setFeedback(null), 6000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'An error occurred while deleting.'
      });
      setIsDeleteModalOpen(false);
      setPostToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // Handler for Reschedule (Sri Lanka Timezone aware)
  const handleOpenReschedule = (post) => {
    setReschedulePost(post);
    if (post.scheduledAt) {
      const parts = getSriLankaDateParts(post.scheduledAt);
      setRescheduleDate(parts.dateStr);
      setRescheduleTime(parts.timeStr);
    } else {
      const defaultSched = getSriLankaDefaultSchedule();
      setRescheduleDate(defaultSched.date);
      setRescheduleTime(defaultSched.time);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulePost || !rescheduleDate || !rescheduleTime) return;
    if (!isFutureInSriLanka(rescheduleDate, rescheduleTime)) {
      setFeedback({ type: 'error', message: 'Rescheduled date and time must be in the future (Sri Lanka Time).' });
      return;
    }

    try {
      setRescheduling(true);
      const combinedIso = sriLankaTimeToUtcIso(rescheduleDate, rescheduleTime);
      const res = await api.post(`/posts/${reschedulePost.id}/reschedule`, {
        scheduledAt: combinedIso
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'Post rescheduled successfully! Background queue synchronized.' });
        setReschedulePost(null);
        fetchPosts();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to reschedule post.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error occurred while rescheduling.' });
    } finally {
      setRescheduling(false);
    }
  };

  // Handler for Cancel Schedule
  const handleOpenCancelSchedule = (post) => {
    setCancelPost(post);
  };

  const handleConfirmCancelSchedule = async () => {
    if (!cancelPost) return;

    try {
      setCancelling(true);
      const res = await api.post(`/posts/${cancelPost.id}/cancel`);

      if (res.success) {
        if (res.remainingCredits !== undefined && updateUser) {
          updateUser({ credits: res.remainingCredits });
        } else if (refreshUser) {
          refreshUser();
        }

        setFeedback({
          type: 'success',
          message: res.message || `Scheduled post cancelled. ${res.refundedPoints || 0} credits refunded.`
        });
        setCancelPost(null);
        fetchPosts();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to cancel schedule.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error occurred while cancelling schedule.' });
    } finally {
      setCancelling(false);
    }
  };

  const isAllSelected = posts.length > 0 && selectedPostIds.length === posts.length;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-sm animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="hover:underline font-bold text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Quick Status Tabs & Link to Scheduled Queue */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-soft">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('');
              setSearchParams({});
            }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === ''
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B]'
            }`}
          >
            All Posts
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('SCHEDULED');
              setSearchParams({ status: 'SCHEDULED' });
            }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'SCHEDULED'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled (Upcoming)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('PUBLISHED');
              setSearchParams({ status: 'PUBLISHED' });
            }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'PUBLISHED'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B]'
            }`}
          >
            Published
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('FAILED');
              setSearchParams({ status: 'FAILED' });
            }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'FAILED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B]'
            }`}
          >
            Failed
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('DRAFT');
              setSearchParams({ status: 'DRAFT' });
            }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'DRAFT'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B]'
            }`}
          >
            Drafts & Cancelled
          </button>
        </div>

        <Link
          to="/scheduled"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 shrink-0"
        >
          <CalendarCheck2 className="w-3.5 h-3.5" />
          <span>Scheduled Queue Hub</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-soft flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search captions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#3B5BFF] transition-all"
          />
        </form>

        {/* Dropdown Filters & Select All */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {posts.length > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-[#283548] text-[#0F172A] dark:text-[#F8FAFC] font-semibold flex items-center gap-1.5 transition-colors"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-[#3B5BFF]" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Select All ({posts.length})</span>
                </>
              )}
            </button>
          )}

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setSearchParams(e.target.value ? { status: e.target.value } : {});
            }}
            className="text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] font-medium text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#3B5BFF]"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="PARTIALLY_PUBLISHED">Partially Published</option>
            <option value="PUBLISHING">Publishing</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="FAILED">Failed</option>
            <option value="DRAFT">Draft</option>
          </select>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] font-medium text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#3B5BFF]"
          >
            <option value="">All Channels</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="THREADS">Threads</option>
            <option value="TIKTOK">TikTok</option>
            <option value="YOUTUBE">YouTube</option>
          </select>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar when posts are selected */}
      {selectedPostIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#3B5BFF]/10 dark:bg-[#3B5BFF]/20 border border-[#3B5BFF]/30 flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0F172A] dark:text-white">
              {selectedPostIds.length} post{selectedPostIds.length > 1 ? 's' : ''} specifically selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedPostIds([])}
              className="text-xs text-[#3B5BFF] dark:text-[#818cf8] hover:underline font-semibold ml-2"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenBatchDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedPostIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Posts List / Grid */}
      {loading ? (
        <LoadingState message="Fetching post records..." />
      ) : posts.length === 0 ? (
        <EmptyState
          title="No posts matching your filters"
          description="Try broadening your search criteria or create a new post now."
          actionLabel="Create Post"
          onAction={() => (window.location.href = '/create-post')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              selectable={true}
              isSelected={selectedPostIds.includes(post.id)}
              onToggleSelect={handleToggleSelect}
              onReschedule={handleOpenReschedule}
              onCancelSchedule={handleOpenCancelSchedule}
            />
          ))}
        </div>
      )}

      {/* ========================================================
          DELETE CONFIRMATION MODAL
      ======================================================== */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          style={{
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            paddingLeft: 'max(16px, env(safe-area-inset-left))',
            paddingRight: 'max(16px, env(safe-area-inset-right))'
          }}
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
            onClick={!deleting ? handleCloseDeleteModal : undefined}
            aria-hidden="true"
          />

          {/* Modal Dialog */}
          <div
            className="w-full flex flex-col overflow-hidden rounded-3xl bg-white dark:bg-[#111827] text-left align-middle shadow-2xl transition-all relative z-10 animate-fade-in border border-[#E2E8F0] dark:border-[#334155]"
            style={{
              width: 'min(480px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0 bg-white dark:bg-[#111827]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {postToDelete
                      ? 'Remove Post from History'
                      : `Delete ${selectedPostIds.length} Selected Posts`}
                  </h3>
                  <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1]">
                    Permanent deletion from account history
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDeleteModal}
                disabled={deleting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3">
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                Are you sure you want to permanently remove{' '}
                <strong>
                  {postToDelete ? 'this post' : `${selectedPostIds.length} posts`}
                </strong>{' '}
                from your post history? This record and associated delivery logs will be purged.
              </p>

              {postToDelete && (
                <div className="p-3 bg-slate-50 dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs space-y-1.5">
                  <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] line-clamp-2">
                    "{postToDelete.caption}"
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Status: {postToDelete.status}</span>
                    <span>
                      {new Date(postToDelete.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions - Non-scrolling footer */}
            <div className="shrink-0 px-6 py-4 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50/70 dark:bg-[#0B1120]/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={deleting}
                className="px-4 py-2 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {deleting ? (
                  'Deleting...'
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {postToDelete ? 'Yes, Delete Post' : `Yes, Delete ${selectedPostIds.length} Posts`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================
          RESCHEDULE MODAL
      ======================================================== */}
      {reschedulePost && (
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
            onClick={() => !rescheduling && setReschedulePost(null)}
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
                  <span className="text-[11px] text-slate-400">Post #{reschedulePost.id.slice(-8)}</span>
                </div>
              </div>
              <button
                onClick={() => !rescheduling && setReschedulePost(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-0.5">
              <div className="p-2.5 bg-slate-50 dark:bg-[#1E293B] rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <span className="font-semibold block text-[#0F172A] dark:text-white">Caption preview:</span>
                <p className="line-clamp-2 italic text-slate-500">"{reschedulePost.caption}"</p>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Timezone: <strong>{TIMEZONE_FULL_LABEL}</strong></span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    New Date (Sri Lanka)
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    min={getSriLankaMinDate()}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    New Time (SLST)
                  </label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {rescheduleDate && rescheduleTime && (
                <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 flex items-center gap-2 text-[11px] text-blue-700 dark:text-blue-300">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>
                    Will publish on <strong>{formatSriLankaDateTime(sriLankaTimeToUtcIso(rescheduleDate, rescheduleTime))}</strong>
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setReschedulePost(null)}
                disabled={rescheduling}
                className="px-4 py-2 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-[#1E293B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={rescheduling || !rescheduleDate || !rescheduleTime}
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
          CANCEL SCHEDULE MODAL
      ======================================================== */}
      {cancelPost && (
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
            onClick={() => !cancelling && setCancelPost(null)}
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
                  <span className="text-[11px] text-slate-400">Post #{cancelPost.id.slice(-8)}</span>
                </div>
              </div>
              <button
                onClick={() => !cancelling && setCancelPost(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#475569] dark:text-slate-300 leading-relaxed overflow-y-auto flex-1 min-h-0 pr-0.5">
              <p>
                Are you sure you want to cancel this scheduled publication?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400">
                <li>Automated delivery job will be cancelled immediately.</li>
                <li>Reserved platform credits will be refunded back to your balance.</li>
                <li>The post will be preserved in your drafts for future changes.</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setCancelPost(null)}
                disabled={cancelling}
                className="px-4 py-2 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-[#1E293B] cursor-pointer"
              >
                Keep Scheduled
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelSchedule}
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
    </div>
  );
}

export default PostsPage;
