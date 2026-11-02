import { Request, Response } from 'express';
import { prisma } from '@socialflow/database';

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

export async function listCampaigns(_req: Request, res: Response): Promise<void> {
  const campaigns = await prisma.publishingCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { jobs: true }
      }
    }
  });
  res.json({ success: true, data: campaigns });
}

export async function createCampaign(req: Request, res: Response): Promise<void> {
  const { name, description, startDate, endDate } = req.body;

  if (!name) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Tên chiến dịch là bắt buộc' } });
    return;
  }

  const userId = await getDefaultUserId();

  const campaign = await prisma.publishingCampaign.create({
    data: {
      userId,
      name,
      description,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null
    }
  });

  res.status(201).json({ success: true, data: campaign });
}

export async function getCampaignById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const campaign = await prisma.publishingCampaign.findUnique({
    where: { id },
    include: {
      jobs: {
        include: {
          video: true,
          account: true
        }
      }
    }
  });

  if (!campaign) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy chiến dịch' } });
    return;
  }

  res.json({ success: true, data: campaign });
}
