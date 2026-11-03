import { Request, Response } from 'express';
import { prisma, SourceType, RightsStatus, VideoStatus } from '@socialflow/database';
import { SourceService } from './source.service.js';

const sourceService = SourceService.getInstance();

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

export async function importUrl(req: Request, res: Response): Promise<void> {
  const { url, title, sourceType, authorName, rightsStatus, licenseNote, authorConsent } = req.body;

  if (!url) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Đường dẫn (URL) là bắt buộc' }
    });
    return;
  }

  const result = await sourceService.importUrl({
    url,
    title,
    sourceType,
    authorName,
    rightsStatus: (rightsStatus as RightsStatus) || RightsStatus.PENDING_REVIEW,
    licenseNote,
    authorConsent: authorConsent === true || authorConsent === 'true'
  });

  res.status(201).json({
    success: true,
    data: {
      video: result.video,
      sourceItem: result.sourceItem,
      message: 'Video đã được tiếp nhận thành công và đưa vào hàng chờ xử lý'
    }
  });
}

export async function importDouyinLink(req: Request, res: Response): Promise<void> {
  return importUrl(req, res);
}

export async function deleteSource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await prisma.videoSource.delete({ where: { id } });
  res.json({ success: true, message: 'Đã xóa nguồn video' });
}
