import { Request, Response } from 'express';
import { prisma, VideoStatus, RightsStatus, SourceType } from '@socialflow/database';
import { VideoRepository } from './video.repository.js';
import { VideoService } from './video.service.js';
import { AIService } from '../../services/ai/AIProvider.js';
import { QueueService } from '../../services/queue/QueueService.js';
import { QueueName } from '@socialflow/shared';

const videoRepo = VideoRepository.getInstance();
const videoService = VideoService.getInstance();

export async function listVideos(req: Request, res: Response): Promise<void> {
  const { status, rightsStatus, sourceType, search, sortBy, limit = '20', page = '1' } = req.query;

  const result = await videoRepo.findMany({
    status: status as string,
    rightsStatus: rightsStatus as string,
    sourceType: sourceType as string,
    search: search as string,
    sortBy: sortBy as string,
    page: parseInt(page as string, 10) || 1,
    limit: parseInt(limit as string, 10) || 20
  });

  res.json({
    success: true,
    data: result.items,
    meta: {
      total: result.total,
      page: parseInt(page as string, 10) || 1,
      limit: parseInt(limit as string, 10) || 20
    }
  });
}

export async function getVideoById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const item = await videoRepo.findById(id);

  if (!item) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy video với ID yêu cầu' }
    });
    return;
  }

  res.json({ success: true, data: item });
}

export async function uploadVideos(req: Request, res: Response): Promise<void> {
  const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);

  if (!files || files.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Vui lòng đính kèm ít nhất một tệp video (MP4, MOV, WebM)' }
    });
    return;
  }

  const { rightsStatus = 'PENDING_REVIEW', licenseNote, authorConsent } = req.body;

  const result = await videoService.uploadVideoFiles(files, {
    rightsStatus: rightsStatus as RightsStatus,
    licenseNote,
    authorConsent: authorConsent === 'true' || authorConsent === true
  });

  res.status(201).json({
    success: true,
    data: {
      uploadedCount: result.uploaded.length,
      duplicateCount: result.duplicates.length,
      uploaded: result.uploaded,
      duplicates: result.duplicates,
      message: `Đã nạp thành công ${result.uploaded.length} video. ${
        result.duplicates.length > 0 ? `Bỏ qua ${result.duplicates.length} video trùng lặp.` : ''
      }`
    }
  });
}

export async function streamVideo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const video = await videoRepo.findById(id);

  if (!video) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy video' } });
    return;
  }

  const asset = video.assets?.find((a: any) => a.assetType === 'PROCESSED_9_16') ||
                video.assets?.find((a: any) => a.assetType === 'ORIGINAL') ||
                video.assets?.[0];
  const storageKey = asset?.storageKey || video.storageKey || asset?.filePath;

  if (!storageKey) {
    res.status(404).json({ success: false, error: { code: 'NO_ASSET', message: 'Không tìm thấy tệp video trên hệ thống' } });
    return;
  }

  await videoService.streamVideo(storageKey, req, res);
}

export async function getThumbnail(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await videoService.getThumbnail(id, res);
}

export async function createVideo(req: Request, res: Response): Promise<void> {
  const { title, description, sourceType = 'MANUAL_UPLOAD', sourceUrl, rightsStatus = 'PENDING_REVIEW' } = req.body;

  if (!title) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Tiêu đề video là bắt buộc' } });
    return;
  }

  const existingUser = await prisma.user.findFirst();
  const userId = existingUser ? existingUser.id : (await prisma.user.create({
    data: { email: 'admin@socialflow.local', name: 'Cos Dolove Admin', role: 'ADMIN' }
  })).id;

  const video = await prisma.video.create({
    data: {
      userId,
      title,
      description,
      sourceType: sourceType as SourceType,
      sourceUrl,
      status: VideoStatus.PENDING,
      rightsStatus: rightsStatus as RightsStatus,
      rights: {
        create: {
          rightsStatus: rightsStatus as RightsStatus,
          authorConsent: rightsStatus === RightsStatus.AUTHORIZED
        }
      }
    },
    include: { rights: true }
  });

  res.status(201).json({ success: true, data: video });
}

export async function generateAIContent(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { language = 'vi', tone = 'engaging', targetPlatform = 'FACEBOOK' } = req.body;

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy video' } });
    return;
  }

  const aiService = AIService.getInstance();
  const generated = await aiService.generateContent({
    videoTitle: video.title,
    sourceContext: video.description || undefined,
    targetPlatform,
    language: language as 'vi' | 'en',
    tone
  });

  const record = await prisma.generatedContent.create({
    data: {
      videoId: video.id,
      platform: targetPlatform as any,
      language,
      title: generated.title,
      caption: generated.caption,
      hashtags: generated.hashtags,
      pinnedComment: generated.pinnedComment,
      aiModel: `${generated.provider}:${generated.model}`,
      isApproved: false
    }
  });

  res.json({ success: true, data: record });
}

export async function approveVideo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const video = await prisma.video.findUnique({
    where: { id },
    include: { rights: true }
  });

  if (!video) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy video' } });
    return;
  }

  const validStatuses: RightsStatus[] = [RightsStatus.AUTHORIZED, RightsStatus.LICENSED, RightsStatus.PUBLIC_DOMAIN];
  if (!video.rights || !validStatuses.includes(video.rights.rightsStatus)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'RIGHTS_NOT_VERIFIED',
        message: 'Video chưa có quyền sử dụng hợp lệ (AUTHORIZED hoặc LICENSED). Vui lòng cập nhật quyền trước khi duyệt!'
      }
    });
    return;
  }

  const updated = await prisma.video.update({
    where: { id },
    data: { status: VideoStatus.APPROVED }
  });

  res.json({ success: true, data: updated });
}

export async function rejectVideo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { reason } = req.body;

  const updated = await prisma.video.update({
    where: { id },
    data: {
      status: VideoStatus.REJECTED,
      description: reason ? `Lý do từ chối: ${reason}` : undefined
    }
  });

  res.json({ success: true, data: updated });
}

export async function processVideo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy video' } });
    return;
  }

  const job = await prisma.videoProcessingJob.create({
    data: {
      videoId: video.id,
      jobType: 'FFMPEG_TRANSCODE_9_16',
      status: 'QUEUED',
      progress: 0
    }
  });

  const queueService = QueueService.getInstance();
  await queueService.addJob(QueueName.PROCESSING, 'process-video', {
    videoId: video.id,
    jobId: job.id
  });

  await prisma.video.update({
    where: { id: video.id },
    data: { status: VideoStatus.PROCESSING }
  });

  res.json({
    success: true,
    data: {
      jobId: job.id,
      message: 'Tiến trình xử lý video đã được đưa vào hàng đợi'
    }
  });
}

export async function deleteVideo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const deleted = await videoService.deleteVideo(id);

  if (!deleted) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy video để xóa' } });
    return;
  }

  res.json({ success: true, message: 'Đã xóa video và các tệp liên quan thành công' });
}
