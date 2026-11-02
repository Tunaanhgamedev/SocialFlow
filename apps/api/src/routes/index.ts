import { Router } from 'express';
import { healthRoutes } from '../modules/health/health.routes.js';
import { videoRoutes } from '../modules/videos/video.routes.js';
import { sourceRoutes } from '../modules/sources/source.routes.js';
import { accountRoutes } from '../modules/accounts/account.routes.js';
import { campaignRoutes } from '../modules/campaigns/campaign.routes.js';
import { publishingRoutes } from '../modules/publishing/publishing.routes.js';
import { analyticsRoutes } from '../modules/analytics/analytics.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/videos', videoRoutes);
apiRouter.use('/sources', sourceRoutes);
apiRouter.use('/accounts', accountRoutes);
apiRouter.use('/campaigns', campaignRoutes);
apiRouter.use('/publishing', publishingRoutes);
apiRouter.use('/analytics', analyticsRoutes);

export { apiRouter };
