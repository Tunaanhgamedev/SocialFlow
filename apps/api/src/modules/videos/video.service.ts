import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { prisma, SourceType, RightsStatus, VideoStatus, AssetType } from '@socialflow/database';
import { StorageCategory } from '@socialflow/shared';
import { getStorageProvider, IStorageProvider } from '../../services/storage/index.js';
import { MetadataService } from '../../services/metadata.service.js';
import { VideoValidator } from '../../services/video-validator.service.js';
import { VideoRepository } from './video.repository.js';

export interface UploadBatchResult {
  uploaded: any[];
  duplicates: string[];
  failed: { file: string; reason: string }[];
}

/**
 * Phân tích và kiểm tra tính hợp lệ của Header HTTP Range
 */
export function parseRangeHeader(
  rangeHeader: string,
  totalSize: number
): { start: number; end: number } | null | 'unsatisfiable' {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null;

  const rawRange = rangeHeader.replace('bytes=', '').trim();
  const firstRange = rawRange.split(',')[0].trim();
  const [startStr, endStr] = firstRange.split('-');

  let start: number;
  let end: number;

  if (!startStr && endStr) {
    // Suffix range: bytes=-500 (500 byte cuối cùng)
    const suffixLength = parseInt(endStr, 10);
    if (isNaN(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else if (startStr && !endStr) {
    // Open-ended range: bytes=1000-
    start = parseInt(startStr, 10);
    if (isNaN(start)) return null;
    end = totalSize - 1;
  } else if (startStr && endStr) {
    // Explicit range: bytes=0-1024
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end)) return null;
  } else {
    return null;
  }

  // Kiểm tra vi phạm giới hạn kích thước
  if (start < 0 || start >= totalSize || start > end) {
    return 'unsatisfiable';
  }

  // Giới hạn cận trên
  end = Math.min(end, totalSize - 1);

  return { start, end };
}

export class VideoService {
  private static instance: VideoService;
  private videoRepo = VideoRepository.getInstance();
  private storage: IStorageProvider;
  private metadataService = MetadataService.getInstance();

  private constructor() {
    this.storage = getStorageProvider();
  }

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

  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Tải lên danh sách video với xác thực định dạng thực tế, chống trùng và rollback toàn diện
   */
  public async uploadVideoFiles(
    files: Express.Multer.File[],
    options: { rightsStatus?: RightsStatus; licenseNote?: string; authorConsent?: boolean }
  ): Promise<UploadBatchResult> {
    const userId = await this.getDefaultUserId();
    const uploaded: any[] = [];
    const duplicates: string[] = [];
    const failed: { file: string; reason: string }[] = [];

    for (const file of files) {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const tempPath = file.path;

      let savedStorageKey: string | null = null;
      let createdVideoId: string | null = null;

      try {
        // 1. Kiểm tra Magic Bytes & FFprobe video stream
        const validation = await VideoValidator.validate(tempPath);
        if (!validation.isValid) {
          console.warn(`[VideoService] Bỏ qua file không hợp lệ (${originalName}):`, validation.error);
          failed.push({ file: originalName, reason: validation.error || 'Định dạng video không hợp lệ' });
          continue;
        }

        // 2. Tính mã băm SHA-256 để chống trùng lặp
        const fileHash = await this.calculateFileHash(tempPath);
        const existing = await this.videoRepo.findByHash(fileHash);
        if (existing) {
          duplicates.push(originalName);
          continue;
        }

        // 3. Tải lên Storage Provider
        const targetFileName = `${Date.now()}_${path.basename(originalName)}`;
        const saved = await this.storage.upload(StorageCategory.ORIGINALS, targetFileName, tempPath);
        savedStorageKey = saved.key;

        // 4. Trích xuất metadata & thumbnail
        const localFilePath = this.storage.getAbsolutePath(saved.key);
        const meta = await this.metadataService.extractMetadata(localFilePath, targetFileName);

        // 5. Lưu vào Database qua Transaction để đảm bảo tính toàn vẹn (Rollback nếu lỗi)
        const video = await prisma.$transaction(async (tx) => {
          const v = await tx.video.create({
            data: {
              userId,
              title: originalName.replace(/\.[^/.]+$/, ''),
              sourceType: SourceType.MANUAL_UPLOAD,
              sourceUrl: saved.key,
              status: VideoStatus.DOWNLOADED,
              duration: meta.duration,
              width: meta.width,
              height: meta.height,
              aspectRatio: meta.aspectRatio,
              thumbnailKey: meta.thumbnailKey,
              fileHash,
              rightsStatus: options.rightsStatus || RightsStatus.PENDING_REVIEW,
              storageProvider: this.storage.providerType,
              storageKey: saved.key,
              rights: {
                create: {
                  rightsStatus: options.rightsStatus || RightsStatus.PENDING_REVIEW,
                  notes: options.licenseNote || 'Tải lên thủ công qua Dashboard',
                  authorConsent: options.authorConsent || false
                }
              }
            },
            include: { rights: true }
          });

          createdVideoId = v.id;

          // Tạo bản ghi VideoAsset Gốc
          await tx.videoAsset.create({
            data: {
              videoId: v.id,
              assetType: AssetType.ORIGINAL,
              storageProvider: this.storage.providerType,
              storageKey: saved.key,
              filePath: saved.key,
              fileSizeBytes: BigInt(saved.sizeBytes),
              fileHash,
              mimeType: file.mimetype || `video/${meta.format || 'mp4'}`,
              metadata: meta as any
            }
          });

          // Tạo bản ghi VideoAsset Thumbnail nếu có
          if (meta.thumbnailKey) {
            const thumbMeta = await this.storage.getMetadata(meta.thumbnailKey);
            await tx.videoAsset.create({
              data: {
                videoId: v.id,
                assetType: AssetType.THUMBNAIL,
                storageProvider: this.storage.providerType,
                storageKey: meta.thumbnailKey,
                filePath: meta.thumbnailKey,
                fileSizeBytes: BigInt(thumbMeta.size || 0),
                mimeType: 'image/jpeg'
              }
            });
          }

          return v;
        });

        uploaded.push(video);
      } catch (err: any) {
        console.error(`[VideoService] Lỗi khi xử lý tải video ${originalName}:`, err);

        // ROLLBACK: Xóa file đã upload lên storage
        if (savedStorageKey) {
          await this.storage.delete(savedStorageKey).catch(() => {});
        }
        // ROLLBACK: Xóa bản ghi database nếu đã tạo ngoài transaction
        if (createdVideoId) {
          await prisma.video.delete({ where: { id: createdVideoId } }).catch(() => {});
        }

        failed.push({ file: originalName, reason: err.message || 'Lỗi không xác định khi lưu video' });
      } finally {
        // Luôn dọn dẹp file tạm của Multer
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch {}
      }
    }

    return { uploaded, duplicates, failed };
  }

  /**
   * Stream video bằng Storage Provider hỗ trợ đầy đủ chuẩn HTTP 206 Range & 416
   */
  public async streamVideo(storageKeyOrPath: string, req: Request, res: Response): Promise<void> {
    try {
      let storageKey = storageKeyOrPath;

      // Chuẩn hóa nếu truyền đường dẫn tuyệt đối
      if (path.isAbsolute(storageKeyOrPath)) {
        const relativeKey = path
          .relative(this.storage.getAbsolutePath(''), storageKeyOrPath)
          .replace(/\\/g, '/');
        storageKey = relativeKey;
      }

      // Kiểm tra file có tồn tại trên storage không
      const exists = await this.storage.exists(storageKey);
      if (!exists) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tệp video không tồn tại trên hệ thống lưu trữ' }
        });
        return;
      }

      const meta = await this.storage.getMetadata(storageKey);
      const totalSize = meta.size;
      const rangeHeader = req.headers.range;

      if (!rangeHeader) {
        // Toàn bộ file (HTTP 200)
        const streamResult = await this.storage.getStream(storageKey);
        res.writeHead(200, {
          'Content-Length': totalSize,
          'Content-Type': meta.mimeType || 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600'
        });
        streamResult.stream.pipe(res);
        return;
      }

      // Phân tích Range Header
      const parsedRange = parseRangeHeader(rangeHeader, totalSize);

      if (parsedRange === 'unsatisfiable') {
        res.writeHead(416, {
          'Content-Range': `bytes */${totalSize}`,
          'Accept-Ranges': 'bytes'
        });
        res.end();
        return;
      }

      if (!parsedRange) {
        // Fallback 200 stream nếu range không nhận diện được
        const streamResult = await this.storage.getStream(storageKey);
        res.writeHead(200, {
          'Content-Length': totalSize,
          'Content-Type': meta.mimeType || 'video/mp4',
          'Accept-Ranges': 'bytes'
        });
        streamResult.stream.pipe(res);
        return;
      }

      const { start, end } = parsedRange;
      const streamResult = await this.storage.getStream(storageKey, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': meta.mimeType || 'video/mp4',
        'Cache-Control': 'no-cache'
      });

      streamResult.stream.pipe(res);
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: { code: 'STREAM_ERROR', message: err.message || 'Lỗi khi truyền dữ liệu video' }
        });
      }
    }
  }

  public async getThumbnail(videoId: string, res: Response): Promise<void> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { thumbnailKey: true }
    });

    if (video?.thumbnailKey && (await this.storage.exists(video.thumbnailKey))) {
      const streamResult = await this.storage.getStream(video.thumbnailKey);
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
    if (assetKey && (await this.storage.exists(assetKey))) {
      const streamResult = await this.storage.getStream(assetKey);
      res.setHeader('Content-Type', streamResult.contentType);
      streamResult.stream.pipe(res);
      return;
    }

    // Default SVG placeholder cho Reels 9:16
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

    // Xóa các tệp liên kết trong Storage Provider
    if (video.assets && Array.isArray(video.assets)) {
      for (const asset of video.assets) {
        const key = asset.storageKey || asset.filePath;
        if (key) {
          await this.storage.delete(key);
        }
      }
    }

    if (video.storageKey) {
      await this.storage.delete(video.storageKey);
    }
    if (video.thumbnailKey) {
      await this.storage.delete(video.thumbnailKey);
    }

    await this.videoRepo.delete(id);
    return true;
  }
}
