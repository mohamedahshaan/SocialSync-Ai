import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Eye, Image as ImageIcon, Video as VideoIcon, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export function PostCard({ post }) {
  const formattedDate = new Date(post.scheduledAt || post.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft hover:shadow-premium transition-all flex flex-col justify-between">
      <div>
        {/* Top Header: Date and Overall Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{post.scheduledAt ? 'Scheduled: ' : 'Created: '}{formattedDate}</span>
          </div>
          <StatusBadge status={post.status} />
        </div>

        {/* Media Preview if attached */}
        {post.mediaUrl && (
          <div className="mb-3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 max-h-48 flex items-center justify-center relative group">
            {post.mediaType === 'VIDEO' ? (
              <div className="w-full py-10 flex flex-col items-center justify-center text-slate-500">
                <VideoIcon className="w-8 h-8 text-brand-500 mb-1" />
                <span className="text-xs font-semibold">Video Media</span>
              </div>
            ) : (
              <img
                src={post.mediaUrl}
                alt="Post attachment"
                className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )}
          </div>
        )}

        {/* Caption */}
        <p className="text-sm text-slate-800 line-clamp-3 mb-4 leading-relaxed font-normal whitespace-pre-line">
          {post.caption}
        </p>

        {/* Target Platforms */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.platforms?.map((target) => (
            <span
              key={target.id}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                target.status === 'PUBLISHED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : target.status === 'FAILED'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {target.platform}
            </span>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="pt-3 border-t border-slate-100 flex justify-end">
        <Link
          to={`/posts/${post.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          <span>View Platform Status</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
