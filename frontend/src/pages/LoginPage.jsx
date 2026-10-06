import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';
  const queryParams = new URLSearchParams(location.search);
  const sessionExpired = queryParams.get('expired') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background glowing gradients */}
      <div className="absolute w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-glow mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Welcome to SocialFlow <span className="text-brand-400">AI</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            "Create Once. Publish Everywhere."
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl p-8 shadow-premium border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Sign in to your account</h2>
          <p className="text-xs text-slate-500 mb-6">
            Manage and orchestrate all your social channels from one unified dashboard.
          </p>

          {sessionExpired && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={loading}
              icon={ArrowRight}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
