import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide administrator credentials.');
      return;
    }

    try {
      setLoading(true);
      const user = await login(email.trim(), password);

      const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN'];
      if (!ADMIN_ROLES.includes(user?.role)) {
        setError('Access denied: Account does not have administrative privileges.');
        return;
      }

      navigate('/admin/users', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 md:p-8 relative selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      {/* Background ambient glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-80 bg-blue-500/10 dark:bg-blue-900/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between py-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#475569] dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Public Website</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark Mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <Link
            to="/login"
            className="text-xs sm:text-sm font-medium text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white transition-colors"
          >
            User Portal
          </Link>
        </div>
      </div>

      {/* Center Container */}
      <div className="w-full max-w-md mx-auto my-6 sm:my-8 relative z-10">
        
        {/* Shield Icon Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-cyan-500/10 mb-2">
            <img src="/logo.png" alt="SocialSync AI" className="w-full h-full object-contain rounded-xl" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            Administrator Gateway
          </h1>
          <p className="text-xs text-[#475569] dark:text-slate-400 max-w-xs mx-auto">
            SocialSync AI Platform Governance & User Administration
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-slate-100">
          
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">Sign in to Admin Panel</h2>
            <p className="text-xs text-[#475569] dark:text-slate-400 mt-1">
              Enter your verified administrator credentials.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#0F172A] dark:text-slate-300">Admin Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter administrator email"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-sm focus:outline-hidden focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#0F172A] dark:text-slate-300">Admin Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white text-sm focus:outline-hidden focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20"
                isLoading={loading}
                icon={ArrowRight}
              >
                Authenticate Administrator
              </Button>
            </div>
          </form>

        </div>
      </div>

      <div className="text-center py-2 text-xs text-[#475569] dark:text-slate-500">
        SocialSync AI Security Subsystem • TLS 1.3 End-to-End
      </div>
    </div>
  );
}
export default AdminLoginPage;
