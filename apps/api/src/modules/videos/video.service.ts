import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { prisma, SourceType, RightsStatus, VideoStatus, AssetType, StorageProviderType } from '@socialflow/database';
import { StorageCategory } from '@socialflow/shared';
import { LocalStorageService } from '../../services/storage/LocalStorageService.js';
import { MetadataService } from '../../services/metadata.service.js';
import { VideoRepository } from './video.repository.js';

export class VideoService {
  private static instance: VideoService;
  private videoRepo = VideoRepository.getInstance();
  private storageService = LocalStorageService.getInstance();
  private metadataService = MetadataService.getInstance();

  private constructor() {}

  public static getInstance(): VideoService {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService();
    }
    return VideoService.instance;
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

  public async uploadVideoFiles(
    files: Express.Multer.File[],
    options: { rightsStatus?: RightsStatus; licenseNote?: string; authorConsent?: boolean }
  ): Promise<{ uploaded: any[]; duplicates: string[] }> {
    const userId = await this.getDefaultUserId();
    const uploaded = [];
    const duplicates = [];

    for (const file of files) {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const tempPath = file.path;

      // 1. Calculate file hash
      const fileHash = await this.storageService.calculateFileHash(tempPath);

      // Check if duplicate already exists
      const existing = await this.videoRepo.findByHash(fileHash);
      if (existing) {
        duplicates.push(originalName);
        try {
          fs.unlinkSync(tempPath);
        } catch {}
        continue;
      }

      // 2. Move file to originals folder using Storage Provider
      const targetFileName = `${Date.now()}_${path.basename(originalName)}`;
      const saved = await this.storageService.moveFileToOriginals(tempPath, targetFileName);

      // 3. Create Video DB record with storageProvider and relative storageKey
      const video = await prisma.video.create({
        data: {
          userId,
          title: originalName.replace(/\.[^/.]+$/, ''),
          sourceType: SourceType.MANUAL_UPLOAD,
          sourceUrl: saved.storageKey,
          status: VideoStatus.DOWNLOADED,
          fileHash,
          rightsStatus: options.rightsStatus || RightsStatus.PENDING_REVIEW,
          storageProvider: StorageProviderType.LOCAL,
          storageKey: saved.storageKey,
          rights: {
            create: {
              rightsStatus: options.rightsStatus || RightsStatus.PENDING_REVIEW,
              notes: options.licenseNote || 'Tải lên thủ công qua Dashboard',
              authorConsent: options.authorConsent || false
            }
          }
        }
      });

      // 4. Extract metadata & generate thumbnail
      const meta = await this.metadataService.extractMetadata(saved.filePath, video.id);

      // 5. Update Video with metadata & thumbnailKey
      const updatedVideo = await prisma.video.update({
        where: { id: video.id },
        data: {
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          aspectRatio: meta.aspectRatio,
          thumbnailKey: meta.thumbnailKey
        },
        include: { rights: true }
      });

      // 6. Create Original Video Asset (Stores relative storageKey, not hardcoded disk path)
      await prisma.videoAsset.create({
        data: {
          videoId: video.id,
          assetType: AssetType.ORIGINAL,
          storageProvider: StorageProviderType.LOCAL,
          storageKey: saved.storageKey,
          filePath: saved.storageKey,
          fileSizeBytes: BigInt(saved.sizeBytes),
          fileHash,
          mimeType: file.mimetype || `video/${meta.format || 'mp4'}`,
          metadata: meta as any
        }
      });

      // 7. If thumbnail generated, create Thumbnail Asset
      if (meta.thumbnailKey && meta.thumbnailPath) {
        const thumbStats = fs.statSync(meta.thumbnailPath);
        await prisma.videoAsset.create({
          data: {
            videoId: video.id,
            assetType: AssetType.THUMBNAIL,
            storageProvider: StorageProviderType.LOCAL,
            storageKey: meta.thumbnailKey,
            filePath: meta.thumbnailKey,
            fileSizeBytes: BigInt(thumbStats.size),
            mimeType: 'image/jpeg'
          }
        });
      }

      uploaded.push(updatedVideo);
    }

    return { uploaded, duplicates };
  }

  /**
   * Streams video by storage key or local file path
   * Supports HTTP 206 Partial Content Range for HTML5 browser scrubbing
   */
  public async streamVideo(storageKeyOrPath: string, req: Request, res: Response): Promise<void> {
    try {
      let storageKey = storageKeyOrPath;

      // If an absolute path was passed, normalize to storageKey relative to local root
      if (path.isAbsolute(storageKeyOrPath)) {
        const relativeKey = path
          .relative(this.storageService.getAbsolutePath(''), storageKeyOrPath)
          .replace(/\\/g, '/');
        storageKey = relativeKey;
      }

      const rangeHeader = req.headers.range;
      let range: { start: number; end?: number } | undefined;
      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : undefined;
        range = { start, end };
      }

      const streamResult = await this.storageService.getStream(storageKey, range);

      if (streamResult.isPartial && streamResult.contentRange) {
        res.writeHead(206, {
          'Content-Range': streamResult.contentRange,
          'Accept-Ranges': 'bytes',
          'Content-Length': streamResult.contentLength,
          'Content-Type': streamResult.contentType
        });
      } else {
        res.writeHead(200, {
          'Content-Length': streamResult.contentLength,
          'Content-Type': streamResult.contentType,
          'Accept-Ranges': 'bytes'
        });
      }

      streamResult.stream.pipe(res);
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message || 'Tệp video không tồn tại trên hệ thống lưu trữ' }
        });
      }
    }
  }

  public async getThumbnail(videoId: string, res: Response): Promise<void> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { thumbnailKey: true }
    });

    if (video?.thumbnailKey && (await this.storageService.exists(video.thumbnailKey))) {
      const streamResult = await this.storageService.getStream(video.thumbnailKey);
      res.setHeader('Content-Type', streamResult.contentType);
      streamResult.stream.pipe(res);
      return;
    }

    const thumbAsset = await prisma.videoAsset.findFirst({
      where: {
        videoId,
        assetType: AssetType.THUMBNAIL
      }
    });

    const assetKey = thumbAsset?.storageKey || thumbAsset?.filePath;
    if (assetKey && (await this.storageService.exists(assetKey))) {
      const streamResult = await this.storageService.getStream(assetKey);
      res.setHeader('Content-Type', streamResult.contentType);
      streamResult.stream.pipe(res);
      return;
    }

    // Default SVG placeholder for 9:16 reels
    const svg = `
      <svg width="400" height="711" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0f172a"/>
        <text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="24" fill="#64748b" text-anchor="middle" dy=".3em">9:16 Video Preview</text>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  }

  public async deleteVideo(id: string): Promise<boolean> {
    const video = await this.videoRepo.findById(id);
    if (!video) return false;

    // Delete associated files from storage provider using storageKey
    if (video.assets && Array.isArray(video.assets)) {
      for (const asset of video.assets) {
        const key = asset.storageKey || asset.filePath;
        if (key) {
          await this.storageService.delete(key);
        }
      }
    }

    if (video.storageKey) {
      await this.storageService.delete(video.storageKey);
    }
    if (video.thumbnailKey) {
      await this.storageService.delete(video.thumbnailKey);
    }

    await this.videoRepo.delete(id);
    return true;
  }
}
