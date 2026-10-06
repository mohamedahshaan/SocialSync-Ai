import React from 'react';
import { Menu, PlusCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './Button';

export function Topbar({ onMenuClick, title = 'SocialFlow AI' }) {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 md:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/create-post">
          <Button size="sm" icon={PlusCircle}>
            Create Post
          </Button>
        </Link>
      </div>
    </header>
  );
}
