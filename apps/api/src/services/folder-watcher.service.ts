import chokidar, { FSWatcher } from 'chokidar';
import fs from 'fs';
import path from 'path';
import { prisma, SourceType, RightsStatus, VideoStatus, AssetType } from '@socialflow/database';
import { StorageCategory } from '@socialflow/shared';
import { getStorageProvider, IStorageProvider } from './storage/index.js';
import { MetadataService } from './metadata.service.js';
import { VideoValidator } from './video-validator.service.js';

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
  private storage: IStorageProvider;
  private metadataService: MetadataService;

  private constructor() {
    this.storage = getStorageProvider();
    this.metadataService = MetadataService.getInstance();
  }

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

  /**
   * Xác thực và làm sạch đường dẫn thư mục, chống Path Traversal và thư mục hệ thống
   */
  public validateFolderPath(folderPath: string): string {
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('Đường dẫn thư mục không hợp lệ');
    }

    const normalizedPath = path.resolve(folderPath.trim());

    // 1. Kiểm tra tồn tại và phải là thư mục
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Thư mục không tồn tại: ${normalizedPath}`);
    }

    const stat = fs.statSync(normalizedPath);
    if (!stat.isDirectory()) {
      throw new Error(`Đường dẫn chỉ định không phải là một thư mục: ${normalizedPath}`);
    }

    // 2. Chặn các thư mục gốc của ổ đĩa (Root drives) như C:\, D:\, /
    const parsed = path.parse(normalizedPath);
    if (parsed.root.toLowerCase() === normalizedPath.toLowerCase() || normalizedPath === '/') {
      throw new Error(`Bảo mật: Không được phép theo dõi trực tiếp toàn bộ ổ đĩa gốc (${normalizedPath})`);
    }

    // 3. Chặn các thư mục hệ thống nhạy cảm của Windows / Linux
    const lower = normalizedPath.toLowerCase();
    const forbiddenSystemPrefixes = [
      'c:\\windows',
      'c:\\program files',
      'c:\\program files (x86)',
      'c:\\programdata',
      'c:\\system volume information',
      'c:\\$recycle.bin',
      '/etc',
      '/var',
      '/usr',
      '/bin',
      '/sbin',
      '/root'
    ];

    for (const forbidden of forbiddenSystemPrefixes) {
      if (lower === forbidden || lower.startsWith(forbidden + '\\') || lower.startsWith(forbidden + '/')) {
        throw new Error(`Bảo mật: Không được phép theo dõi thư mục hệ thống: ${normalizedPath}`);
      }
    }

    return normalizedPath;
  }

  public async watchFolder(folderPath: string, autoIngest = true): Promise<WatcherInfo> {
    const normalizedPath = this.validateFolderPath(folderPath);

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
    const normalizedPath = this.validateFolderPath(folderPath);
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
    const normalizedPath = this.validateFolderPath(folderPath);

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
    let savedStorageKey: string | null = null;
    let createdVideoId: string | null = null;

    try {
      // 1. Kiểm tra định dạng video thực tế & Magic Bytes
      const validation = await VideoValidator.validate(filePath);
      if (!validation.isValid) {
        console.warn(`[FolderWatcher] Bỏ qua file không hợp lệ (${path.basename(filePath)}): ${validation.error}`);
        return false;
      }

      // 2. Tính mã băm SHA-256 để chống trùng lặp
      const fileHash = await this.storage.calculateHash(filePath);

      // Check if video with this hash already exists
      const existing = await prisma.video.findFirst({
        where: { fileHash }
      });

      if (existing) {
        console.log(`[FolderWatcher] Bỏ qua file trùng lặp (hash match): ${path.basename(filePath)}`);
        return false;
      }

      const fileName = path.basename(filePath);
      const userId = await this.getDefaultUserId();

      // 3. Nạp file vào Storage Provider (originals)
      const targetFileName = `${Date.now()}_${fileName}`;
      const saved = await this.storage.upload(StorageCategory.ORIGINALS, targetFileName, filePath);
      savedStorageKey = saved.key;

      const localOriginalPath = this.storage.getAbsolutePath(saved.key);

      // 4. Trích xuất metadata & thumbnail
      const meta = await this.metadataService.extractMetadata(localOriginalPath, targetFileName);

      // 5. Lưu vào database trong transaction
      await prisma.$transaction(async (tx) => {
        const video = await tx.video.create({
          data: {
            userId,
            title: fileName.replace(/\.[^/.]+$/, ''),
            sourceType: SourceType.LOCAL_FOLDER,
            sourceUrl: saved.key,
            status: VideoStatus.DOWNLOADED,
            fileHash,
            duration: meta.duration,
            width: meta.width,
            height: meta.height,
            aspectRatio: meta.aspectRatio,
            thumbnailKey: meta.thumbnailKey,
            rightsStatus: RightsStatus.PENDING_REVIEW,
            storageProvider: this.storage.providerType,
            storageKey: saved.key,
            rights: {
              create: {
                rightsStatus: RightsStatus.PENDING_REVIEW,
                notes: `Đồng bộ từ thư mục: ${sourceFolder || path.dirname(filePath)}`,
                authorConsent: false
              }
            }
          }
        });

        createdVideoId = video.id;

        // Create Original VideoAsset record
        await tx.videoAsset.create({
          data: {
            videoId: video.id,
            assetType: AssetType.ORIGINAL,
            storageProvider: this.storage.providerType,
            storageKey: saved.key,
            filePath: saved.key,
            fileSizeBytes: BigInt(saved.sizeBytes),
            fileHash,
            mimeType: `video/${meta.format || 'mp4'}`,
            metadata: meta as any
          }
        });

        // Create Thumbnail Asset if generated
        if (meta.thumbnailKey) {
          const thumbMeta = await this.storage.getMetadata(meta.thumbnailKey);
          await tx.videoAsset.create({
            data: {
              videoId: video.id,
              assetType: AssetType.THUMBNAIL,
              storageProvider: this.storage.providerType,
              storageKey: meta.thumbnailKey,
              filePath: meta.thumbnailKey,
              fileSizeBytes: BigInt(thumbMeta.size || 0),
              mimeType: 'image/jpeg'
            }
          });
        }
      });

      console.log(`[FolderWatcher] Đã tiếp nhận thành công: ${fileName} (${meta.duration || 0}s, ${meta.aspectRatio || '9:16'})`);
      return true;
    } catch (err: any) {
      console.error(`[FolderWatcher] Lỗi khi nạp file ${filePath}:`, err);

      // Rollback storage & DB if error occurred
      if (savedStorageKey) {
        await this.storage.delete(savedStorageKey).catch(() => {});
      }
      if (createdVideoId) {
        await prisma.video.delete({ where: { id: createdVideoId } }).catch(() => {});
      }

      return false;
    }
  }

  public getWatchedFolders(): WatcherInfo[] {
    return Array.from(this.stats.values());
  }

  public getActiveWatchers(): WatcherInfo[] {
    return this.getWatchedFolders();
  }
}
