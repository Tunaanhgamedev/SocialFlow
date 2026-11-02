import { Request, Response } from 'express';
import { prisma } from '@socialflow/database';
import { QueueService } from '../../services/queue/QueueService.js';
import { LocalStorageService } from '../../services/storage/LocalStorageService.js';
import { AIService } from '../../services/ai/AIProvider.js';

export async function getHealthStatus(_req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  let dbStatus = 'healthy';
  let dbError: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    dbStatus = 'disconnected';
    dbError = err.message || 'Không thể kết nối đến cơ sở dữ liệu PostgreSQL';
  }

  const queueService = QueueService.getInstance();
  const redisHealth = await queueService.checkHealth();

  const storageService = LocalStorageService.getInstance();
  const storageStats = storageService.getStorageStats();

  const aiService = AIService.getInstance();
  const aiProviders = aiService.getAvailableProviders();

  const isOverallHealthy = dbStatus === 'healthy';

  res.status(isOverallHealthy ? 200 : 207).json({
    success: true,
    data: {
      status: isOverallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      services: {
        database: {
          type: 'PostgreSQL',
          status: dbStatus,
          error: dbError
        },
        redis: {
          type: 'Redis & BullMQ',
          ...redisHealth
        },
        storage: {
          type: 'Local Filesystem',
          status: 'healthy',
          stats: storageStats
        },
        ai: {
          type: 'Multi-Provider',
          active: aiService.getActiveProvider().name,
          providers: aiProviders
        }
      },
      system: {
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    }
  });
}
