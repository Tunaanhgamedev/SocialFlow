import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
import { QueueName } from '@socialflow/shared';
import { processDownloadJob } from './processors/download.processor.js';
import { processFFmpegJob } from './processors/video.processor.js';
import { processAIJob } from './processors/ai.processor.js';
import { processPublishJob } from './processors/publish.processor.js';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
};

async function startWorkers() {
  console.log('----------------------------------------------------');
  console.log('👷 SocialFlow Background Workers Initializing...');
  console.log(`Connecting to Redis at ${redisConfig.host}:${redisConfig.port}...`);
  console.log('----------------------------------------------------');

  const connection = new Redis(redisConfig);

  connection.on('connect', () => {
    console.log('✅ Worker kết nối Redis thành công.');
  });

  connection.on('error', (err) => {
    console.warn('⚠️ Worker Redis connection error:', err.message);
  });

  // Download Worker
  new Worker(
    QueueName.DOWNLOAD,
    async (job) => processDownloadJob(job),
    { connection, concurrency: 2 }
  );

  // Video Processing Worker (FFmpeg)
  new Worker(
    QueueName.PROCESSING,
    async (job) => processFFmpegJob(job),
    { connection, concurrency: 1 } // Limit heavy video processing concurrency
  );

  // AI Content Worker
  new Worker(
    QueueName.AI,
    async (job) => processAIJob(job),
    { connection, concurrency: 3 }
  );

  // Publishing Worker
  new Worker(
    QueueName.PUBLISHING,
    async (job) => processPublishJob(job),
    { connection, concurrency: 2 }
  );

  console.log('✨ Tất cả BullMQ workers đã sẵn sàng lắng nghe tác vụ.');
}

startWorkers().catch((err) => {
  console.error('❌ Lỗi khởi động worker:', err);
});
