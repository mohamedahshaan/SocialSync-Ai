import React, { useState, useEffect } from 'react';
import { User, Shield, Key, Sparkles, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/common/Button';

export function SettingsPage() {
  const { user } = useAuth();
  const [platformStatus, setPlatformStatus] = useState({});

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await api.get('/social-accounts/status');
        if (res.success && res.data) {
          setPlatformStatus(res.data);
        }
      } catch (err) {
        console.error('Failed to load status:', err);
      }
    }
    loadStatus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Settings & API Configuration</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account profile, security credentials, and platform API integrations.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-brand-600/15 border border-brand-500/30 text-brand-600 font-bold text-lg flex items-center justify-center">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{user?.name}</h3>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-semibold text-slate-500 block mb-0.5">Account ID:</span>
            <code className="font-mono text-slate-800">{user?.id}</code>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-semibold text-slate-500 block mb-0.5">Member Since:</span>
            <span className="text-slate-800 font-medium">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}
            </span>
          </div>
        </div>
      </div>

      {/* API Integrations Status Checklist */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Platform Credentials Readiness</h3>
            <p className="text-xs text-slate-500">
              Verified presence of client IDs and secrets in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">backend/.env</code>
            </p>
          </div>
          <a
            href="https://developers.facebook.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
          >
            <span>Dev Portals</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {Object.entries(platformStatus).map(([platformKey, info]) => {
            return (
              <div
                key={platformKey}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{info.name}</h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Required: {info.requiredVars.join(', ')}
                  </p>
                </div>

                <div>
                  {info.isConfigured ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Configuration Required
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automation / n8n System Notice */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft space-y-3">
        <h3 className="text-base font-bold text-slate-900">n8n Automation Engine</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          The SocialFlow AI multi-platform publishing workflow runs via n8n orchestration.
          Import the workflow JSON located at <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">n8n/socialflow-publishing-workflow.json</code> into
          your local n8n container on <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">http://localhost:5678</code>.
        </p>
      </div>
    </div>
  );
}
