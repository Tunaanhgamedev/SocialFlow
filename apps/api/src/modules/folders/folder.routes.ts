import { Router } from 'express';
import { watchFolder, unwatchFolder, scanFolder, getWatchersStatus } from './folder.controller.js';

const router: Router = Router();

router.post('/watch', watchFolder);
router.post('/unwatch', unwatchFolder);
router.post('/scan', scanFolder);
router.get('/status', getWatchersStatus);

export { router as folderRoutes };
