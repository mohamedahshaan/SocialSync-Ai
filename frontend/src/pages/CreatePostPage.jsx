import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Calendar, Clock, Hash, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { FileUploader } from '../components/common/FileUploader';
import { PlatformSelector } from '../components/common/PlatformSelector';
import { Textarea } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { LoadingState } from '../components/common/ProtectedRoute';

export function CreatePostPage() {
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState(null); // { url, mediaType, filename }
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAccounts() {
      try {
        setLoadingAccounts(true);
        const res = await api.get('/social-accounts');
        if (res.success && res.data) {
          setConnectedAccounts(res.data);
          // By default, select all connected accounts
          const initial = res.data.map(acc => ({
            platform: acc.platform,
            socialAccountId: acc.id
          }));
          setSelectedPlatforms(initial);
        }
      } catch (err) {
        setError('Failed to load your connected social accounts.');
      } finally {
        setLoadingAccounts(false);
      }
    }

    fetchAccounts();
  }, []);

  const handleAddHashtag = (tag) => {
    setCaption(prev => (prev ? `${prev} ${tag}` : tag));
  };

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

    // Platform-specific content validation
    const hasTikTok = selectedPlatforms.some(p => p.platform === 'TIKTOK');
    if (hasTikTok && (!media || media.mediaType !== 'VIDEO')) {
      setError('TikTok publishing requires a video file (.mp4 or .mov). Please upload a video or uncheck TikTok.');
      return;
    }

    const hasInstagram = selectedPlatforms.some(p => p.platform === 'INSTAGRAM');
    if (hasInstagram && !media?.url) {
      setError('Instagram publishing requires media (photo or video). Please attach a file or uncheck Instagram.');
      return;
    }

    const hasX = selectedPlatforms.some(p => p.platform === 'X');
    if (hasX && caption.trim().length > 280) {
      setError('X (Twitter) posts are limited to 280 characters for standard accounts. Please shorten your caption.');
      return;
    }

    let scheduledAtIso = null;
    if (isScheduled) {
      if (!scheduleDate || !scheduleTime) {
        setError('Please select both a date and time for scheduled publication.');
        return;
      }
      const combined = new Date(`${scheduleDate}T${scheduleTime}`);
      if (combined <= new Date()) {
        setError('Scheduled date and time must be in the future.');
        return;
      }
      scheduledAtIso = combined.toISOString();
    }

    try {
      setSubmitting(true);
      const payload = {
        caption: caption.trim(),
        mediaUrl: media?.url || null,
        mediaType: media?.mediaType || 'NONE',
        platforms: selectedPlatforms,
        scheduledAt: scheduledAtIso
      };

      const res = await api.post('/posts', payload);

      if (res.success && res.data) {
        addToast(
          isScheduled
            ? 'Post scheduled successfully!'
            : 'Post published across selected channels!',
          'success'
        );
        navigate(`/posts/${res.data.id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to create post. Please review inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAccounts) {
    return <LoadingState message="Loading your account channels..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create & Orchestrate Post</h2>
        <p className="text-xs text-slate-500 mt-1">
          Draft your content once and simultaneously broadcast to Facebook, Instagram, LinkedIn, X, and Threads.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Caption & Media */}
          <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-soft">
            {/* Caption Editor */}
            <div>
              <Textarea
                label="Post Caption"
                placeholder="What would you like to share with your audience?"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                charCount={caption.length}
                maxCharCount={5000}
                rows={5}
                required
              />

              {/* Hashtag Helper Pills */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                  <Hash className="w-3 h-3" /> Quick Tags:
                </span>
                {['#SocialFlow', '#ContentCreator', '#TechNews', '#AI', '#SaaS', '#Growth'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddHashtag(tag)}
                    className="text-[11px] font-medium bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-600 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Media Uploader */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Media Attachment (Optional)
              </label>
              <FileUploader
                value={media}
                onChange={(uploaded) => setMedia(uploaded)}
                onClear={() => setMedia(null)}
              />
            </div>
          </div>

          {/* Right Column: Platform Selection & Scheduling */}
          <div className="space-y-6">
            {/* Platform Selection Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-soft">
              <PlatformSelector
                connectedAccounts={connectedAccounts}
                selectedPlatforms={selectedPlatforms}
                onChange={(newSelection) => setSelectedPlatforms(newSelection)}
              />
            </div>

            {/* Scheduling Options Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-soft space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Publishing Mode
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduled(false)}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    !isScheduled
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500/30'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  Share Now
                </button>

                <button
                  type="button"
                  onClick={() => setIsScheduled(true)}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isScheduled
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500/30'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Schedule
                </button>
              </div>

              {isScheduled && (
                <div className="space-y-3 pt-2 border-t border-slate-100 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Publication Date
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-brand-500 focus:outline-none"
                      required={isScheduled}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Publication Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-brand-500 focus:outline-none"
                      required={isScheduled}
                    />
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3"
                  isLoading={submitting}
                  icon={isScheduled ? Calendar : Send}
                  disabled={connectedAccounts.length === 0}
                >
                  {isScheduled ? 'Schedule Post' : 'Publish to Channels'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
