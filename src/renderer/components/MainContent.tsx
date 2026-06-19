import React, { Suspense, useState, useEffect } from 'react';

import HomePage from '../pages/HomePage';
import { ROUTES } from '../routes';

// Lazy-load all pages except HomePage (default route, should load instantly)
const ArtistDetailPage = React.lazy(() => import('../pages/ArtistDetailPage'));
const CollectionPage = React.lazy(() => import('../pages/CollectionPage'));
const HistoryPage = React.lazy(() => import('../pages/HistoryPage'));
const ReleaseDetailsPage = React.lazy(
  () => import('../pages/ReleaseDetailsPage')
);
const ScrobblePage = React.lazy(() => import('../pages/ScrobblePage'));
const SettingsPage = React.lazy(() => import('../pages/SettingsPage'));
const StatsPage = React.lazy(() => import('../pages/StatsPage'));
const TrackDetailPage = React.lazy(() => import('../pages/TrackDetailPage'));
const MemoryScrobblePage = React.lazy(
  () => import('../pages/MemoryScrobblePage')
);

const PageLoadingFallback: React.FC = () => (
  <div className='page-loading-fallback'>
    <div className='spinner' />
  </div>
);

interface MainContentProps {
  currentPage: string;
}

const MainContent: React.FC<MainContentProps> = ({ currentPage }) => {
  // Track unique keys to force remount of detail pages when navigating to them
  const [releaseKey, setReleaseKey] = useState<string>('0');
  const [artistKey, setArtistKey] = useState<string>('0');
  const [trackKey, setTrackKey] = useState<string>('0');

  useEffect(() => {
    // When navigating to detail pages, generate a new key to force remount
    // Use timestamp to always get a fresh key, ensuring the page reloads
    if (currentPage === ROUTES.RELEASE_DETAILS) {
      setReleaseKey(`release-${Date.now()}`);
    } else if (currentPage === ROUTES.ARTIST_DETAIL) {
      setArtistKey(`artist-${Date.now()}`);
    } else if (currentPage === ROUTES.TRACK_DETAIL) {
      setTrackKey(`track-${Date.now()}`);
    }
  }, [currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case ROUTES.HOME:
        return <HomePage />;
      case ROUTES.COLLECTION:
        return <CollectionPage />;
      case ROUTES.SCROBBLE:
        return <ScrobblePage />;
      case ROUTES.HISTORY:
        return <HistoryPage />;
      case ROUTES.SETTINGS:
        return <SettingsPage />;
      case ROUTES.RELEASE_DETAILS:
        // Use key to force remount when a different release is selected
        return <ReleaseDetailsPage key={releaseKey} />;
                        case ROUTES.STATS:
        return <StatsPage />;
                        case ROUTES.ARTIST_DETAIL:
        return <ArtistDetailPage key={artistKey} />;
      case ROUTES.TRACK_DETAIL:
        return <TrackDetailPage key={trackKey} />;
            case ROUTES.MEMORY_SCROBBLE:
        return <MemoryScrobblePage />;
      default:
        return <HomePage />;
    }
  };

  return <Suspense fallback={<PageLoadingFallback />}>{renderPage()}</Suspense>;
};

export default MainContent;
