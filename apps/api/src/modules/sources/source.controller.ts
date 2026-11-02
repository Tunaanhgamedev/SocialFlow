import { Request, Response } from 'express';
import { prisma, SourceType, RightsStatus, VideoStatus } from '@socialflow/database';
import { QueueService } from '../../services/queue/QueueService.js';
import { QueueName } from '@socialflow/shared';

async function getDefaultUserId(): Promise<string> {
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

export async function listSources(_req: Request, res: Response): Promise<void> {
  const sources = await prisma.videoSource.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { sourceItems: true }
      }
    }
  });
  res.json({ success: true, data: sources });
}

export async function createSource(req: Request, res: Response): Promise<void> {
  const { sourceType, sourceName, sourceUrl, configuration } = req.body;

  if (!sourceName) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Tên nguồn là bắt buộc' } });
    return;
  }

  const userId = await getDefaultUserId();

  const source = await prisma.videoSource.create({
    data: {
      userId,
      sourceType: (sourceType as SourceType) || SourceType.DOUYIN_URL,
      sourceName,
      sourceUrl,
      configuration: configuration || {}
    }
  });

  res.status(201).json({ success: true, data: source });
}

export async function importDouyinLink(req: Request, res: Response): Promise<void> {
  const { url, title, rightsStatus = 'AUTHORIZED', licenseNote } = req.body;

  if (!url) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Đường dẫn Douyin là bắt buộc' }
    });
    return;
  }

  const userId = await getDefaultUserId();

  // Find or create default Douyin Source container
  let douyinSource = await prisma.videoSource.findFirst({
    where: { sourceType: SourceType.DOUYIN_URL }
  });

  if (!douyinSource) {
    douyinSource = await prisma.videoSource.create({
      data: {
        userId,
        sourceType: SourceType.DOUYIN_URL,
        sourceName: 'Douyin URL Ingestion',
        configuration: { autoQueueDownload: true }
      }
    });
  }

  // Create SourceItem
  const sourceItem = await prisma.sourceItem.create({
    data: {
      sourceId: douyinSource.id,
      rawUrl: url,
      title: title || 'Douyin Video ' + new Date().toLocaleDateString('vi-VN'),
      isProcessed: false
    }
  });

  // Create Video record
  const video = await prisma.video.create({
    data: {
      userId,
      sourceItemId: sourceItem.id,
      title: title || 'Douyin Video ' + new Date().toLocaleDateString('vi-VN'),
      sourceType: SourceType.DOUYIN_URL,
      sourceUrl: url,
      status: VideoStatus.PENDING,
      rightsStatus: rightsStatus as RightsStatus,
      rights: {
        create: {
          rightsStatus: rightsStatus as RightsStatus,
          notes: licenseNote || 'Tiếp nhận qua dán link Douyin',
          authorConsent: rightsStatus === RightsStatus.AUTHORIZED
        }
      }
    },
    include: {
      rights: true
    }
  });

  // Push to BullMQ download queue
  const queueService = QueueService.getInstance();
  await queueService.addJob(QueueName.DOWNLOAD, 'download-douyin', {
    videoId: video.id,
    sourceItemId: sourceItem.id,
    url
  });

  res.status(201).json({
    success: true,
    data: {
      video,
      sourceItem,
      message: 'Video đã được tiếp nhận thành công và đưa vào hàng chờ xử lý'
    }
  });
}

export async function deleteSource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await prisma.videoSource.delete({ where: { id } });
  res.json({ success: true, message: 'Đã xóa nguồn video' });
}
