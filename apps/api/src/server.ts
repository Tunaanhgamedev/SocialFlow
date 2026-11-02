import { createApp } from './app.js';
import { config } from './config/index.js';
import { prisma } from '@socialflow/database';
import { LocalStorageService } from './services/storage/LocalStorageService.js';
import { QueueService } from './services/queue/QueueService.js';

async function bootstrap() {
  console.log('----------------------------------------------------');
  console.log('🚀 SocialFlow API Server is starting up...');
  console.log(`Environment: ${config.env}`);
  console.log(`Port: ${config.port}`);
  console.log('----------------------------------------------------');

  // 1. Initialize local storage directory structure
  try {
    const storageService = LocalStorageService.getInstance();
    storageService.ensureDirectories();
    console.log('✅ Local storage directories verified:', config.storage.localRoot);
  } catch (err) {
    console.warn('⚠️ Lỗi khi khởi tạo thư mục lưu trữ cục bộ:', err);
  }

  // 2. Initialize Queue Service (BullMQ & Redis)
  try {
    QueueService.getInstance();
    console.log('✅ Queue service initialized (Redis host:', config.redis.host + ')');
  } catch (err) {
    console.warn('⚠️ Queue service running in degraded mode:', err);
  }

  // 3. Test Database Connection
  try {
    await prisma.$connect();
    console.log('✅ Kết nối PostgreSQL thành công via Prisma.');
  } catch (err: any) {
    console.warn('⚠️ Cảnh báo: Chưa kết nối được PostgreSQL:', err.message || err);
    console.warn('👉 Lưu ý: Hãy đảm bảo PostgreSQL đang chạy hoặc kiểm tra DATABASE_URL trong .env');
  }

  // 4. Start Express app
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`✨ SocialFlow API ready at: http://localhost:${config.port}`);
    console.log(`📡 Health Check URL: http://localhost:${config.port}/api/v1/health`);
    console.log('----------------------------------------------------');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nNhận tín hiệu ${signal}. Đang đóng các kết nối...`);
    server.close(async () => {
      await prisma.$disconnect().catch(() => {});
      console.log('🛑 Server đã dừng an toàn.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('❌ Lỗi nghiêm trọng khi khởi động server:', err);
  process.exit(1);
});
