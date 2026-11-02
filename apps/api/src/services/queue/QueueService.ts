import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../../config/index.js';

export class QueueService {
  private static instance: QueueService;
  private redisClient: Redis | null = null;
  private queues: Map<string, Queue> = new Map();
  private isConnected = false;

  private constructor() {
    this.init();
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  private init(): void {
    try {
      this.redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('[QueueService] Không thể kết nối tới Redis sau 3 lần thử. Chế độ Standby được kích hoạt.');
            return null;
          }
          return Math.min(times * 1000, 3000);
        },
        lazyConnect: true
      });

      this.redisClient.on('connect', () => {
        this.isConnected = true;
        console.log('[QueueService] Kết nối Redis thành công.');
      });

      this.redisClient.on('error', (err) => {
        this.isConnected = false;
        // Avoid flooding logs on disconnect
      });

      // Try connecting in background
      this.redisClient.connect().catch(() => {
        // Ignored, fallback handled
      });
    } catch (e) {
      this.isConnected = false;
      console.warn('[QueueService] Redis không khả dụng:', e);
    }
  }

  public async checkHealth(): Promise<{ status: string; connected: boolean; host: string; port: number }> {
    if (!this.redisClient) {
      return { status: 'disabled', connected: false, host: config.redis.host, port: config.redis.port };
    }

    try {
      if (this.redisClient.status === 'ready' || this.redisClient.status === 'connect') {
        const ping = await this.redisClient.ping();
        return { status: 'healthy', connected: ping === 'PONG', host: config.redis.host, port: config.redis.port };
      }
      return { status: 'disconnected', connected: false, host: config.redis.host, port: config.redis.port };
    } catch {
      return { status: 'error', connected: false, host: config.redis.host, port: config.redis.port };
    }
  }

  public getQueue(name: string): Queue | null {
    if (!this.isConnected || !this.redisClient) {
      return null;
    }

    if (!this.queues.has(name)) {
      const q = new Queue(name, {
        connection: this.redisClient
      });
      this.queues.set(name, q);
    }
    return this.queues.get(name)!;
  }

  public async addJob(queueName: string, jobName: string, data: any, opts?: any): Promise<boolean> {
    const q = this.getQueue(queueName);
    if (!q) {
      console.warn(`[QueueService] Bỏ qua thêm job "${jobName}" vào queue "${queueName}" vì Redis chưa kết nối.`);
      return false;
    }
    await q.add(jobName, data, opts);
    return true;
  }
}
