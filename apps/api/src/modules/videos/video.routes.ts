import { Router } from 'express';
import {
  listVideos,
  getVideoById,
  createVideo,
  generateAIContent,
  approveVideo,
  rejectVideo,
  processVideo,
  deleteVideo
} from './video.controller.js';

const router = Router();

router.get('/', listVideos);
router.post('/', createVideo);
router.get('/:id', getVideoById);
router.post('/:id/generate-content', generateAIContent);
router.post('/:id/approve', approveVideo);
router.post('/:id/reject', rejectVideo);
router.post('/:id/process', processVideo);
router.delete('/:id', deleteVideo);

export { router as videoRoutes };
