import chokidar, { FSWatcher } from 'chokidar';
import fs from 'fs';
import path from 'path';
import { prisma, SourceType, RightsStatus, VideoStatus, AssetType } from '@socialflow/database';
import { LocalStorageService } from './storage/LocalStorageService.js';
import { MetadataService } from './metadata.service.js';

export interface WatcherInfo {
  folderPath: string;
  isWatching: boolean;
  filesFound: number;
  lastScannedAt: Date;
}

export class FolderWatcherService {
  private static instance: FolderWatcherService;
  private watchers: Map<string, FSWatcher> = new Map();
  private stats: Map<string, WatcherInfo> = new Map();
  private supportedExtensions = new Set(['.mp4', '.mov', '.webm', '.mkv']);

  private constructor() {}

  public static getInstance(): FolderWatcherService {
    if (!FolderWatcherService.instance) {
      FolderWatcherService.instance = new FolderWatcherService();
    }
    return FolderWatcherService.instance;
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

  public async watchFolder(folderPath: string, autoIngest = true): Promise<WatcherInfo> {
    const normalizedPath = path.resolve(folderPath);

    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Thư mục không tồn tại: ${normalizedPath}`);
    }

    if (this.watchers.has(normalizedPath)) {
      return this.stats.get(normalizedPath)!;
    }

    const watcher = chokidar.watch(normalizedPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 1500,
        pollInterval: 300
      },
      depth: 3
    });

    const info: WatcherInfo = {
      folderPath: normalizedPath,
      isWatching: true,
      filesFound: 0,
      lastScannedAt: new Date()
    };

    this.watchers.set(normalizedPath, watcher);
    this.stats.set(normalizedPath, info);

    // Register folder source in DB
    const userId = await this.getDefaultUserId();
    await prisma.videoSource.upsert({
      where: { id: `source-folder-${Buffer.from(normalizedPath).toString('base64').slice(0, 24)}` },
      update: {
        isActive: true,
        sourceName: `Thư mục: ${path.basename(normalizedPath)}`,
        configuration: { folderPath: normalizedPath, autoIngest }
      },
      create: {
        id: `source-folder-${Buffer.from(normalizedPath).toString('base64').slice(0, 24)}`,
        userId,
        sourceType: SourceType.LOCAL_FOLDER,
        sourceName: `Thư mục: ${path.basename(normalizedPath)}`,
        sourceUrl: normalizedPath,
        configuration: { folderPath: normalizedPath, autoIngest },
        isActive: true
      }
    }).catch(() => {
      // ignore source creation constraint errors
    });

    watcher.on('add', async (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (!this.supportedExtensions.has(ext)) return;

      info.filesFound++;
      info.lastScannedAt = new Date();
      console.log(`[FolderWatcher] Phát hiện video mới: ${filePath}`);

      if (autoIngest) {
        await this.ingestVideoFile(filePath, normalizedPath);
      }
    });

    watcher.on('error', (err) => {
      console.warn(`[FolderWatcher] Lỗi khi theo dõi ${normalizedPath}:`, err);
    });

    return info;
  }

  public async unwatchFolder(folderPath: string): Promise<boolean> {
    const normalizedPath = path.resolve(folderPath);
    const watcher = this.watchers.get(normalizedPath);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(normalizedPath);
      const stat = this.stats.get(normalizedPath);
      if (stat) stat.isWatching = false;
      return true;
    }
    return false;
  }

  public async scanFolderImmediate(folderPath: string): Promise<{ totalScanned: number; ingestedCount: number }> {
    const normalizedPath = path.resolve(folderPath);
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Thư mục không tồn tại: ${normalizedPath}`);
    }

    let totalScanned = 0;
    let ingestedCount = 0;

    const scanDir = async (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.supportedExtensions.has(ext)) {
            totalScanned++;
            const wasIngested = await this.ingestVideoFile(fullPath, normalizedPath);
            if (wasIngested) ingestedCount++;
          }
        }
      }
    };

    await scanDir(normalizedPath);
    return { totalScanned, ingestedCount };
  }

  public async ingestVideoFile(filePath: string, sourceFolder?: string): Promise<boolean> {
    try {
      const storageService = LocalStorageService.getInstance();
      const metadataService = MetadataService.getInstance();
      const userId = await this.getDefaultUserId();

      // 1. Calculate file hash to prevent duplicates
      const fileHash = await storageService.calculateFileHash(filePath);

      // Check if video with this hash already exists
      const existing = await prisma.video.findFirst({
        where: { fileHash }
      });

      if (existing) {
        console.log(`[FolderWatcher] Bỏ qua file trùng lặp (hash match): ${path.basename(filePath)}`);
        return false;
      }

      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);

      // 2. Copy file to storage originals
      const targetFileName = `${Date.now()}_${fileName}`;
      const saved = await storageService.moveFileToOriginals(filePath, targetFileName);

      // 3. Create Video DB record
      const video = await prisma.video.create({
        data: {
          userId,
          title: fileName.replace(/\.[^/.]+$/, ''),
          sourceType: SourceType.LOCAL_FOLDER,
          sourceUrl: filePath,
          status: VideoStatus.DOWNLOADED,
          fileHash,
          rightsStatus: RightsStatus.PENDING_REVIEW,
          storageProvider: 'LOCAL',
          storageKey: saved.storageKey,
          rights: {
            create: {
              rightsStatus: RightsStatus.PENDING_REVIEW,
              notes: `Đồng bộ từ thư mục: ${sourceFolder || path.dirname(filePath)}`,
              authorConsent: false
            }
          }
        }
      });

      // 4. Extract metadata & generate thumbnail
      const meta = await metadataService.extractMetadata(saved.filePath, video.id);

      // 5. Update Video with metadata & thumbnailKey
      await prisma.video.update({
        where: { id: video.id },
        data: {
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          aspectRatio: meta.aspectRatio,
          thumbnailKey: meta.thumbnailKey
        }
      });

      // 6. Create Original VideoAsset record (Stores storageKey, not hardcoded disk path)
      await prisma.videoAsset.create({
        data: {
          videoId: video.id,
          assetType: AssetType.ORIGINAL,
          storageProvider: 'LOCAL',
          storageKey: saved.storageKey,
          filePath: saved.storageKey,
          fileSizeBytes: BigInt(saved.sizeBytes),
          fileHash,
          mimeType: `video/${meta.format || 'mp4'}`,
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
            storageProvider: 'LOCAL',
            storageKey: meta.thumbnailKey,
            filePath: meta.thumbnailKey,
            fileSizeBytes: BigInt(thumbStats.size),
            mimeType: 'image/jpeg'
          }
        });
      }

      console.log(`[FolderWatcher] Tiếp nhận thành công video: ${video.title} (ID: ${video.id})`);
      return true;
    } catch (err: any) {
      console.error(`[FolderWatcher] Lỗi khi tiếp nhận ${filePath}:`, err.message);
      return false;
    }
  }

  public getActiveWatchers(): WatcherInfo[] {
    return Array.from(this.stats.values());
  }
}
