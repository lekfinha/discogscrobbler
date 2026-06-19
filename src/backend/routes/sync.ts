import { Router, Request, Response } from 'express';
import { ScrobbleHistorySyncService } from '../services/scrobbleHistorySyncService';
import { ScrobbleHistoryStorage } from '../services/scrobbleHistoryStorage';
import { jobStatusService } from '../services/jobStatusService';
import { createLogger } from '../utils/logger';

const logger = createLogger('SyncRouter');

export default function createSyncRouter(
  syncService: ScrobbleHistorySyncService,
  historyStorage: ScrobbleHistoryStorage
): Router {
  const router = Router();

  /**
   * GET /api/v1/sync/status
   * Get scrobble history sync status
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const syncStatus = syncService.getSyncStatus();
      const storageStats = await historyStorage.getStorageStats();

      res.json({
        success: true,
        data: {
          sync: syncStatus,
          storage: storageStats,
        },
      });
    } catch (error) {
      logger.error('Error getting history status', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/sync/start
   * Start a full or incremental scrobble history sync
   */
  router.post('/start', async (req: Request, res: Response) => {
    try {
      const { incremental } = req.body;

      // Start sync in background
      if (incremental) {
        const jobId = jobStatusService.startJob(
          'sync',
          'Running incremental history sync...'
        );
        syncService
          .startIncrementalSync()
          .then(() =>
            jobStatusService.completeJob(
              jobId,
              'Incremental history sync complete'
            )
          )
          .catch(error => {
            logger.error('Background incremental sync failed', error);
            jobStatusService.failJob(jobId, 'Incremental history sync failed');
          });
      } else {
        const jobId = jobStatusService.startJob(
          'sync',
          'Running full history sync...'
        );
        syncService
          .startFullSync()
          .then(() =>
            jobStatusService.completeJob(jobId, 'Full history sync complete')
          )
          .catch(error => {
            logger.error('Background full sync failed', error);
            jobStatusService.failJob(jobId, 'Full history sync failed');
          });
      }

      res.json({
        success: true,
        data: {
          message: incremental
            ? 'Incremental sync started'
            : 'Full sync started',
          status: syncService.getSyncStatus(),
        },
      });
    } catch (error) {
      logger.error('Error starting sync', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/sync/pause
   * Pause an ongoing sync
   */
  router.post('/pause', (req: Request, res: Response) => {
    try {
      syncService.pauseSync();

      res.json({
        success: true,
        data: {
          message: 'Sync paused',
          status: syncService.getSyncStatus(),
        },
      });
    } catch (error) {
      logger.error('Error pausing sync', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/sync/resume
   * Resume a paused sync
   */
  router.post('/resume', async (req: Request, res: Response) => {
    try {
      const jobId = jobStatusService.startJob(
        'sync',
        'Resuming history sync...'
      );
      syncService
        .resumeSync()
        .then(() =>
          jobStatusService.completeJob(
            jobId,
            'History sync resumed and complete'
          )
        )
        .catch(error => {
          logger.error('Background resume failed', error);
          jobStatusService.failJob(jobId, 'History sync resume failed');
        });

      res.json({
        success: true,
        data: {
          message: 'Sync resumed',
          status: syncService.getSyncStatus(),
        },
      });
    } catch (error) {
      logger.error('Error resuming sync', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
