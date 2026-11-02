import { Request, Response } from 'express';
import { prisma, PublishingStatus, AccountType, RightsStatus } from '@socialflow/database';
import { QueueService } from '../../services/queue/QueueService.js';
import { QueueName } from '@socialflow/shared';

export async function schedulePublishing(req: Request, res: Response): Promise<void> {
  const { videoId, campaignId, targets } = req.body;

  if (!videoId || !Array.isArray(targets) || targets.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'videoId và danh sách targets là bắt buộc' }
    });
    return;
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { rights: true }
  });

  if (!video) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy video' } });
    return;
  }

  if (video.rights?.rightsStatus !== RightsStatus.AUTHORIZED) {
    res.status(400).json({
      success: false,
      error: {
        code: 'RIGHTS_NOT_AUTHORIZED',
        message: 'Video chưa được cấp quyền sử dụng hợp lệ. Không thể lập lịch đăng!'
      }
    });
    return;
  }

  const createdJobs = [];
  const queueService = QueueService.getInstance();

  for (const target of targets) {
    const { accountId, contentId, scheduledAt } = target;
    const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account) continue;

    const scheduledDate = new Date(scheduledAt);
    const idempotencyKey = `pub_${videoId}_${accountId}_${scheduledDate.getTime()}`;

    // Determine initial status based on account type
    const isPersonal = account.accountType === AccountType.PERSONAL || !account.canAutoPublish;
    const initialStatus = isPersonal
      ? PublishingStatus.AWAITING_MANUAL_PUBLISH
      : PublishingStatus.SCHEDULED;

    const job = await prisma.publishingJob.upsert({
      where: { idempotencyKey },
      update: {
        scheduledAt: scheduledDate,
        contentId: contentId || null,
        campaignId: campaignId || null,
        status: initialStatus
      },
      create: {
        videoId,
        socialAccountId: accountId,
        contentId: contentId || null,
        campaignId: campaignId || null,
        idempotencyKey,
        scheduledAt: scheduledDate,
        status: initialStatus
      }
    });

    createdJobs.push(job);

    // If auto publish enabled and BullMQ is connected, register delayed job
    if (!isPersonal) {
      const delayMs = Math.max(0, scheduledDate.getTime() - Date.now());
      await queueService.addJob(
        QueueName.PUBLISHING,
        'publish-reel',
        { publishingJobId: job.id },
        { delay: delayMs, jobId: `pub-${job.id}` }
      );
    }
  }

  res.status(201).json({
    success: true,
    data: {
      totalJobs: createdJobs.length,
      jobs: createdJobs
    }
  });
}

export async function listPublishingJobs(req: Request, res: Response): Promise<void> {
  const { status, limit = '50' } = req.query;

  const where: any = {};
  if (status) {
    where.status = status as PublishingStatus;
  }

  const jobs = await prisma.publishingJob.findMany({
    where,
    take: parseInt(limit as string, 10) || 50,
    orderBy: { scheduledAt: 'asc' },
    include: {
      video: true,
      account: true,
      content: true
    }
  });

  res.json({ success: true, data: jobs });
}

export async function confirmManualPublish(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { publishedUrl } = req.body;

  const job = await prisma.publishingJob.findUnique({
    where: { id },
    include: { account: true }
  });

  if (!job) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy job' } });
    return;
  }

  const updated = await prisma.publishingJob.update({
    where: { id },
    data: {
      status: PublishingStatus.PUBLISHED,
      publishedUrl: publishedUrl || 'https://facebook.com',
      lastAttemptAt: new Date()
    }
  });

  // Create published post record
  await prisma.publishedPost.create({
    data: {
      publishingJobId: job.id,
      socialAccountId: job.socialAccountId,
      platformPostId: `manual_${Date.now()}`,
      permalinkUrl: publishedUrl || 'https://facebook.com',
      publishedAt: new Date()
    }
  });

  res.json({
    success: true,
    data: updated,
    message: 'Đã xác nhận đăng thành công bài đăng Facebook cá nhân!'
  });
}

export async function cancelPublishingJob(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const updated = await prisma.publishingJob.update({
    where: { id },
    data: { status: PublishingStatus.CANCELLED }
  });

  res.json({ success: true, data: updated });
}

export async function retryPublishingJob(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const job = await prisma.publishingJob.findUnique({ where: { id } });
  if (!job) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy job' } });
    return;
  }

  const updated = await prisma.publishingJob.update({
    where: { id },
    data: {
      status: PublishingStatus.PENDING,
      retryCount: { increment: 1 }
    }
  });

  const queueService = QueueService.getInstance();
  await queueService.addJob(QueueName.PUBLISHING, 'publish-reel', { publishingJobId: job.id });

  res.json({ success: true, data: updated, message: 'Đã đưa job vào hàng đợi thử lại' });
}
