import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { prisma, SourceType, RightsStatus, VideoStatus, AssetType } from '@socialflow/database';
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

      // 2. Move file to originals folder
      const targetFileName = `${Date.now()}_${path.basename(originalName)}`;
      const saved = await this.storageService.moveFileToOriginals(tempPath, targetFileName);

      // 3. Create Video DB record
      const video = await prisma.video.create({
        data: {
          userId,
          title: originalName.replace(/\.[^/.]+$/, ''),
          sourceType: SourceType.MANUAL_UPLOAD,
          sourceUrl: saved.filePath,
          status: VideoStatus.DOWNLOADED,
          fileHash,
          rightsStatus: options.rightsStatus || RightsStatus.PENDING_REVIEW,
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

      // 5. Update Video with metadata
      const updatedVideo = await prisma.video.update({
        where: { id: video.id },
        data: {
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          aspectRatio: meta.aspectRatio
        },
        include: { rights: true }
      });

      // 6. Create Original Video Asset
      await prisma.videoAsset.create({
        data: {
          videoId: video.id,
          assetType: AssetType.ORIGINAL,
          filePath: saved.filePath,
          fileSizeBytes: BigInt(saved.sizeBytes),
          fileHash,
          mimeType: file.mimetype || `video/${meta.format || 'mp4'}`,
          metadata: meta as any
        }
      });

      // 7. If thumbnail generated, create Thumbnail Asset
      if (meta.thumbnailPath) {
        const thumbStats = fs.statSync(meta.thumbnailPath);
        await prisma.videoAsset.create({
          data: {
            videoId: video.id,
            assetType: AssetType.THUMBNAIL,
            filePath: meta.thumbnailPath,
            fileSizeBytes: BigInt(thumbStats.size),
            mimeType: 'image/jpeg'
          }
        });
      }

      uploaded.push(updatedVideo);
    }

    return { uploaded, duplicates };
  }

  public streamVideo(videoFilePath: string, req: Request, res: Response): void {
    if (!fs.existsSync(videoFilePath)) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tệp video không tồn tại trên đĩa' } });
      return;
    }

    const stat = fs.statSync(videoFilePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoFilePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4'
      };
      res.writeHead(200, head);
      fs.createReadStream(videoFilePath).pipe(res);
    }
  }

  public async getThumbnail(videoId: string, res: Response): Promise<void> {
    const thumbAsset = await prisma.videoAsset.findFirst({
      where: {
        videoId,
        assetType: AssetType.THUMBNAIL
      }
    });

    if (thumbAsset && fs.existsSync(thumbAsset.filePath)) {
      res.setHeader('Content-Type', thumbAsset.mimeType || 'image/jpeg');
      fs.createReadStream(thumbAsset.filePath).pipe(res);
      return;
    }

    // Default SVG placeholder
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

    // Delete associated files from storage
    if (video.assets && Array.isArray(video.assets)) {
      for (const asset of video.assets) {
        if (asset.filePath) {
          this.storageService.deleteFile(asset.filePath);
        }
      }
    }

    await this.videoRepo.delete(id);
    return true;
  }
}
