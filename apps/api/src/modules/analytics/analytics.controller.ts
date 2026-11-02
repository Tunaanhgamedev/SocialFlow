import { Request, Response } from 'express';
import { prisma, VideoStatus, PublishingStatus } from '@socialflow/database';

export async function getOverviewStats(_req: Request, res: Response): Promise<void> {
  const [
    totalVideos,
    publishedCount,
    scheduledCount,
    failedCount,
    pendingReviewCount,
    totalAccounts,
    recentJobs
  ] = await Promise.all([
    prisma.video.count(),
    prisma.publishingJob.count({ where: { status: PublishingStatus.PUBLISHED } }),
    prisma.publishingJob.count({ where: { status: PublishingStatus.SCHEDULED } }),
    prisma.publishingJob.count({ where: { status: PublishingStatus.FAILED } }),
    prisma.video.count({ where: { status: VideoStatus.PENDING } }),
    prisma.socialAccount.count({ where: { isActive: true } }),
    prisma.publishingJob.findMany({
      take: 5,
      orderBy: { scheduledAt: 'asc' },
      include: {
        video: true,
        account: true
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalVideos,
        publishedCount,
        scheduledCount,
        failedCount,
        pendingReviewCount,
        totalAccounts
      },
      recentJobs
    }
  });
}
