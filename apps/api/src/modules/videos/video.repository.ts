import { prisma, Video, VideoStatus, RightsStatus, SourceType, Prisma } from '@socialflow/database';
import { VideoFilterParams } from '@socialflow/shared';

export class VideoRepository {
  private static instance: VideoRepository;

  private constructor() {}

  public static getInstance(): VideoRepository {
    if (!VideoRepository.instance) {
      VideoRepository.instance = new VideoRepository();
    }
    return VideoRepository.instance;
  }

  public async findMany(params: VideoFilterParams): Promise<{ items: any[]; total: number }> {
    const {
      status,
      rightsStatus,
      sourceType,
      search,
      sortBy = 'NEWEST',
      page = 1,
      limit = 20
    } = params;

    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where: Prisma.VideoWhereInput = {};

    if (status && status !== 'ALL') {
      where.status = status as VideoStatus;
    }
    if (rightsStatus && rightsStatus !== 'ALL') {
      where.rightsStatus = rightsStatus as RightsStatus;
    }
    if (sourceType && sourceType !== 'ALL') {
      where.sourceType = sourceType as SourceType;
    }
    if (search && search.trim()) {
      where.title = { contains: search.trim(), mode: 'insensitive' };
    }

    // Determine sorting
    let orderBy: Prisma.VideoOrderByWithRelationInput = { createdAt: 'desc' };
    if (sortBy === 'OLDEST') {
      orderBy = { createdAt: 'asc' };
    } else if (sortBy === 'DURATION_DESC') {
      orderBy = { duration: 'desc' };
    } else if (sortBy === 'TITLE_ASC') {
      orderBy = { title: 'asc' };
    }

    const [total, items] = await Promise.all([
      prisma.video.count({ where }),
      prisma.video.findMany({
        where,
        take,
        skip,
        orderBy,
        include: {
          assets: true,
          rights: true,
          contents: true,
          publishingJobs: {
            include: { account: true }
          }
        }
      })
    ]);

    // If sorting by size, we can sort items in-memory or by asset size
    if (sortBy === 'SIZE_DESC') {
      items.sort((a, b) => {
        const sizeA = a.assets?.[0]?.fileSizeBytes ? Number(a.assets[0].fileSizeBytes) : 0;
        const sizeB = b.assets?.[0]?.fileSizeBytes ? Number(b.assets[0].fileSizeBytes) : 0;
        return sizeB - sizeA;
      });
    }

    return { items, total };
  }

  public async findById(id: string): Promise<any | null> {
    return prisma.video.findUnique({
      where: { id },
      include: {
        assets: true,
        rights: true,
        contents: true,
        processingJobs: true,
        publishingJobs: {
          include: {
            account: true,
            logs: true
          }
        }
      }
    });
  }

  public async findByHash(fileHash: string): Promise<Video | null> {
    return prisma.video.findFirst({
      where: { fileHash }
    });
  }

  public async create(data: Prisma.VideoCreateInput): Promise<Video> {
    return prisma.video.create({ data });
  }

  public async update(id: string, data: Prisma.VideoUpdateInput): Promise<Video> {
    return prisma.video.update({ where: { id }, data });
  }

  public async delete(id: string): Promise<Video> {
    return prisma.video.delete({ where: { id } });
  }
}
