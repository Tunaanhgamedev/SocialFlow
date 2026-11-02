import { Request, Response } from 'express';
import { prisma, VideoStatus, RightsStatus, SourceType } from '@socialflow/database';
import { AIService } from '../../services/ai/AIProvider.js';
import { QueueService } from '../../services/queue/QueueService.js';
import { QueueName } from '@socialflow/shared';

// Helper to get default admin user id for single user mode
async function getDefaultUserId(): Promise<string> {
  const existing = await prisma.user.findFirst();
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      email: 'admin@socialflow.local',
      name: 'Cos Dolove Admin',
      role: 'ADMIN'
    }
  });
  return created.id;
}

export async function listVideos(req: Request, res: Response): Promise<void> {
  const { status, limit = '20', page = '1', search } = req.query;
  const take = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 100);
  const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;

  const where: any = {};
  if (status) {
    where.status = status as VideoStatus;
  }
  if (search) {
    where.title = { contains: search as string, mode: 'insensitive' };
  }

  const [total, items] = await Promise.all([
    prisma.video.count({ where }),
    prisma.video.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        assets: true,
        rights: true,
        contents: true,
        publishingJobs: {
          include: { account: true }
        }
      }
    })
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      total,
      page: Math.floor(skip / take) + 1,
      limit: take
    }
  });
}

export async function getVideoById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const item = await prisma.video.findUnique({
    where: { id },
    include: {
      assets: true,
      rights: true,
      contents: true,
      processingJobs: true,
      publishingJobs: {
        include: {
          account: true,
          logs: true
        }
      }
    }
  });

  if (!item) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy video với ID yêu cầu' }
    });
    return;
  }

  res.json({ success: true, data: item });
}

export async function createVideo(req: Request, res: Response): Promise<void> {
  const { title, description, sourceType = 'MANUAL_UPLOAD', sourceUrl, rightsStatus = 'AUTHORIZED' } = req.body;

  if (!title) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Tiêu đề video là bắt buộc' }
    });
    return;
  }

  const userId = await getDefaultUserId();

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
    include: {
      rights: true
    }
  });

  res.status(201).json({ success: true, data: video });
}

export async function generateAIContent(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { language = 'vi', tone = 'engaging', targetPlatform = 'FACEBOOK' } = req.body;

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy video' }
    });
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
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy video' }
    });
    return;
  }

  if (video.rights?.rightsStatus !== RightsStatus.AUTHORIZED) {
    res.status(400).json({
      success: false,
      error: {
        code: 'RIGHTS_NOT_VERIFIED',
        message: 'Video chưa có quyền sử dụng hợp lệ (AUTHORIZED). Không thể duyệt đăng!'
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

  // Create processing job record
  const job = await prisma.videoProcessingJob.create({
    data: {
      videoId: video.id,
      jobType: 'FFMPEG_TRANSCODE_9_16',
      status: 'QUEUED',
      progress: 0
    }
  });

  // Add to BullMQ queue if Redis is connected
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
  await prisma.video.delete({ where: { id } });
  res.json({ success: true, message: 'Đã xóa video' });
}
