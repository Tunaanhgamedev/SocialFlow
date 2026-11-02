import {
  VideoStatus,
  SourceType,
  PlatformType,
  AccountType,
  RightsStatus,
  PublishingStatus,
  AssetType
} from '../enums/index.js';

export interface BaseEntity {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface VideoMetadata {
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  format?: string;
  sizeBytes?: number;
  bitrate?: number;
  hasAudio?: boolean;
}

export interface VideoAssetDto {
  id: string;
  videoId: string;
  assetType: AssetType;
  filePath: string;
  fileUrl?: string;
  fileSizeBytes: number;
  mimeType: string;
}

export interface VideoDto extends BaseEntity {
  title: string;
  description?: string;
  sourceType: SourceType;
  sourceUrl?: string;
  status: VideoStatus;
  duration?: number;
  width?: number;
  height?: number;
  rightsStatus: RightsStatus;
  assets?: VideoAssetDto[];
}

export interface SocialAccountDto extends BaseEntity {
  platform: PlatformType;
  accountId: string;
  accountName: string;
  accountType: AccountType;
  profilePicUrl?: string;
  isActive: boolean;
  canAutoPublish: boolean;
}

export interface GeneratedContentDto {
  id: string;
  videoId: string;
  platform: PlatformType;
  language: string;
  title: string;
  caption: string;
  hashtags: string[];
  pinnedComment?: string;
}

export interface PublishingJobDto extends BaseEntity {
  campaignId?: string;
  videoId: string;
  socialAccountId: string;
  scheduledAt: string | Date;
  status: PublishingStatus;
  publishedUrl?: string;
  errorMessage?: string;
  retryCount: number;
  idempotencyKey: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
