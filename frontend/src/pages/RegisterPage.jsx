import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      await register(name, email, password, confirmPassword);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      {/* Glow shapes */}
      <div className="absolute w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-glow mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Join SocialFlow <span className="text-brand-400">AI</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            "Create Once. Publish Everywhere."
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-premium border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Create your account</h2>
          <p className="text-xs text-slate-500 mb-6">
            Get instant access to multi-platform publishing and intelligent scheduling.
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Mohamed Ahshaan"
              icon={User}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

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
              placeholder="Min. 6 characters"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              icon={Lock}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={loading}
              icon={ArrowRight}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
