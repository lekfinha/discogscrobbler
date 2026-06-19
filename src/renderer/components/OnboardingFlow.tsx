import { ArrowRight, CheckCircle, Disc3, Music, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getApiService } from '../services/api';
import { createLogger } from '../utils/logger';

import './OnboardingFlow.css';

const log = createLogger('OnboardingFlow');

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { state } = useApp();
  const { authStatus, setAuthStatus } = useAuth();
  const api = getApiService(state.serverUrl);

  const [step, setStep] = useState(1);
  
  // Step 1: Discogs
  const [discogsUsername, setDiscogsUsername] = useState('');
  const [discogsLoading, setDiscogsLoading] = useState(false);
  
  // Step 2: Last.fm
  const [lastfmLoading, setLastfmLoading] = useState(false);
  const [lastfmToken, setLastfmToken] = useState('');
  
  // Step 3: Sync
  const [syncStatus, setSyncStatus] = useState<string>('idle');
  const [syncProgress, setSyncProgress] = useState<string>('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize step based on auth status
  useEffect(() => {
    if (!authStatus.discogs.authenticated) {
      setStep(1);
    } else if (!authStatus.lastfm.authenticated) {
      setStep(2);
    } else {
      setStep(3);
      checkSyncStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  const handleDiscogsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discogsUsername) return;
    
    setDiscogsLoading(true);
    setMessage(null);
    try {
      await api.setDiscogsUsername(discogsUsername);
      const newStatus = await api.getAuthStatus();
      setAuthStatus(newStatus);
      setMessage({ type: 'success', text: 'Discogs connected successfully!' });
      setStep(2);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to connect Discogs' });
    } finally {
      setDiscogsLoading(false);
    }
  };

  const handleLastfmAuth = async () => {
    setLastfmLoading(true);
    setMessage(null);
    try {
      const authUrl = await api.getLastfmAuthUrl();
      const authWindow = window.open(authUrl, 'lastfm-auth', 'width=600,height=600');
      
      const checkAuth = setInterval(async () => {
        try {
          if (authWindow?.closed) {
            clearInterval(checkAuth);
            let retryCount = 0;
            const checkStatus = async () => {
              try {
                const newStatus = await api.getAuthStatus();
                if (newStatus.lastfm.authenticated) {
                  setAuthStatus(newStatus);
                  setMessage({ type: 'success', text: 'Last.fm connected successfully!' });
                  setStep(3);
                } else if (retryCount < 5) {
                  retryCount++;
                  setTimeout(checkStatus, 2000);
                } else {
                  setMessage({ type: 'error', text: 'Authentication failed or timed out.' });
                }
              } catch {
                if (retryCount < 5) {
                  retryCount++;
                  setTimeout(checkStatus, 2000);
                }
              }
            };
            setTimeout(checkStatus, 1000);
          }
        } catch {
          clearInterval(checkAuth);
        }
      }, 1000);

      setTimeout(() => clearInterval(checkAuth), 300000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to connect Last.fm' });
    } finally {
      setLastfmLoading(false);
    }
  };

  const handleLastfmManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastfmToken) return;
    setLastfmLoading(true);
    try {
      await api.handleLastfmCallback(lastfmToken);
      const newStatus = await api.getAuthStatus();
      setAuthStatus(newStatus);
      setStep(3);
    } catch {
      setMessage({ type: 'error', text: 'Invalid token' });
    } finally {
      setLastfmLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const status = await api.getHistorySyncStatus();
      if (status.storage.totalScrobbles > 0 || status.sync.status === 'completed') {
        onComplete();
      }
    } catch (err) {
      log.error('Failed to get sync status', err);
    }
  };

  const startInitialSync = async () => {
    setSyncStatus('syncing');
    setMessage(null);
    try {
      await api.startHistorySync(false);
      const interval = setInterval(async () => {
        const status = await api.getHistorySyncStatus();
        if (status.sync.status === 'syncing') {
          setSyncProgress(`Synced ${status.sync.scrobblesFetched || 0} / ${status.sync.totalScrobbles || 0} scrobbles...`);
        } else if (status.sync.status === 'completed') {
          clearInterval(interval);
          setSyncStatus('completed');
          setTimeout(() => {
            onComplete();
          }, 1500);
        } else if (status.sync.status === 'error') {
          clearInterval(interval);
          setSyncStatus('error');
          setMessage({ type: 'error', text: status.sync.error || 'Sync failed' });
        }
      }, 2000);
    } catch (err) {
      setSyncStatus('error');
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to start sync' });
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1>Welcome to DiscogScrobbler</h1>
          <p>Let's get your music collection ready in three simple steps.</p>
        </div>

        <div className="onboarding-progress">
          <div className={`progress-dot ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`} />
          <div className={`progress-dot ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`} />
          <div className={`progress-dot ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`} />
        </div>

        <div className="onboarding-content">
          {/* Step 1: Discogs */}
          <div className={`onboarding-step ${step === 1 ? 'active' : ''}`}>
            <h2><div className="onboarding-step-icon"><Disc3 size={20} /></div> Connect Discogs</h2>
            <p>We need your Discogs username to fetch your public collection. This allows us to map your vinyl records to digital tracks.</p>
            <form onSubmit={handleDiscogsSubmit}>
              <div className="onboarding-input-group">
                <input 
                  type="text" 
                  className="onboarding-input" 
                  placeholder="Enter your Discogs username" 
                  value={discogsUsername}
                  onChange={(e) => setDiscogsUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="onboarding-actions">
                <button type="submit" className="onboarding-btn primary" disabled={discogsLoading || !discogsUsername}>
                  {discogsLoading ? 'Connecting...' : 'Connect Discogs'} <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>

          {/* Step 2: Last.fm */}
          <div className={`onboarding-step ${step === 2 ? 'active' : ''}`}>
            <h2><div className="onboarding-step-icon"><Music size={20} /></div> Connect Last.fm</h2>
            <p>Authenticate with Last.fm so we can scrobble your listening sessions and sync your history.</p>
            <div className="onboarding-actions" style={{ justifyContent: 'flex-start', marginTop: 0, marginBottom: '2rem' }}>
              <button onClick={handleLastfmAuth} type="button" className="onboarding-btn primary" disabled={lastfmLoading}>
                {lastfmLoading ? 'Waiting for Auth...' : 'Authorize via Last.fm'} <ArrowRight size={16} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>If the popup didn't work, enter the token from the URL here:</p>
            <form onSubmit={handleLastfmManualAuth}>
              <div className="onboarding-input-group" style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="onboarding-input" 
                  placeholder="Paste Last.fm token here" 
                  value={lastfmToken}
                  onChange={(e) => setLastfmToken(e.target.value)}
                />
                <button type="submit" className="onboarding-btn secondary" disabled={lastfmLoading || !lastfmToken}>
                  Submit
                </button>
              </div>
            </form>
          </div>

          {/* Step 3: Initial Sync */}
          <div className={`onboarding-step ${step === 3 ? 'active' : ''}`}>
            <h2><div className="onboarding-step-icon"><Zap size={20} /></div> Initial Sync</h2>
            <p>You're all connected! Now we need to sync your Last.fm scrobble history. This might take a few minutes depending on your history size.</p>
            
            {syncStatus === 'syncing' ? (
              <div style={{ textAlign: 'center' }}>
                <div className="sync-spinner" />
                <p style={{ color: '#38bdf8', fontWeight: 600 }}>{syncProgress || 'Initializing sync...'}</p>
              </div>
            ) : syncStatus === 'completed' ? (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
                <p style={{ color: '#10b981', fontWeight: 600 }}>Sync complete! Taking you to the dashboard...</p>
              </div>
            ) : (
              <div className="onboarding-actions">
                <button type="button" onClick={startInitialSync} className="onboarding-btn primary">
                  Start Sync <ArrowRight size={16} />
                </button>
                <button type="button" onClick={onComplete} className="onboarding-btn secondary">
                  Skip for now
                </button>
              </div>
            )}
          </div>

          {message && (
            <div className={`onboarding-status-message ${message.type}`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : null}
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
