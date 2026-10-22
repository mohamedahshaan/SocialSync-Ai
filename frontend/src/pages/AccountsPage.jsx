import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PlatformCard } from '../components/common/PlatformCard';
import { ConfirmDialog } from '../components/common/Modal';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { LoadingState } from '../components/common/ProtectedRoute';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export function AccountsPage() {
  const { user } = useAuth();
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
    { key: 'FACEBOOK', name: 'Facebook', supportsMultiple: true },
    { key: 'INSTAGRAM', name: 'Instagram', supportsMultiple: false },
    { key: 'LINKEDIN', name: 'LinkedIn', supportsMultiple: false },
    { key: 'THREADS', name: 'Threads', supportsMultiple: false },
    { key: 'YOUTUBE', name: 'YouTube', supportsMultiple: false },
    { key: 'TIKTOK', name: 'TikTok', supportsMultiple: false }
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
      addToast(`Authorization error: ${oauthError}`, 'error');
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
        addToast(err.message || 'Failed to connect channel', 'error');
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
    <div className="animate-fade-in">
      {/* Social Accounts Grid: 3 per row on Desktop, 2 on Tablet, 1 on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
        {platforms.map((p) => {
          const platformAccounts = accounts.filter((a) => a.platform === p.key);
          const readiness = platformStatus[p.key];

          return (
            <PlatformCard
              key={p.key}
              platformKey={p.key}
              platformName={p.name}
              accounts={platformAccounts}
              readiness={readiness}
              supportsMultiple={p.supportsMultiple}
              onConnect={handleConnect}
              onDisconnect={(acc) => setDisconnectingAccount(acc)}
              isDisconnecting={isDisconnecting}
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
        <div className="space-y-4 text-xs text-[#475569] dark:text-[#CBD5E1]">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-amber-900 dark:text-amber-300">
            <p className="font-semibold mb-1">Official API Rule Compliance:</p>
            <p>
              In accordance with official platform security policies, SocialSync AI does not simulate fake logins or scrape credentials.
              Platform developer credentials must be set in your backend <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.env</code> file.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm mb-2">Required Configuration Steps:</h4>
            <ol className="list-decimal pl-4 space-y-1.5 text-[#475569] dark:text-[#CBD5E1]">
              <li>
                {configModalPlatform === 'YOUTUBE'
                  ? 'Create a project in the Google Cloud Console and enable the YouTube Data API v3.'
                  : `Register a developer app on the official ${configModalPlatform} developer portal.`}
              </li>
              <li>
                Set the Callback Redirect URI to:
                <div className="mt-1 font-mono text-[11px] bg-slate-100 dark:bg-[#1E293B] p-2 rounded border border-slate-200 dark:border-[#334155] text-slate-800 dark:text-[#CBD5E1] break-all select-all">
                  http://localhost:5002/api/oauth/{configModalPlatform?.toLowerCase()}/callback
                </div>
              </li>
              <li>
                Add your Client ID and Client Secret to <code className="font-mono bg-slate-100 dark:bg-[#1E293B] px-1 rounded">backend/.env</code>:
                <div className="mt-1 font-mono text-[11px] bg-slate-900 text-cyan-300 p-2.5 rounded border border-slate-800">
                  {configModalPlatform === 'YOUTUBE' ? (
                    <>
                      GOOGLE_CLIENT_ID=your_google_client_id<br />
                      GOOGLE_CLIENT_SECRET=your_google_client_secret
                    </>
                  ) : (
                    <>
                      {configModalPlatform}_CLIENT_ID=your_app_id<br />
                      {configModalPlatform}_CLIENT_SECRET=your_app_secret
                    </>
                  )}
                </div>
              </li>
              <li>Restart your backend server to apply the changes.</li>
            </ol>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex justify-end">
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
          <div className="p-3 bg-cyan-50 dark:bg-[#1E293B] border border-cyan-200 dark:border-[#334155] rounded-xl text-xs text-cyan-900 dark:text-cyan-200">
            <p className="font-semibold">Facebook Account: {pageSelectionData?.userName || 'Authorized User'}</p>
            <p className="text-cyan-700 dark:text-cyan-300 mt-0.5">
              Your Facebook account manages multiple pages. Choose which page you want to link to SocialSync AI:
            </p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {pageSelectionData?.pages?.map((p) => (
              <label
                key={p.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedPageId === p.id
                    ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40 ring-1 ring-cyan-500/30'
                    : 'border-[#E2E8F0] dark:border-[#334155] hover:border-cyan-400 bg-white dark:bg-[#1E293B]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="radio"
                    name="facebookPage"
                    value={p.id}
                    checked={selectedPageId === p.id}
                    onChange={() => setSelectedPageId(p.id)}
                    className="text-cyan-600 focus:ring-cyan-500 shrink-0"
                  />
                  {p.pictureUrl ? (
                    <img
                      src={p.pictureUrl}
                      alt={p.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {p.name?.[0]?.toUpperCase() || 'P'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">{p.name}</h4>
                    <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium truncate block">{p.category}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-[#0B1120] text-slate-600 dark:text-[#CBD5E1] px-2 py-0.5 rounded">
                  ID: {p.id}
                </span>
              </label>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-end gap-2">
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
