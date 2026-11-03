import { Router } from 'express';
import { listSources, createSource, importUrl, importDouyinLink, deleteSource } from './source.controller.js';

const router: Router = Router();

router.get('/', listSources);
router.post('/', createSource);
router.post('/import', importUrl);
router.post('/douyin/import', importDouyinLink);
router.delete('/:id', deleteSource);

export { router as sourceRoutes };
