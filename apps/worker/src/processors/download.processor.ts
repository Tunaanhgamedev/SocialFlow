import { Job } from 'bullmq';
import { prisma, VideoStatus } from '@socialflow/database';

export async function processDownloadJob(job: Job): Promise<void> {
  const { videoId, url } = job.data;
  console.log(`[Worker - Download] Bắt đầu xử lý tải video ${videoId} từ URL: ${url}`);

  await prisma.video.update({
    where: { id: videoId },
    data: { status: VideoStatus.DOWNLOADING }
  });

  // Simulation / Hook for Douyin download in Phase 2
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await prisma.video.update({
    where: { id: videoId },
    data: { status: VideoStatus.DOWNLOADED }
  });

  console.log(`[Worker - Download] Hoàn thành tiếp nhận video ${videoId}`);
}
