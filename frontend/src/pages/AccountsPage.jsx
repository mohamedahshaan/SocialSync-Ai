import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PlatformCard } from '../components/common/PlatformCard';
import { ConfirmDialog } from '../components/common/Modal';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { LoadingState } from '../components/common/ProtectedRoute';
import { AlertCircle, KeyRound, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '../components/common/Button';

export function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [platformStatus, setPlatformStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [disconnectingAccount, setDisconnectingAccount] = useState(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [configModalPlatform, setConfigModalPlatform] = useState(null);
  const [pageSelectionData, setPageSelectionData] = useState(null);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [connectingPage, setConnectingPage] = useState(false);

  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const platforms = [
    { key: 'FACEBOOK', name: 'Facebook' },
    { key: 'INSTAGRAM', name: 'Instagram' },
    { key: 'LINKEDIN', name: 'LinkedIn' },
    { key: 'X', name: 'X (Twitter)' },
    { key: 'THREADS', name: 'Threads' },
    { key: 'TIKTOK', name: 'TikTok' }
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, statusRes] = await Promise.all([
        api.get('/social-accounts'),
        api.get('/social-accounts/status')
      ]);

      if (accountsRes.success) setAccounts(accountsRes.data);
      if (statusRes.success) setPlatformStatus(statusRes.data);
    } catch (err) {
      addToast(err.message || 'Failed to load accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check for callback query params from OAuth redirects
    const params = new URLSearchParams(location.search);
    const connectedPlatform = params.get('connected');
    const oauthError = params.get('error');
    const selectPage = params.get('select_page');
    const selectionToken = params.get('selection_token');

    if (selectPage === 'true' && selectionToken) {
      api.get(`/oauth/facebook/pages?selection_token=${encodeURIComponent(selectionToken)}`)
        .then((res) => {
          if (res.success && res.data?.pages?.length > 0) {
            setPageSelectionData({
              token: selectionToken,
              userName: res.data.facebookUserName,
              pages: res.data.pages
            });
            setSelectedPageId(res.data.pages[0].id);
          }
        })
        .catch((err) => {
          addToast(err.message || 'Page selection session expired', 'error');
        })
        .finally(() => {
          navigate('/accounts', { replace: true });
        });
    } else if (connectedPlatform) {
      addToast(`Successfully connected ${connectedPlatform} account!`, 'success');
      navigate('/accounts', { replace: true });
    } else if (oauthError) {
      addToast(`OAuth authorization error: ${oauthError}`, 'error');
      navigate('/accounts', { replace: true });
    }
  }, [location.search]);

  const handleConfirmPageSelection = async () => {
    if (!pageSelectionData?.token || !selectedPageId) return;

    try {
      setConnectingPage(true);
      const res = await api.post('/oauth/facebook/select-page', {
        selectionToken: pageSelectionData.token,
        selectedPageId
      });

      if (res.success) {
        addToast(res.message || 'Facebook Page connected successfully!', 'success');
        setPageSelectionData(null);
        await loadData();
      }
    } catch (err) {
      addToast(err.message || 'Failed to connect selected page', 'error');
    } finally {
      setConnectingPage(false);
    }
  };

  const handleConnect = async (platformKey, isConfigured) => {
    if (!isConfigured) {
      // Show developer application configuration requirements modal
      setConfigModalPlatform(platformKey);
      return;
    }

    try {
      // Initiate official OAuth redirect
      const res = await api.get(`/oauth/${platformKey.toLowerCase()}?json=true`);
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      if (err.error === 'CONFIGURATION_REQUIRED') {
        setConfigModalPlatform(platformKey);
      } else {
        addToast(err.message || 'Failed to start OAuth flow', 'error');
      }
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnectingAccount) return;

    try {
      setIsDisconnecting(true);
      const res = await api.delete(`/social-accounts/${disconnectingAccount.id}`);
      if (res.success) {
        addToast(`${disconnectingAccount.platform} account disconnected`, 'info');
        setAccounts((prev) => prev.filter((a) => a.id !== disconnectingAccount.id));
      }
    } catch (err) {
      addToast(err.message || 'Failed to disconnect account', 'error');
    } finally {
      setIsDisconnecting(false);
      setDisconnectingAccount(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your social accounts and platform statuses..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Social Accounts</h2>
        <p className="text-xs text-slate-500 mt-1">
          Connect your official accounts via OAuth 2.0. SocialFlow AI never asks for or stores your passwords.
        </p>
      </div>

      {/* Security Guarantee Notice */}
      <div className="bg-brand-50/70 border border-brand-200/80 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-brand-100 text-brand-600 rounded-xl shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-brand-900 uppercase tracking-wide">
            Enterprise OAuth Security
          </h4>
          <p className="text-xs text-brand-800/90 mt-0.5 leading-relaxed">
            All authorizations use official platform OAuth redirects with CSRF-safe state encryption.
            OAuth tokens are securely stored in the backend and are never exposed to browser client code.
          </p>
        </div>
      </div>

      {/* Grid of Platforms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {platforms.map((p) => {
          const account = accounts.find((a) => a.platform === p.key);
          const readiness = platformStatus[p.key];

          return (
            <PlatformCard
              key={p.key}
              platformKey={p.key}
              platformName={p.name}
              account={account}
              readiness={readiness}
              onConnect={handleConnect}
              onDisconnect={(acc) => setDisconnectingAccount(acc)}
            />
          );
        })}
      </div>

      {/* Disconnect Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(disconnectingAccount)}
        onClose={() => setDisconnectingAccount(null)}
        onConfirm={confirmDisconnect}
        title="Disconnect Social Account"
        message={`Are you sure you want to disconnect ${disconnectingAccount?.accountName} (${disconnectingAccount?.platform})? You will not be able to publish to this channel until reconnected.`}
        confirmText="Disconnect"
        isDestructive={true}
        isLoading={isDisconnecting}
      />

      {/* Developer Configuration Modal */}
      <Modal
        isOpen={Boolean(configModalPlatform)}
        onClose={() => setConfigModalPlatform(null)}
        title={`${configModalPlatform} — Developer Configuration Required`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            <p className="font-semibold mb-1">Official API Rule Compliance:</p>
            <p>
              In accordance with official platform security policies, SocialFlow AI does not simulate fake logins or scrape credentials.
              Real OAuth credentials must be set in your backend <code className="font-mono bg-amber-100 px-1 rounded">.env</code> file.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-2">Required Configuration Steps:</h4>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-700">
              <li>Register a developer app on the official platform developer portal.</li>
              <li>
                Set the OAuth Redirect URI to:
                <div className="mt-1 font-mono text-[11px] bg-slate-100 p-2 rounded border text-slate-800 break-all select-all">
                  http://localhost:5001/api/oauth/{configModalPlatform?.toLowerCase()}/callback
                </div>
              </li>
              <li>
                Add your Client ID and Client Secret to <code className="font-mono bg-slate-100 px-1 rounded">backend/.env</code>:
                <div className="mt-1 font-mono text-[11px] bg-slate-900 text-brand-300 p-2.5 rounded border border-slate-800">
                  {configModalPlatform}_CLIENT_ID=your_app_id<br />
                  {configModalPlatform}_CLIENT_SECRET=your_app_secret
                </div>
              </li>
              <li>Restart your backend server to apply the changes.</li>
            </ol>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button variant="secondary" onClick={() => setConfigModalPlatform(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Facebook Page Selection Modal */}
      <Modal
        isOpen={Boolean(pageSelectionData)}
        onClose={() => setPageSelectionData(null)}
        title="Select Facebook Page to Connect"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900">
            <p className="font-semibold">Facebook Account: {pageSelectionData?.userName || 'Authorized User'}</p>
            <p className="text-brand-700 mt-0.5">
              Your Facebook account manages multiple pages. Choose which page you want to link to SocialFlow AI:
            </p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {pageSelectionData?.pages?.map((p) => (
              <label
                key={p.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedPageId === p.id
                    ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="facebookPage"
                    value={p.id}
                    checked={selectedPageId === p.id}
                    onChange={() => setSelectedPageId(p.id)}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                    <span className="text-[11px] text-slate-400 font-medium">{p.category}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  ID: {p.id}
                </span>
              </label>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setPageSelectionData(null)}
              disabled={connectingPage}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmPageSelection}
              isLoading={connectingPage}
              disabled={!selectedPageId}
            >
              Connect Page
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
