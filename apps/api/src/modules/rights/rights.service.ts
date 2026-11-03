import { prisma, RightsStatus, VideoStatus } from '@socialflow/database';
import { UpdateRightsInput } from '@socialflow/shared';

export class RightsService {
  private static instance: RightsService;

  private constructor() {}

  public static getInstance(): RightsService {
    if (!RightsService.instance) {
      RightsService.instance = new RightsService();
    }
    return RightsService.instance;
  }

  public async getRightsByVideoId(videoId: string) {
    return prisma.videoRights.findUnique({
      where: { videoId }
    });
  }

  public async updateRights(videoId: string, input: UpdateRightsInput) {
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      throw new Error('Video không tồn tại');
    }

    const isVerified =
      input.rightsStatus === RightsStatus.AUTHORIZED ||
      input.rightsStatus === RightsStatus.LICENSED ||
      input.rightsStatus === RightsStatus.PUBLIC_DOMAIN;

    const rights = await prisma.videoRights.upsert({
      where: { videoId },
      update: {
        rightsStatus: input.rightsStatus,
        licenseDocument: input.licenseDocument || null,
        evidence: input.evidence || null,
        notes: input.notes || null,
        authorConsent: input.authorConsent ?? false,
        verifiedAt: isVerified ? new Date() : null
      },
      create: {
        videoId,
        rightsStatus: input.rightsStatus,
        licenseDocument: input.licenseDocument || null,
        evidence: input.evidence || null,
        notes: input.notes || null,
        authorConsent: input.authorConsent ?? false,
        verifiedAt: isVerified ? new Date() : null
      }
    });

    // Update parent Video record
    const videoUpdateData: any = {
      rightsStatus: input.rightsStatus
    };

    // If revoked or prohibited, cannot remain APPROVED
    if (
      (input.rightsStatus === RightsStatus.REVOKED || input.rightsStatus === RightsStatus.PROHIBITED) &&
      video.status === VideoStatus.APPROVED
    ) {
      videoUpdateData.status = VideoStatus.REJECTED;
    }

    await prisma.video.update({
      where: { id: videoId },
      data: videoUpdateData
    });

    return rights;
  }

  public isPublishEligible(rightsStatus: RightsStatus): boolean {
    return (
      rightsStatus === RightsStatus.AUTHORIZED ||
      rightsStatus === RightsStatus.LICENSED ||
      rightsStatus === RightsStatus.PUBLIC_DOMAIN
    );
  }
}
