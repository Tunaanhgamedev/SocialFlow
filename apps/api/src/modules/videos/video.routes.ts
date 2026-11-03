import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../../config/index.js';
import {
  listVideos,
  getVideoById,
  uploadVideos,
  streamVideo,
  getThumbnail,
  createVideo,
  generateAIContent,
  approveVideo,
  rejectVideo,
  processVideo,
  deleteVideo
} from './video.controller.js';

const tempUploadDir = config.storage.tempDir;
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `upload_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.mp4', '.mov', '.webm', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận các tệp định dạng video: MP4, MOV, WebM, MKV'));
    }
  }
});

const router: Router = Router();

router.get('/', listVideos);
router.post('/', createVideo);
router.post('/upload', upload.array('videos', 10), uploadVideos);
router.get('/:id', getVideoById);
router.get('/:id/stream', streamVideo);
router.get('/:id/thumbnail', getThumbnail);
router.post('/:id/generate-content', generateAIContent);
router.post('/:id/approve', approveVideo);
router.post('/:id/reject', rejectVideo);
router.post('/:id/process', processVideo);
router.delete('/:id', deleteVideo);

export { router as videoRoutes };
