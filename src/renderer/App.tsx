import React, { useCallback, useState, useEffect } from 'react';

import { AuthStatus } from '../shared/types';

import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import MainContent from './components/MainContent';
import Sidebar from './components/Sidebar';
import SyncStatusBar from './components/SyncStatusBar';
import ToastContainer from './components/ToastContainer';
import { AppProvider, getBaseUrl } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { useJobPoller } from './hooks/useJobPoller';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { DEFAULT_ROUTE, ROUTE_REDIRECTS, ROUTES, navigate } from './routes';
import OnboardingFlow from './components/OnboardingFlow';
import AppSetupFlow from './components/AppSetupFlow';
import { getApiService } from './services/api';

const JobPollerSetup: React.FC = () => {
  useJobPoller();
  return null;
};

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>(DEFAULT_ROUTE);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    setupComplete: true, // assume true until loaded
    discogs: { authenticated: false },
    lastfm: { authenticated: false },
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  const [helpOpen, setHelpOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  const handleFocusSearch = useCallback(() => {
    const searchInput = document.querySelector<HTMLInputElement>(
      'input[type="search"], input[placeholder*="earch"], input.search-input'
    );
    searchInput?.focus();
  }, []);

  const handleSync = useCallback(() => {
    navigate(ROUTES.SCROBBLE);
  }, []);

  const handleNewScrobble = useCallback(() => {
    navigate(ROUTES.SCROBBLE);
  }, []);

  const handleToggleHelp = useCallback(() => {
    setHelpOpen(prev => !prev);
  }, []);

  const handleCloseHelp = useCallback(() => {
    setHelpOpen(false);
  }, []);

  useKeyboardShortcuts({
    onFocusSearch: handleFocusSearch,
    onSync: handleSync,
    onNewScrobble: handleNewScrobble,
    onToggleHelp: handleToggleHelp,
    onCloseHelp: handleCloseHelp,
  });

  const handleSidebarCollapsedChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const serverUrl = localStorage.getItem('serverUrl') || getBaseUrl();
        const api = getApiService(serverUrl);
        const status = await api.getAuthStatus();
        setAuthStatus(status);
        
        let hasSynced = false;
        try {
          const syncStatus = await api.getHistorySyncStatus();
          hasSynced = syncStatus.storage.totalScrobbles > 0 || syncStatus.sync.status === 'completed';
        } catch {
          // ignore
        }
        
        if (status.discogs.authenticated && status.lastfm.authenticated && hasSynced) {
          setIsOnboardingComplete(true);
        }
      } catch {
        // ignore
      } finally {
        setIsInitializing(false);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    // Handle hash-based routing
    const handleHashChange = () => {
      const fullHash = window.location.hash.replace('#', '') || DEFAULT_ROUTE;
      // Extract page name before any query params (e.g., 'marketplace?tab=sellers' -> 'marketplace')
      const hash = fullHash.split('?')[0];
      const queryPart = fullHash.includes('?') ? fullHash.split('?')[1] : '';

      // Redirect legacy routes to consolidated pages
      const redirect = ROUTE_REDIRECTS[hash];
      if (redirect) {
        // Preserve any extra query params from the original URL
        const redirectBase = redirect.split('?')[0];
        const redirectParams = redirect.includes('?')
          ? redirect.split('?')[1]
          : '';
        const merged = new URLSearchParams(redirectParams);
        if (queryPart) {
          const original = new URLSearchParams(queryPart);
          original.forEach((value, key) => {
            if (!merged.has(key)) merged.set(key, value);
          });
        }
        const newHash = merged.toString()
          ? `${redirectBase}?${merged.toString()}`
          : redirectBase;
        navigate(newHash);
        return;
      }

      setCurrentPage(hash);
    };

    // Set initial page based on hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

        return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <ThemeProvider>
      <AppProvider>
        <AuthProvider value={{ authStatus, setAuthStatus }}>
          <ToastProvider>
            <JobPollerSetup />
            <div className='app'>
              {isInitializing ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', background: 'var(--bg-color, #0f172a)' }}>
                  <div className="sync-spinner" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#38bdf8' }} />
                </div>
              ) : !authStatus.setupComplete ? (
                <AppSetupFlow onComplete={() => setAuthStatus(prev => ({ ...prev, setupComplete: true }))} />
              ) : !isOnboardingComplete ? (
                <OnboardingFlow onComplete={() => setIsOnboardingComplete(true)} />
              ) : (
                <>
                  <SyncStatusBar globalBar />
                  <Header />
                  <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                    <Sidebar
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      collapsed={sidebarCollapsed}
                      onCollapsedChange={handleSidebarCollapsedChange}
                    />
                    <div className='content'>
                      <ErrorBoundary>
                        <div key={currentPage} className='page-enter'>
                          <MainContent currentPage={currentPage} />
                        </div>
                      </ErrorBoundary>
                    </div>
                  </div>
                  <ToastContainer />
                  <KeyboardShortcutsHelp
                    isOpen={helpOpen}
                    onClose={handleCloseHelp}
                  />
                </>
              )}
            </div>
          </ToastProvider>
        </AuthProvider>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
