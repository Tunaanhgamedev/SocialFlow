import { prisma, SourceType, RightsStatus, VideoStatus } from '@socialflow/database';
import { QueueService } from '../../services/queue/QueueService.js';
import { QueueName } from '@socialflow/shared';
import { VideoDownloaderService } from '../../services/video-downloader.service.js';

export interface ImportUrlInput {
  url: string;
  title?: string;
  sourceType?: SourceType;
  authorName?: string;
  rightsStatus?: RightsStatus;
  licenseNote?: string;
  authorConsent?: boolean;
}

export class SourceService {
  private static instance: SourceService;

  private constructor() {}

  public static getInstance(): SourceService {
    if (!SourceService.instance) {
      SourceService.instance = new SourceService();
    }
    return SourceService.instance;
  }

  private async getDefaultUserId(): Promise<string> {
    const existing = await prisma.user.findFirst();
    if (existing) return existing.id;
    const created = await prisma.user.create({
      data: {
        email: 'admin@socialflow.local',
        name: 'Cos Dolove Admin',
        role: 'ADMIN'
      }
    });
    return created.id;
  }

  public detectSourceType(url: string): SourceType {
    if (url.includes('douyin.com')) return SourceType.DOUYIN_URL;
    if (url.startsWith('http://') || url.startsWith('https://')) return SourceType.DOUYIN_URL;
    return SourceType.MANUAL_UPLOAD;
  }

  public async importUrl(input: ImportUrlInput) {
    const userId = await this.getDefaultUserId();
    const detectedType = input.sourceType || this.detectSourceType(input.url);

    // Find or create Source record container
    let source = await prisma.videoSource.findFirst({
      where: { sourceType: detectedType }
    });

    if (!source) {
      source = await prisma.videoSource.create({
        data: {
          userId,
          sourceType: detectedType,
          sourceName: detectedType === SourceType.DOUYIN_URL ? 'Douyin URL Ingestion' : 'External Web URL',
          sourceUrl: input.url
        }
      });
    }

    // Extract basic title or author
    const defaultTitle = input.title || `Video ${new Date().toLocaleDateString('vi-VN')} (${detectedType})`;

    // Create SourceItem
    const sourceItem = await prisma.sourceItem.create({
      data: {
        sourceId: source.id,
        rawUrl: input.url,
        title: defaultTitle,
        authorName: input.authorName || 'Douyin Creator',
        isProcessed: false
      }
    });

    // Create Video record
    const rightsStatus = input.rightsStatus || RightsStatus.PENDING_REVIEW;
    const video = await prisma.video.create({
      data: {
        userId,
        sourceItemId: sourceItem.id,
        title: defaultTitle,
        sourceType: detectedType,
        sourceUrl: input.url,
        status: VideoStatus.PENDING,
        rightsStatus,
        rights: {
          create: {
            rightsStatus,
            notes: input.licenseNote || 'Tiếp nhận qua URL nguồn',
            authorConsent: input.authorConsent ?? false
          }
        }
      },
      include: {
        rights: true
      }
    });

    // Push download job to BullMQ queue, with fallback to async local execution
    const queueService = QueueService.getInstance();
    const redisHealth = await queueService.checkHealth();

    if (redisHealth.status === 'connected') {
      await queueService.addJob(QueueName.DOWNLOAD, 'download-url', {
        videoId: video.id,
        sourceItemId: sourceItem.id,
        url: input.url
      });
    } else {
      // Async background download when Redis is in degraded/standalone mode
      const downloader = VideoDownloaderService.getInstance();
      downloader.downloadAndIngest(video.id, input.url).catch((err) => {
        console.error(`[SourceService] Async download error for video ${video.id}:`, err);
      });
    }

    return { video, sourceItem };
  }
}
