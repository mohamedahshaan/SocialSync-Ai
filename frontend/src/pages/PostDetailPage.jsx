import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCw,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Trash2,
  X,
  Coins
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { LoadingState } from '../components/common/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { formatSriLankaDateTime } from '../utils/timezone';

export function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateUser, refreshUser } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [publishingNow, setPublishingNow] = useState(false);
  const [cancellingSchedule, setCancellingSchedule] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const fetchPost = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/posts/${id}`);
      if (res.success && res.data) {
        setPost(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load post details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPostSilently = async () => {
    try {
      const res = await api.get(`/posts/${id}`);
      if (res.success && res.data) {
        setPost(res.data);
      }
    } catch {
      // Background silent polling
    }
  };

  useEffect(() => {
    fetchPost();
  }, [id]);

  // Real-time polling when post is in SCHEDULED or PUBLISHING status
  useEffect(() => {
    if (!post || (post.status !== 'SCHEDULED' && post.status !== 'PUBLISHING')) return;

    const interval = setInterval(() => {
      fetchPostSilently();
    }, 6000);

    return () => clearInterval(interval);
  }, [post?.status, id]);

  const handlePublishNow = async () => {
    try {
      setPublishingNow(true);
      const res = await api.post(`/posts/${id}/publish`);
      if (res.success && res.data) {
        setPost(res.data);
        addToast('Post published immediately across target channels!', 'success');
      } else {
        addToast(res.message || 'Failed to publish post', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Failed to execute immediate publication', 'error');
    } finally {
      setPublishingNow(false);
    }
  };

  const handleCancelSchedule = async () => {
    try {
      setCancellingSchedule(true);
      const res = await api.post(`/posts/${id}/cancel`);
      if (res.success && res.data) {
        setPost(res.data);
        if (res.remainingCredits !== undefined && updateUser) {
          updateUser({ credits: res.remainingCredits });
        } else if (refreshUser) {
          refreshUser();
        }
        addToast(res.message || 'Scheduled broadcast cancelled and credits refunded!', 'success');
      } else {
        addToast(res.message || 'Failed to cancel schedule', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Failed to cancel schedule', 'error');
    } finally {
      setCancellingSchedule(false);
    }
  };

  const handleRetry = async () => {
    try {
      setRetrying(true);
      const res = await api.post(`/posts/${id}/retry`);
      if (res.success && res.data) {
        setPost(res.data);
        addToast('Retry initiated for failed platforms', 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to retry platforms', 'error');
    } finally {
      setRetrying(false);
    }
  };

  const handleDeletePost = async () => {
    try {
      setDeleting(true);
      const res = await api.delete(`/posts/${id}`);
      if (res.success) {
        addToast(res.message || 'Post removed from history successfully', 'success');
        navigate('/posts');
      } else {
        addToast(res.message || 'Failed to delete post', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error occurred while deleting post', 'error');
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading platform delivery status..." />;
  }

  if (!post) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-slate-500">Post record not found.</p>
        <Link to="/posts" className="mt-4 inline-block text-xs font-semibold text-brand-600">
          Back to post history
        </Link>
      </div>
    );
  }

  const hasFailedPlatforms = post.platforms?.some(p => p.status === 'FAILED');

  const formattedCreated = formatSriLankaDateTime(post.createdAt);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Audit Meta Bar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/posts"
            className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#475569] dark:text-[#CBD5E1] transition-colors"
            title="Back to History"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Delivery Status:</span>
            <StatusBadge status={post.status} />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">ID: {post.id}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {post.status === 'SCHEDULED' && (
            <>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                isLoading={publishingNow}
                onClick={handlePublishNow}
              >
                Publish Now
              </Button>

              <button
                type="button"
                onClick={handleCancelSchedule}
                disabled={cancellingSchedule}
                className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {cancellingSchedule ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>Cancel Schedule</span>
              </button>
            </>
          )}

          {hasFailedPlatforms && (
            <Button
              variant="primary"
              size="sm"
              icon={RotateCw}
              isLoading={retrying}
              onClick={handleRetry}
            >
              Retry Failed Platforms
            </Button>
          )}

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Post</span>
          </button>
        </div>
      </div>

      {/* Scheduled Broadcast Information Banner */}
      {post.status === 'SCHEDULED' && (
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Scheduled Broadcast Queued
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mt-0.5">
                Automatically publishing on <span className="font-semibold text-blue-600 dark:text-blue-400">{formatSriLankaDateTime(post.scheduledAt)}</span>. No manual action needed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePublishNow}
              disabled={publishingNow}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {publishingNow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Publish Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Post Content Card */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 border border-[#E2E8F0] dark:border-[#334155] shadow-soft space-y-4">
        <div className="flex items-center gap-4 text-xs text-[#475569] dark:text-[#CBD5E1] pb-4 border-b border-[#E2E8F0] dark:border-[#334155]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
            <span>Created {formattedCreated}</span>
          </div>
          {post.scheduledAt && (
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Scheduled for {formatSriLankaDateTime(post.scheduledAt)}
              </span>
            </div>
          )}
        </div>

        {/* Media Preview if attached */}
        {post.mediaUrl && (
          <div className="rounded-2xl overflow-hidden bg-slate-950/5 dark:bg-slate-900/50 border border-[#E2E8F0] dark:border-[#334155] max-w-lg">
            {post.mediaType === 'VIDEO' ? (
              <video src={post.mediaUrl} controls className="w-full max-h-80 object-contain bg-black" />
            ) : (
              <img src={post.mediaUrl} alt="Post attachment" className="w-full max-h-80 object-contain" />
            )}
          </div>
        )}

        {/* Caption */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">Caption</h4>
          <p className="text-sm text-[#0F172A] dark:text-[#F8FAFC] whitespace-pre-line leading-relaxed font-normal bg-slate-50 dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-100 dark:border-[#334155]">
            {post.caption}
          </p>
        </div>
      </div>

      {/* Per-Platform Results Breakdown */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Platform Delivery Breakdown</h3>
            <span className="text-xs text-slate-400 dark:text-slate-400">
              {post.platforms?.filter(p => p.status === 'PUBLISHED').length} of {post.platforms?.length} delivered successfully
            </span>
          </div>

          {post.totalCreditsDeducted !== undefined && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs shadow-sm self-start sm:self-auto">
              <Coins className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span className="text-[#475569] dark:text-slate-400 font-medium">Credits Deducted:</span>
              <span className="font-mono font-bold text-[#0F172A] dark:text-white">
                {post.totalCreditsDeducted} credits
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {post.platforms?.map((target) => {
            const isSuccess = target.status === 'PUBLISHED';
            const isFailed = target.status === 'FAILED';
            const isPublishing = target.status === 'PUBLISHING';

            return (
              <div
                key={target.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isSuccess
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                    : isFailed
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                    : 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#334155]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isSuccess
                          ? 'bg-emerald-600 text-white'
                          : isFailed
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'
                      }`}
                    >
                      {target.platform.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{target.platform}</h4>
                      <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                        Target Account: <span className="font-semibold">{target.socialAccount?.accountName || 'Connected Channel'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={target.status} />
                  </div>
                </div>

                {/* Additional platform details */}
                {isSuccess && target.platformPostId && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                    <span>
                      Confirmed Platform Post ID: <code className="font-mono bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">{target.platformPostId}</code>
                    </span>
                    {target.publishedAt && (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        {new Date(target.publishedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}

                {isFailed && target.errorMessage && (
                  <div className="mt-3 pt-3 border-t border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300">
                    <p className="font-semibold mb-0.5">Platform API Error Response:</p>
                    <p className="font-mono text-[11px] bg-white/80 dark:bg-[#111827] p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200">
                      {target.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
          <div
            className="fixed inset-0 transition-opacity animate-fade-in"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)'
            }}
            onClick={() => !deleting && setIsDeleteModalOpen(false)}
            aria-hidden="true"
          />

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
                    Delete Post from History
                  </h3>
                  <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1]">
                    Permanent deletion of this post record
                  </p>
                </div>
              </div>
              <button
                onClick={() => !deleting && setIsDeleteModalOpen(false)}
                disabled={deleting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3">
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                Are you sure you want to permanently delete this post from your history? The delivery records and platform status logs will be completely removed.
              </p>
              <div className="p-3 bg-slate-50 dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs">
                <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] line-clamp-2">
                  "{post.caption}"
                </p>
              </div>
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50/70 dark:bg-[#0B1120]/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
                className="px-4 py-2 border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-[#1E293B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {deleting ? (
                  'Deleting...'
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
