import { Request, Response } from 'express';
import { prisma, PlatformType, AccountType } from '@socialflow/database';

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

export async function listAccounts(_req: Request, res: Response): Promise<void> {
  const accounts = await prisma.socialAccount.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          publishingJobs: true,
          publishedPosts: true
        }
      }
    }
  });
  res.json({ success: true, data: accounts });
}

export async function createAccount(req: Request, res: Response): Promise<void> {
  const { accountName, accountId, platform = 'FACEBOOK', accountType = 'PAGE', canAutoPublish } = req.body;

  if (!accountName || !accountId) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Tên tài khoản và ID tài khoản là bắt buộc' }
    });
    return;
  }

  const userId = await getDefaultUserId();

  // For PERSONAL account, canAutoPublish defaults to false per design spec (semi-auto notification mode)
  const isPersonal = accountType === AccountType.PERSONAL;
  const autoPublishEnabled = canAutoPublish !== undefined ? canAutoPublish : !isPersonal;

  const account = await prisma.socialAccount.upsert({
    where: {
      platform_accountId: {
        platform: platform as PlatformType,
        accountId
      }
    },
    update: {
      accountName,
      accountType: accountType as AccountType,
      canAutoPublish: autoPublishEnabled,
      isActive: true
    },
    create: {
      userId,
      platform: platform as PlatformType,
      accountId,
      accountName,
      accountType: accountType as AccountType,
      canAutoPublish: autoPublishEnabled,
      isActive: true
    }
  });

  res.status(201).json({ success: true, data: account });
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await prisma.socialAccount.delete({ where: { id } });
  res.json({ success: true, message: 'Đã ngắt kết nối tài khoản' });
}
