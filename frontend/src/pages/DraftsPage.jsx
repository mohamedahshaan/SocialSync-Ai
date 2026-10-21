import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  PlusCircle,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  Send,
  AlertCircle,
  CheckCircle2,
  Layers,
  Image as ImageIcon,
  Play,
  RefreshCw,
  Loader2,
  ExternalLink,
  BookmarkCheck,
  Zap,
  X,
  Copy,
  LayoutGrid,
  List,
  TrendingUp,
  Share2,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';
import { formatSriLankaDateTime } from '../utils/timezone';

// Social Channel Theme Colors
const PLATFORM_BADGES = {
  FACEBOOK: { label: 'Facebook', bg: 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20' },
  INSTAGRAM: { label: 'Instagram', bg: 'bg-[#E4405F]/10 text-[#E4405F] border-[#E4405F]/20' },
  LINKEDIN: { label: 'LinkedIn', bg: 'bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20' },
  THREADS: { label: 'Threads', bg: 'bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700' },
  TIKTOK: { label: 'TikTok', bg: 'bg-[#00F2FE]/10 text-teal-600 dark:text-[#00F2FE] border-teal-300 dark:border-teal-800' },
  YOUTUBE: { label: 'YouTube', bg: 'bg-[#FF0000]/10 text-[#FF0000] border-[#FF0000]/20' },
  X: { label: 'X', bg: 'bg-slate-800/10 text-slate-800 dark:text-slate-200 border-slate-300' }
};

export function DraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, media, text, scheduled
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, longest
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [refreshing, setRefreshing] = useState(false);

  // Delete modal state
  const [draftToDelete, setDraftToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Duplicating state
  const [duplicatingId, setDuplicatingId] = useState(null);

  // Quick Publish state
  const [publishingDraftId, setPublishingDraftId] = useState(null);

  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user, updateUser, refreshUser } = useAuth();

  const fetchDrafts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      params.append('status', 'DRAFT');
      if (search.trim()) params.append('search', search.trim());
      if (platformFilter) params.append('platform', platformFilter);

      const res = await api.get(`/posts?${params.toString()}`);
      if (res.success && res.data) {
        setDrafts(res.data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load drafts:', err);
      addToast('Failed to load drafts. Please try again.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [platformFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDrafts();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDrafts(true);
  };

  const handleReopenDraft = (draftId) => {
    navigate(`/create-post?draftId=${draftId}`);
  };

  // Duplicate a draft so user can branch variations
  const handleDuplicateDraft = async (draft) => {
    try {
      setDuplicatingId(draft.id);
      const duplicatePayload = {
        caption: `${draft.caption || ''} (Copy)`.trim(),
        mediaUrl: draft.mediaUrl || null,
        mediaUrls: draft.mediaUrls || (draft.mediaUrl ? [draft.mediaUrl] : []),
        mediaType: draft.mediaType || 'NONE',
        scheduledAt: draft.scheduledAt || null,
        platforms: (draft.platforms || []).map(p => ({
          platform: p.platform,
          socialAccountId: p.socialAccountId
        }))
      };

      const res = await api.post('/posts/drafts', duplicatePayload);
      if (res.success && res.data) {
        addToast('Draft duplicated successfully!', 'success');
        fetchDrafts(true);
      }
    } catch (err) {
      console.error('Failed to duplicate draft:', err);
      addToast('Failed to duplicate draft.', 'error');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!draftToDelete) return;
    try {
      setDeleting(true);
      const res = await api.delete(`/posts/${draftToDelete.id}`);
      if (res.success) {
        setDrafts((prev) => prev.filter((d) => d.id !== draftToDelete.id));
        addToast('Draft deleted successfully', 'success');
        setDraftToDelete(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete draft';
      addToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Keyboard navigation: Escape key closes Delete Draft modal
  useEffect(() => {
    if (!draftToDelete) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !deleting) {
        setDraftToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draftToDelete, deleting]);

  const handleQuickPublish = async (draft) => {
    if (!draft.caption || !draft.caption.trim()) {
      addToast('This draft has no caption yet. Opening in editor to complete...', 'warning');
      navigate(`/create-post?draftId=${draft.id}`);
      return;
    }

    if (!draft.platforms || draft.platforms.length === 0) {
      addToast('No target channels selected for this draft. Opening in editor...', 'warning');
      navigate(`/create-post?draftId=${draft.id}`);
      return;
    }

    try {
      setPublishingDraftId(draft.id);
      const res = await api.post(`/posts/${draft.id}/publish`);
      if (res.success) {
        if (res.data?.remainingCredits !== undefined) {
          updateUser({ credits: res.data.remainingCredits });
        } else if (refreshUser) {
          refreshUser();
        }
        addToast('Draft published successfully!', 'success');
        setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
        navigate(`/posts/${draft.id}`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to publish draft';
      addToast(msg, 'error');
    } finally {
      setPublishingDraftId(null);
    }
  };

  // Categorization Counts
  const counts = useMemo(() => {
    let media = 0;
    let text = 0;
    let scheduled = 0;
    drafts.forEach(d => {
      const hasMedia = d.mediaUrls?.length > 0 || Boolean(d.mediaUrl);
      if (hasMedia) media++;
      else text++;
      if (d.scheduledAt) scheduled++;
    });
    return { all: drafts.length, media, text, scheduled };
  }, [drafts]);

  // Filtered & Sorted Drafts
  const processedDrafts = useMemo(() => {
    let list = drafts.filter((d) => {
      // 1. Search filter
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchesCaption = (d.caption || '').toLowerCase().includes(query);
        const matchesPlatform = (d.platforms || []).some(p => p.platform.toLowerCase().includes(query));
        if (!matchesCaption && !matchesPlatform) return false;
      }

      // 2. Category filter
      const hasMedia = d.mediaUrls?.length > 0 || Boolean(d.mediaUrl);
      if (categoryFilter === 'media' && !hasMedia) return false;
      if (categoryFilter === 'text' && hasMedia) return false;
      if (categoryFilter === 'scheduled' && !d.scheduledAt) return false;

      return true;
    });

    // 3. Sorting
    list.sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'longest') {
        return (b.caption || '').length - (a.caption || '').length;
      }
      // default: newest
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

    return list;
  }, [drafts, search, categoryFilter, sortBy]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* ======================================================== */}
      {/* 1. FILTER PILLS & CONTROLS STRIP */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155]">
          {[
            { key: 'all', label: 'All Drafts', count: counts.all },
            { key: 'media', label: 'With Media', count: counts.media },
            { key: 'text', label: 'Text Only', count: counts.text },
            { key: 'scheduled', label: 'Target Scheduled', count: counts.scheduled }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategoryFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === tab.key
                  ? 'bg-white dark:bg-[#0F172A] text-blue-600 dark:text-cyan-400 shadow-xs'
                  : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                categoryFilter === tab.key
                  ? 'bg-blue-100 dark:bg-cyan-950/60 text-blue-700 dark:text-cyan-300'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right Sort, View Mode & Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-3 pr-8 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer shadow-xs appearance-none"
            >
              <option value="newest">Recently Updated</option>
              <option value="oldest">Oldest First</option>
              <option value="longest">Longest Caption</option>
            </select>
            <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Grid / List View Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#0F172A] text-blue-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#0F172A] text-blue-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-300 transition-all shadow-xs cursor-pointer"
            title="Refresh drafts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Create New Post Link */}
          <Link
            to="/create-post?new=true"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Post</span>
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SEARCH & PLATFORM FILTER BAR */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#334155] shadow-soft flex flex-col md:flex-row items-center gap-3.5">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drafts by caption keywords or channels..."
            className="w-full pl-10 pr-9 py-2 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white border border-[#E2E8F0] dark:border-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white border border-[#E2E8F0] dark:border-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all appearance-none cursor-pointer"
            >
              <option value="">All Target Channels</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="TIKTOK">TikTok</option>
              <option value="THREADS">Threads</option>
              <option value="X">X (Twitter)</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {(search || platformFilter || categoryFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPlatformFilter('');
                setCategoryFilter('all');
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. DRAFTS CONTENT / ENHANCED EMPTY STATE */}
      {/* ======================================================== */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading your saved drafts...</p>
        </div>
      ) : processedDrafts.length === 0 ? (
        /* Empty State with Creative Starter Inspiration */
        <div className="space-y-8">
          {/* Hero Empty Banner */}
          <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-[#0F172A] rounded-3xl p-8 sm:p-12 text-center border border-[#E2E8F0] dark:border-[#334155] shadow-soft max-w-3xl mx-auto space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
              <BookmarkCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">
                {search || platformFilter || categoryFilter !== 'all'
                  ? 'No matching drafts found'
                  : 'Your Creative Staging Lab'}
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                {search || platformFilter || categoryFilter !== 'all'
                  ? 'Try adjusting your search keywords or clear your active filters to see all drafts.'
                  : 'Save unfinished posts anytime with automatic cloud sync. Stage, preview, and refine your campaigns before dispatching.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/create-post?new=true"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create a Draft</span>
              </Link>
            </div>
          </div>

        </div>
      ) : viewMode === 'grid' ? (
        /* ======================================================== */
        /* 5A. GRID VIEW OF DRAFTS */
        /* ======================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedDrafts.map((draft) => {
            const hasMedia = draft.mediaUrls?.length > 0 || Boolean(draft.mediaUrl);
            const firstMedia = draft.mediaUrls?.[0] || draft.mediaUrl?.split(',')[0];
            const isVideo = draft.mediaType === 'VIDEO';
            const updatedDate = new Date(draft.updatedAt || draft.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const isPublishing = publishingDraftId === draft.id;
            const isDuplicating = duplicatingId === draft.id;
            const captionLength = (draft.caption || '').length;

            return (
              <div
                key={draft.id}
                className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#334155] shadow-soft hover:shadow-premium hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 space-y-3.5">
                  {/* Top Row: Badge, Date, and Top Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        <BookmarkCheck className="w-3 h-3" />
                        <span>Draft</span>
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        Saved {updatedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicateDraft(draft)}
                        disabled={isDuplicating}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        title="Duplicate draft"
                      >
                        {isDuplicating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftToDelete(draft)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Media Preview if attached */}
                  {hasMedia && (
                    <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 h-44 flex items-center justify-center relative group/media">
                      {isVideo ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-900/10">
                          <Play className="w-8 h-8 text-blue-600 dark:text-cyan-400 mb-1" />
                          <span className="text-xs font-semibold">Video Media Attached</span>
                        </div>
                      ) : (
                        <img
                          src={firstMedia}
                          alt="Draft attachment"
                          className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300"
                        />
                      )}

                      {draft.mediaUrls?.length > 1 && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                          +{draft.mediaUrls.length - 1} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Caption Content */}
                  <div>
                    {draft.caption && draft.caption.trim() ? (
                      <p className="text-sm text-slate-800 dark:text-slate-100 line-clamp-3 leading-relaxed whitespace-pre-line font-normal">
                        {draft.caption}
                      </p>
                    ) : (
                      <p className="text-sm italic text-slate-400 dark:text-slate-500 font-normal">
                        (No caption text saved yet)
                      </p>
                    )}
                  </div>

                  {/* Target Platforms & Character Count */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap gap-1">
                      {draft.platforms && draft.platforms.length > 0 ? (
                        draft.platforms.map((p) => (
                          <span
                            key={p.id || p.platform}
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              PLATFORM_BADGES[p.platform]?.bg || 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {p.platform}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          No channels selected
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                      {captionLength} chars
                    </span>
                  </div>

                  {/* Scheduled Target Notice if set */}
                  {draft.scheduledAt && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>
                        Target: {formatSriLankaDateTime(draft.scheduledAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 bg-slate-50/60 dark:bg-[#0B1120]/40 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleReopenDraft(draft.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:border-cyan-400 dark:hover:text-cyan-400 transition-all shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                    <span>Reopen &amp; Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickPublish(draft)}
                    disabled={isPublishing}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all disabled:opacity-50"
                    title="Publish this draft immediately across selected channels"
                  >
                    {isPublishing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isPublishing ? 'Publishing...' : 'Publish'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================================================== */
        /* 5B. COMPACT LIST VIEW OF DRAFTS */
        /* ======================================================== */
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E2E8F0] dark:border-[#334155] shadow-soft overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {processedDrafts.map((draft) => {
            const hasMedia = draft.mediaUrls?.length > 0 || Boolean(draft.mediaUrl);
            const firstMedia = draft.mediaUrls?.[0] || draft.mediaUrl?.split(',')[0];
            const isVideo = draft.mediaType === 'VIDEO';
            const updatedDate = new Date(draft.updatedAt || draft.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });

            const isPublishing = publishingDraftId === draft.id;
            const isDuplicating = duplicatingId === draft.id;

            return (
              <div
                key={draft.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-[#1E293B]/40 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Thumbnail / Media icon */}
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-400">
                    {hasMedia ? (
                      isVideo ? (
                        <Play className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
                      ) : (
                        <img src={firstMedia} alt="Media" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white truncate max-w-xl">
                      {draft.caption || '(No caption text saved yet)'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#475569] dark:text-slate-400">
                      <span>Saved {updatedDate}</span>
                      <span>•</span>
                      {/* Channel Badges */}
                      <div className="flex flex-wrap gap-1">
                        {(draft.platforms || []).map(p => (
                          <span
                            key={p.id || p.platform}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                              PLATFORM_BADGES[p.platform]?.bg || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {p.platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* List Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDuplicateDraft(draft)}
                    disabled={isDuplicating}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    title="Duplicate"
                  >
                    {isDuplicating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraftToDelete(draft)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReopenDraft(draft.id)}
                    className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-cyan-400 font-bold text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickPublish(draft)}
                    disabled={isPublishing}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. REDESIGNED COMPACT DELETE CONFIRMATION DIALOG */}
      {/* ======================================================== */}
      {draftToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-draft-title"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 transition-opacity animate-fade-in"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)'
            }}
            onClick={() => !deleting && setDraftToDelete(null)}
            aria-hidden="true"
          />

          <div
            className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl w-full text-left relative z-10 animate-scale-up flex flex-col overflow-hidden"
            style={{
              width: 'min(460px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Trash icon, Title & Close button */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 id="delete-draft-title" className="text-base font-bold text-[#0F172A] dark:text-white">
                  Delete Draft?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !deleting && setDraftToDelete(null)}
                disabled={deleting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Message */}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2.5">
              This draft will be permanently deleted. This action cannot be undone.
            </p>

            {/* Compact Subtle Caption Preview */}
            {draftToDelete.caption && (
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                "{draftToDelete.caption}"
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDraftToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deleting ? 'Deleting...' : 'Delete Draft'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DraftsPage;
