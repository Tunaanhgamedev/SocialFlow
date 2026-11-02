import { Router } from 'express';
import {
  schedulePublishing,
  listPublishingJobs,
  confirmManualPublish,
  cancelPublishingJob,
  retryPublishingJob
} from './publishing.controller.js';

const router = Router();

router.post('/schedule', schedulePublishing);
router.get('/jobs', listPublishingJobs);
router.post('/jobs/:id/confirm', confirmManualPublish);
router.post('/jobs/:id/cancel', cancelPublishingJob);
router.post('/jobs/:id/retry', retryPublishingJob);

export { router as publishingRoutes };
