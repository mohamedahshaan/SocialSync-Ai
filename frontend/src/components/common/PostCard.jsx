import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Image as ImageIcon, Video as VideoIcon, ArrowRight, Check, Clock, RotateCcw, Send, Copy } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatSriLankaDateTime, TIMEZONE_CODE } from '../../utils/timezone';

export function PostCard({
  post,
  selectable = false,
  isSelected = false,
  onToggleSelect,
  onReschedule,
  onCancelSchedule,
  onPublishNow
}) {
  const formattedDate = formatSriLankaDateTime(post.scheduledAt || post.createdAt);

  const isScheduled = post.status === 'SCHEDULED' && post.scheduledAt;

  return (
    <div
      className={`bg-white dark:bg-[#111827] rounded-3xl border p-5 transition-all flex flex-col justify-between relative group ${
        isSelected
          ? 'border-[#3B5BFF] ring-2 ring-[#3B5BFF]/30 shadow-md bg-[#3B5BFF]/5 dark:bg-[#3B5BFF]/10'
          : 'border-[#E2E8F0] dark:border-[#334155] shadow-soft hover:shadow-premium'
      }`}
    >
      <div>
        {/* Top Header: Select Checkbox, ID, Date & Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {selectable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleSelect) onToggleSelect(post.id);
                }}
                className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#3B5BFF] border-[#3B5BFF] text-white'
                    : 'border-[#CBD5E1] dark:border-[#475569] bg-white dark:bg-[#1E293B] hover:border-[#3B5BFF]'
                }`}
                title={isSelected ? 'Deselect post' : 'Select post'}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-[#475569] dark:text-[#CBD5E1] font-medium truncate">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {post.scheduledAt ? 'Scheduled: ' : 'Created: '}{formattedDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              #{post.id.slice(-6)}
            </span>
            <StatusBadge status={post.status} />
          </div>
        </div>

        {/* Scheduled Banner with Timezone if in queue */}
        {isScheduled && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-semibold truncate">Auto-publishing {formattedDate}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold shrink-0 ml-1">
              {TIMEZONE_CODE}
            </span>
          </div>
        )}

        {/* Media Preview if attached */}
        {post.mediaUrl && (
          <div className="mb-3 rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] max-h-48 flex items-center justify-center relative group">
            {post.mediaType === 'VIDEO' ? (
              <div className="w-full py-10 flex flex-col items-center justify-center text-[#475569] dark:text-slate-400">
                <VideoIcon className="w-8 h-8 text-[#3B5BFF] mb-1" />
                <span className="text-xs font-semibold">Video Media</span>
              </div>
            ) : (
              <img
                src={post.mediaUrl.split(',')[0]}
                alt="Post attachment"
                className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )}
          </div>
        )}

        {/* Caption */}
        <p className="text-sm text-[#0F172A] dark:text-[#F8FAFC] line-clamp-3 mb-4 leading-relaxed font-normal whitespace-pre-line">
          {post.caption}
        </p>

        {/* Target Platforms */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.platforms?.map((target) => (
            <span
              key={target.id || target.platform}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                target.status === 'PUBLISHED'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : target.status === 'FAILED'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {target.platform}
            </span>
          ))}
        </div>
      </div>

      {/* Footer CTA & Quick Action Controls */}
      <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] space-y-2">
        {/* Quick Scheduled Actions if Scheduled */}
        {post.status === 'SCHEDULED' && (onReschedule || onCancelSchedule) && (
          <div className="flex items-center gap-2 pb-1">
            {onReschedule && (
              <button
                type="button"
                onClick={() => onReschedule(post)}
                className="flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Clock className="w-3 h-3" />
                <span>Reschedule</span>
              </button>
            )}
            {onCancelSchedule && (
              <button
                type="button"
                onClick={() => onCancelSchedule(post)}
                className="flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300 hover:bg-amber-100 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {post.platforms?.length || 0} platform{(post.platforms?.length || 0) !== 1 ? 's' : ''}
          </span>

          <Link
            to={`/posts/${post.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B5BFF] dark:text-[#818cf8] hover:text-[#7C3AED] dark:hover:text-[#a5b4fc] transition-colors"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PostCard;
