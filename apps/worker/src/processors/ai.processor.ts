import { Job } from 'bullmq';

export async function processAIJob(job: Job): Promise<void> {
  const { videoId } = job.data;
  console.log(`[Worker - AI] Đang tạo caption & hashtag cho video: ${videoId}`);
  await new Promise((resolve) => setTimeout(resolve, 800));
  console.log(`[Worker - AI] Hoàn thành nội dung cho video: ${videoId}`);
}
