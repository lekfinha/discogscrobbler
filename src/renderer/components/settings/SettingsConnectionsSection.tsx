import React, { useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/api';
import { createLogger } from '../../utils/logger';
import { Button } from '../ui/Button';

const log = createLogger('SettingsConnectionsSection');

interface SettingsConnectionsSectionProps {
  api: ApiService;
}

const SettingsConnectionsSection: React.FC<SettingsConnectionsSectionProps> = ({
  api,
}) => {
  const { authStatus, setAuthStatus } = useAuth();
  const [loading, setLoading] = useState<string>('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Manual entry states
  const [discogsUsername, setDiscogsUsername] = useState('');
  const [lastfmToken, setLastfmToken] = useState('');

  const handleDiscogsUsernameSubmit = async () => {
    if (!discogsUsername) {
      setMessage({ type: 'error', text: 'Please enter your Discogs username' });
      return;
    }

    setLoading('discogs');
    setMessage(null);

    try {
      await api.setDiscogsUsername(discogsUsername);

      const newStatus = await api.getAuthStatus();
      setAuthStatus(newStatus);

      setMessage({
        type: 'success',
        text: `Successfully connected to Discogs as ${newStatus.discogs.username}`,
      });
      setDiscogsUsername('');
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Failed to verify or save Discogs username',
      });
    } finally {
      setLoading('');
    }
  };

  const handleLastfmAuth = async () => {
    setLoading('lastfm');
    setMessage(null);

    try {
      // Get auth URL (using environment variable)
      const authUrl = await api.getLastfmAuthUrl();
      log.debug('Last.fm auth URL obtained');

      // Open auth URL in a new window
      const authWindow = window.open(
        authUrl,
        'lastfm-auth',
        'width=600,height=600'
      );
      log.debug('Last.fm auth window opened', { success: !!authWindow });

      // Poll for authentication success
      const checkAuth = setInterval(async () => {
        try {
          if (authWindow?.closed) {
            clearInterval(checkAuth);
            // Wait a moment for the callback to complete, then retry multiple times
            let retryCount = 0;
            const maxRetries = 5;

            const checkStatus = async () => {
              try {
                log.debug(
                  `Checking Last.fm auth status (attempt ${retryCount + 1})`
                );
                const newStatus = await api.getAuthStatus();
                log.debug('Last.fm auth status checked', {
                  authenticated: newStatus.lastfm.authenticated,
                });

                if (newStatus.lastfm.authenticated) {
                  setAuthStatus(newStatus);
                  setMessage({
                    type: 'success',
                    text: `Successfully connected to Last.fm as ${newStatus.lastfm.username}`,
                  });
                  setLoading('');
                } else if (retryCount < maxRetries - 1) {
                  retryCount++;
                  setTimeout(checkStatus, 2000); // Wait 2 seconds before retry
                } else {
                  setMessage({
                    type: 'error',
                    text: 'Last.fm authentication was cancelled or failed',
                  });
                  setLoading('');
                }
              } catch {
                if (retryCount < maxRetries - 1) {
                  retryCount++;
                  setTimeout(checkStatus, 2000);
                } else {
                  log.error(
                    'Failed to check Last.fm auth status after retries'
                  );
                  setMessage({
                    type: 'error',
                    text: 'Failed to check Last.fm authentication status',
                  });
                  setLoading('');
                }
              }
            };

            setTimeout(checkStatus, 1000);
          }
        } catch {
          clearInterval(checkAuth);
          log.error('Error during Last.fm auth polling');
          setMessage({
            type: 'error',
            text: 'Failed to check Last.fm authentication status',
          });
          setLoading('');
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkAuth);
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
        if (loading === 'lastfm') {
          setMessage({
            type: 'error',
            text: 'Last.fm authentication timed out',
          });
          setLoading('');
        }
      }, 300000);
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Failed to start Last.fm authentication',
      });
      setLoading('');
    }
  };

  const handleLastfmManualAuth = async () => {
    if (!lastfmToken) {
      setMessage({ type: 'error', text: 'Please enter the Last.fm token' });
      return;
    }

    setLoading('lastfm-manual');
    setMessage(null);

    try {
      const result = await api.handleLastfmCallback(lastfmToken);

      // Update auth status
      const newStatus = await api.getAuthStatus();
      setAuthStatus(newStatus);

      setMessage({
        type: 'success',
        text: `Successfully connected to Last.fm as ${result.username}`,
      });
      setLastfmToken('');
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Failed to complete Last.fm authentication',
      });
    } finally {
      setLoading('');
    }
  };

  const handleClearAuth = async () => {
    setLoading('clear');
    setMessage(null);

    try {
      await api.clearAuth();

      // Update auth status
      const newStatus = await api.getAuthStatus();
      setAuthStatus(newStatus);

      setMessage({ type: 'success', text: 'All authentication data cleared' });
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Failed to clear authentication',
      });
    } finally {
      setLoading('');
    }
  };

  return (
    <div>
      {/* Introduction */}
      <div className='card'>
        <h3>Account Connections</h3>
        <p>
          Connect your Discogs and Last.fm accounts to enable scrobbling and
          collection management.
        </p>

        {message && (
          <div
            className={
              message.type === 'success' ? 'success-message' : 'error-message'
            }
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Discogs Setup */}
      <div className='card'>
        <h3>Discogs</h3>
        <div className='status-margin-bottom'>
          <div
            className={`status ${authStatus.discogs.authenticated ? 'connected' : 'disconnected'}`}
          >
            <span className='status-dot'></span>
            {authStatus.discogs.authenticated
              ? `Connected as ${authStatus.discogs.username}`
              : 'Not connected'}
          </div>
        </div>

        <p>Enter your Discogs username to access your public collection.</p>

        <div className='form-group' style={{ maxWidth: '400px' }}>
          <label className='form-label'>Discogs Username:</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type='text'
              className='form-input'
              value={discogsUsername}
              onChange={e => setDiscogsUsername(e.target.value)}
              placeholder='your_username'
              style={{ flex: 1 }}
            />
            <Button
              onClick={handleDiscogsUsernameSubmit}
              disabled={loading === 'discogs' || !discogsUsername}
            >
              {loading === 'discogs' ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Last.fm Setup */}
      <div className='card'>
        <h3>Last.fm</h3>
        <div className='status-margin-bottom'>
          <div
            className={`status ${authStatus.lastfm.authenticated ? 'connected' : 'disconnected'}`}
          >
            <span className='status-dot'></span>
            {authStatus.lastfm.authenticated
              ? `Connected as ${authStatus.lastfm.username}`
              : 'Not connected'}
          </div>
        </div>

        <p>
          Connect to your Last.fm account. Your API credentials are already
          configured.
        </p>

        <Button
          onClick={handleLastfmAuth}
          disabled={loading === 'lastfm' || authStatus.lastfm.authenticated}
        >
          {loading === 'lastfm' ? 'Connecting...' : 'Connect to Last.fm'}
        </Button>

        {/* Manual Token Entry */}
        <div className='alternative-method-section'>
          <h4>Manual Token Entry:</h4>
          <p>
            If the automatic flow doesn't work, get the authorization URL above,
            visit it, and paste the token from the URL here:
          </p>

          <div className='form-group'>
            <label className='form-label'>
              Token (from URL after authorization):
            </label>
            <input
              type='text'
              className='form-input'
              value={lastfmToken}
              onChange={e => setLastfmToken(e.target.value)}
              placeholder='token value from URL'
            />
          </div>

          <Button
            onClick={handleLastfmManualAuth}
            disabled={
              loading === 'lastfm-manual' ||
              authStatus.lastfm.authenticated ||
              !lastfmToken
            }
          >
            {loading === 'lastfm-manual'
              ? 'Authenticating...'
              : 'Submit Last.fm Token'}
          </Button>
        </div>
      </div>

      {/* Clear Authentication */}
      <div className='card'>
        <h3>Clear Authentication</h3>
        <p>Remove all stored authentication data and start over.</p>
        <Button
          variant='danger'
          onClick={handleClearAuth}
          disabled={loading === 'clear'}
        >
          {loading === 'clear' ? 'Clearing...' : 'Clear All Authentication'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsConnectionsSection;
