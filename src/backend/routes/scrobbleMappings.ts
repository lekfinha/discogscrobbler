import { Request, Response, Router } from 'express';

import { scrobbleMappingService } from '../services/scrobbleMappingService';
import { sendSuccess, sendError } from '../utils/apiResponse';

const router = Router();

// Get all scrobble mappings
router.get('/', (req: Request, res: Response) => {
  try {
    const mappings = scrobbleMappingService.getAllOverrides();
    sendSuccess(res, mappings);
  } catch (error) {
    sendError(
      res,
      500,
      error instanceof Error ? error.message : 'Failed to get mappings'
    );
  }
});

// Add or update a mapping
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      discogsArtist,
      discogsAlbum,
      discogsTrack,
      lastfmArtist,
      lastfmAlbum,
      lastfmTrack,
    } = req.body;

    if (!discogsArtist || !discogsAlbum || !discogsTrack) {
      return sendError(
        res,
        400,
        'Discogs artist, album, and track are required'
      );
    }

    if (!lastfmArtist || !lastfmAlbum || !lastfmTrack) {
      return sendError(
        res,
        400,
        'Last.fm artist, album, and track are required'
      );
    }

    scrobbleMappingService.setOverride({
      discogsArtist,
      discogsAlbum,
      discogsTrack,
      lastfmArtist,
      lastfmAlbum,
      lastfmTrack,
    });

    sendSuccess(res, { message: 'Mapping added successfully' });
  } catch (error) {
    sendError(
      res,
      500,
      error instanceof Error ? error.message : 'Failed to add mapping'
    );
  }
});

// Delete a mapping
router.delete('/', (req: Request, res: Response) => {
  try {
    const { artist, album, track } = req.query;

    if (!artist || !album || !track) {
      return sendError(
        res,
        400,
        'artist, album, and track query parameters are required'
      );
    }

    const removed = scrobbleMappingService.removeOverride(
      artist as string,
      album as string,
      track as string
    );

    if (removed) {
      sendSuccess(res, { message: 'Mapping removed successfully' });
    } else {
      sendError(res, 404, 'Mapping not found');
    }
  } catch (error) {
    sendError(
      res,
      500,
      error instanceof Error ? error.message : 'Failed to remove mapping'
    );
  }
});

export default router;
