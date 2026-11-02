import { Job } from 'bullmq';
import { prisma, VideoStatus } from '@socialflow/database';

export async function processFFmpegJob(job: Job): Promise<void> {
  const { videoId, jobId } = job.data;
  console.log(`[Worker - Video] Bắt đầu xử lý FFmpeg cho video: ${videoId}`);

  await prisma.videoProcessingJob.update({
    where: { id: jobId },
    data: { status: 'IN_PROGRESS', startedAt: new Date(), progress: 10 }
  });

  // Simulation / Hook for FFmpeg 9:16 transcode in Phase 3
  await new Promise((resolve) => setTimeout(resolve, 1500));

  await prisma.videoProcessingJob.update({
    where: { id: jobId },
    data: { status: 'COMPLETED', completedAt: new Date(), progress: 100 }
  });

  await prisma.video.update({
    where: { id: videoId },
    data: { status: VideoStatus.PROCESSED }
  });

  console.log(`[Worker - Video] Xử lý xong FFmpeg cho video: ${videoId}`);
}
