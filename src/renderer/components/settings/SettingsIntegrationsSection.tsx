import { Bot, Disc3, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import ApiService from '../../services/api';
import { Button } from '../ui/Button';

interface SettingsIntegrationsSectionProps {
  api: ApiService;
}

const SettingsIntegrationsSection: React.FC<SettingsIntegrationsSectionProps> = ({
  api,
}) => {
  type HistorySyncStatusType = Awaited<ReturnType<ApiService['getHistorySyncStatus']>>;
  const [syncData, setSyncData] = useState<HistorySyncStatusType | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    loadSyncData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSyncData = async () => {
    try {
      const data = await api.getHistorySyncStatus();
      setSyncData(data);
    } catch (error) {
      console.error('Failed to load sync settings:', error);
    }
  };

  const handleStartSync = async (incremental: boolean) => {
    setSyncLoading(true);
    setSyncError(null);
    try {
      await api.startHistorySync(incremental);
      await loadSyncData();
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'Failed to start sync'
      );
    } finally {
      setSyncLoading(false);
    }
  };

  const handleClearIndex = async () => {
    if (
      window.confirm(
        'Are you sure you want to clear your local scrobble history? This will not delete scrobbles from Last.fm, but you will need to re-sync them.'
      )
    ) {
      setSyncLoading(true);
      try {
        await api.clearHistoryIndex();
        await loadSyncData();
      } catch (error) {
        setSyncError(
          error instanceof Error ? error.message : 'Failed to clear index'
        );
      } finally {
        setSyncLoading(false);
      }
    }
  };

  return (
    <div className='settings-integrations'>
      <div className='settings-section-card'>
        <div className='settings-section-header'>
          <span className='settings-section-icon'>
            <RefreshCw size={18} aria-hidden='true' />
          </span>
          <div>
            <h3>Last.fm Scrobble Index</h3>
            <p className='settings-section-description'>
              Manage your locally synced scrobble history
            </p>
          </div>
        </div>

        {syncData ? (
          <div className='settings-section-content'>
            {syncError && <div className='error-message'>{syncError}</div>}

            <div className='settings-sync-stats'>
              <div className='stat-item'>
                <span className='stat-label'>Total Scrobbles:</span>
                <span className='stat-value'>
                  {syncData.storage.totalScrobbles.toLocaleString()}
                </span>
              </div>
              <div className='stat-item'>
                <span className='stat-label'>Database Size:</span>
                <span className='stat-value'>
                  {(syncData.storage.estimatedSizeBytes / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <div className='stat-item'>
                <span className='stat-label'>Last Sync:</span>
                <span className='stat-value'>
                  {syncData.sync.lastSyncTimestamp
                    ? new Date(syncData.sync.lastSyncTimestamp).toLocaleString()
                    : 'Never'}
                </span>
              </div>
              <div className='stat-item'>
                <span className='stat-label'>Status:</span>
                <span
                  className={`stat-value status-${syncData.sync.status}`}
                >
                  {syncData.sync.status}
                </span>
              </div>
            </div>

            <div className='settings-ai-controls'>
              <div className='settings-button-group'>
                <Button
                  onClick={() => handleStartSync(true)}
                  disabled={
                    syncLoading || syncData.sync.status === 'syncing'
                  }
                >
                  Sync New
                </Button>
                <Button
                  variant='secondary'
                  onClick={() => handleStartSync(false)}
                  disabled={
                    syncLoading || syncData.sync.status === 'syncing'
                  }
                >
                  Full Re-sync
                </Button>
                <Button
                  variant='danger'
                  onClick={handleClearIndex}
                  disabled={
                    syncLoading ||
                    syncData.sync.status === 'syncing' ||
                    !syncData.storage.totalScrobbles
                  }
                >
                  Clear Index
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className='settings-empty-state'>
            <p>Please authenticate with Last.fm to sync your scrobble history.</p>
          </div>
        )}
      </div>

      <div className='settings-section-card'>
        <div className='settings-section-header'>
          <span className='settings-section-icon'>
            <Disc3 size={18} aria-hidden='true' />
          </span>
          <div>
            <h3>Discogs Collection Cache</h3>
            <p className='settings-section-description'>
              Your collection is cached locally for fast access
            </p>
          </div>
        </div>

        <div className='settings-section-content'>
          <div className='settings-cache-info'>
            <p className='settings-hint-text'>
              Collection cache information is shown on the Collection page.
              Visit the Collection page to see cache status and manually refresh
              if needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsIntegrationsSection;
