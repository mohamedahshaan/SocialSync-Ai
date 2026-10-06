import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, PlusCircle, ArrowUpDown } from 'lucide-react';
import { api } from '../services/api';
import { PostCard } from '../components/common/PostCard';
import { Button } from '../components/common/Button';
import { LoadingState, EmptyState } from '../components/common/ProtectedRoute';

export function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');

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
    fetchPosts();
  }, [statusFilter, platformFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPosts();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Post Publishing History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor and audit multi-platform delivery statuses and execution logs.
          </p>
        </div>

        <Link to="/create-post">
          <Button icon={PlusCircle} size="sm">
            Create Post
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search captions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </form>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            className="text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Channels</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="X">X (Twitter)</option>
            <option value="THREADS">Threads</option>
          </select>
        </div>
      </div>

      {/* Posts List / Grid */}
      {loading ? (
        <LoadingState message="Fetching post records..." />
      ) : posts.length === 0 ? (
        <EmptyState
          title="No posts matching your filters"
          description="Try broadening your search criteria or create a new post now."
          actionLabel="Create Post"
          onAction={() => window.location.href = '/create-post'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
