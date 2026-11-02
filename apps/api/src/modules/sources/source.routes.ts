import { Router } from 'express';
import { listSources, createSource, importDouyinLink, deleteSource } from './source.controller.js';

const router = Router();

router.get('/', listSources);
router.post('/', createSource);
router.post('/douyin/import', importDouyinLink);
router.delete('/:id', deleteSource);

export { router as sourceRoutes };
