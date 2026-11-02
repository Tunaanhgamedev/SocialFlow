import { Job } from 'bullmq';
import { prisma, PublishingStatus } from '@socialflow/database';

export async function processPublishJob(job: Job): Promise<void> {
  const { publishingJobId } = job.data;
  console.log(`[Worker - Publish] Đang thực hiện đăng bài cho job: ${publishingJobId}`);

  const publishingJob = await prisma.publishingJob.findUnique({
    where: { id: publishingJobId },
    include: { account: true, video: true }
  });

  if (!publishingJob) {
    console.error(`[Worker - Publish] Không tìm thấy job ${publishingJobId}`);
    return;
  }

  // Update status to PUBLISHING
  await prisma.publishingJob.update({
    where: { id: publishingJobId },
    data: { status: PublishingStatus.PUBLISHING, lastAttemptAt: new Date() }
  });

  // Log action
  await prisma.publishingLog.create({
    data: {
      publishingJobId,
      action: 'INIT_UPLOAD',
      status: 'SUCCESS',
      responsePayload: { simulated: true }
    }
  });

  // Simulate Meta Graph API Reels upload
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const externalPostId = `fb_reel_${Date.now()}`;
  const permalinkUrl = `https://www.facebook.com/reel/${externalPostId}`;

  // Complete job
  await prisma.publishingJob.update({
    where: { id: publishingJobId },
    data: {
      status: PublishingStatus.PUBLISHED,
      platformPostId: externalPostId,
      publishedUrl: permalinkUrl
    }
  });

  await prisma.publishedPost.create({
    data: {
      publishingJobId,
      socialAccountId: publishingJob.socialAccountId,
      platformPostId: externalPostId,
      permalinkUrl
    }
  });

  console.log(`[Worker - Publish] Đăng video thành công lên Page ${publishingJob.account.accountName}: ${permalinkUrl}`);
}
