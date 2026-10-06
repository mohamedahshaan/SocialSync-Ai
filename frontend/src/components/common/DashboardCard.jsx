import React from 'react';

export function DashboardCard({ title, value, icon: Icon, trend, color = 'indigo' }) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft hover:shadow-premium transition-all">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <div className={`p-2.5 rounded-xl border ${colorMap[color] || colorMap.indigo}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</p>
        {trend && (
          <span className="text-xs font-medium text-slate-500">{trend}</span>
        )}
      </div>
    </div>
  );
}
