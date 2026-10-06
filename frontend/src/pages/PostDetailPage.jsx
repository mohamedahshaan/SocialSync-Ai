import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCw,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Film,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { LoadingState } from '../components/common/ProtectedRoute';

export function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
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

  useEffect(() => {
    fetchPost();
  }, [id]);

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

  const formattedCreated = new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back button and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/posts"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Post Publishing Audit</h2>
              <StatusBadge status={post.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">ID: <code className="font-mono">{post.id}</code></p>
          </div>
        </div>

        {hasFailedPlatforms && (
          <Button
            variant="primary"
            icon={RotateCw}
            isLoading={retrying}
            onClick={handleRetry}
          >
            Retry Failed Platforms
          </Button>
        )}
      </div>

      {/* Main Post Content Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft space-y-4">
        <div className="flex items-center gap-4 text-xs text-slate-500 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Created {formattedCreated}</span>
          </div>
          {post.scheduledAt && (
            <div className="flex items-center gap-1.5 text-sky-600 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Scheduled for {new Date(post.scheduledAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Media Preview if attached */}
        {post.mediaUrl && (
          <div className="rounded-2xl overflow-hidden bg-slate-950/5 border border-slate-200 max-w-lg">
            {post.mediaType === 'VIDEO' ? (
              <video src={post.mediaUrl} controls className="w-full max-h-80 object-contain bg-black" />
            ) : (
              <img src={post.mediaUrl} alt="Post attachment" className="w-full max-h-80 object-contain" />
            )}
          </div>
        )}

        {/* Caption */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Caption</h4>
          <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed font-normal bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {post.caption}
          </p>
        </div>
      </div>

      {/* Per-Platform Results Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Platform Delivery Breakdown</h3>
          <span className="text-xs text-slate-400">
            {post.platforms?.filter(p => p.status === 'PUBLISHED').length} of {post.platforms?.length} delivered
          </span>
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
                    ? 'bg-emerald-50/40 border-emerald-200/80'
                    : isFailed
                    ? 'bg-rose-50/40 border-rose-200/80'
                    : 'bg-white border-slate-200/80'
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
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {target.platform.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{target.platform}</h4>
                      <p className="text-xs text-slate-500">
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
                  <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800">
                    <span>
                      Confirmed Platform Post ID: <code className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">{target.platformPostId}</code>
                    </span>
                    {target.publishedAt && (
                      <span className="text-[11px] text-emerald-700">
                        {new Date(target.publishedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}

                {isFailed && target.errorMessage && (
                  <div className="mt-3 pt-3 border-t border-rose-200/60 text-xs text-rose-800">
                    <p className="font-semibold mb-0.5">Platform API Error Response:</p>
                    <p className="font-mono text-[11px] bg-white/80 p-2.5 rounded-xl border border-rose-200 text-rose-900">
                      {target.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
