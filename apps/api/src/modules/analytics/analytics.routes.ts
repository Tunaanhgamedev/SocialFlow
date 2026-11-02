import { Router } from 'express';
import { getOverviewStats } from './analytics.controller.js';

const router = Router();

router.get('/overview', getOverviewStats);

export { router as analyticsRoutes };
