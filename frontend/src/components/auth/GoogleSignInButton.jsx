import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Loader2 } from 'lucide-react';

export function GoogleSignInButton({
  text = 'Continue with Google',
  onRequiresLinking,
  onError,
  className = '',
  disabled = false
}) {
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Load Google Client ID from backend or Vite env
  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        const viteClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (viteClientId) {
          if (isMounted) setGoogleClientId(viteClientId);
          return;
        }
        const res = await api.get('/auth/google/config');
        if (isMounted && res.data?.clientId) {
          setGoogleClientId(res.data.clientId);
        }
      } catch (err) {
        // Fallback gracefully
        console.warn('Could not fetch Google OAuth configuration:', err.message);
      }
    }
    loadConfig();
    return () => { isMounted = false; };
  }, []);

  // Initialize Google Identity Services (GIS) script dynamically
  useEffect(() => {
    if (!googleClientId) return;

    const existingScript = document.getElementById('google-gsi-client');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [googleClientId]);

  const handleCredentialResponse = async (response) => {
    if (!response?.credential) {
      if (onError) onError('No credential received from Google.');
      return;
    }

    try {
      setLoading(true);
      const res = await loginWithGoogle(response.credential);
      if (res.requiresLinking) {
        if (onRequiresLinking) {
          onRequiresLinking({ email: res.email, idToken: response.credential });
        }
        return;
      }
      navigate('/create-post', { replace: true });
    } catch (err) {
      if (onError) onError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (disabled || loading) return;

    // 1. Try Google Identity Services (popup prompt)
    if (window.google?.accounts?.id && googleClientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        // Trigger Google One Tap / popup prompt
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback to backend OAuth redirect flow if popup is dismissed or blocked
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
            window.location.href = `${backendUrl}/api/auth/google`;
          }
        });
        return;
      } catch (gisError) {
        console.warn('GIS prompt error, falling back to redirect:', gisError.message);
      }
    }

    // 2. Direct Fallback to Backend OAuth 2.0 Authorization Code flow
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`w-full py-2.5 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#283548] text-[#0F172A] dark:text-[#F8FAFC] font-semibold text-xs flex items-center justify-center gap-3 transition-all duration-150 shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#3B5BFF]" />
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
      )}
      <span className="group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
        {loading ? 'Verifying with Google...' : text}
      </span>
    </button>
  );
}

export default GoogleSignInButton;
