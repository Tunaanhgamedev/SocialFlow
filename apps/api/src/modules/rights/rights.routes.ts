import { Router } from 'express';
import { getRights, updateRights } from './rights.controller.js';

const router: Router = Router();

router.get('/:videoId', getRights);
router.post('/:videoId', updateRights);
router.patch('/:videoId', updateRights);

export { router as rightsRoutes };
