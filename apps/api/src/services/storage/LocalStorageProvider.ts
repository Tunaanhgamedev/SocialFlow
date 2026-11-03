import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';
import {
  StorageCategory,
  StorageProviderType,
  StorageUploadResult,
  StorageStreamResult,
  StorageFileMetadata
} from '@socialflow/shared';
import { IStorageProvider, UploadOptions } from './IStorageProvider.js';
import { config } from '../../config/index.js';

const streamPipeline = promisify(pipeline);

export class LocalStorageProvider implements IStorageProvider {
  public readonly providerType = StorageProviderType.LOCAL;
  private root: string;

  constructor(customRoot?: string) {
    this.root = customRoot || config.storage.localRoot;
    this.ensureCategoryDirectories();
  }

  private ensureCategoryDirectories(): void {
    const categories = [
      StorageCategory.ORIGINALS,
      StorageCategory.PROCESSED,
      StorageCategory.THUMBNAILS,
      StorageCategory.TEMP
    ];

    for (const cat of categories) {
      const dir = path.join(this.root, cat);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Resolves storageKey to local filesystem path
   * Sanitizes key to prevent directory traversal
   */
  public resolvePath(storageKey: string): string {
    const cleanKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    const fullPath = path.resolve(this.root, cleanKey);

    // Verify it doesn't escape root
    if (!fullPath.startsWith(path.resolve(this.root))) {
      throw new Error(`Security Violation: Invalid storage key: ${storageKey}`);
    }

    return fullPath;
  }

  public getAbsolutePath(storageKey: string): string {
    return this.resolvePath(storageKey);
  }

  public async upload(
    category: StorageCategory,
    fileName: string,
    data: Buffer | Readable | string,
    options?: UploadOptions
  ): Promise<StorageUploadResult> {
    this.ensureCategoryDirectories();

    const sanitizedFileName = path.basename(fileName);
    const storageKey = `${category}/${sanitizedFileName}`;
    const targetPath = this.resolvePath(storageKey);

    if (typeof data === 'string') {
      // Input is a local file path
      if (!fs.existsSync(data)) {
        throw new Error(`Tệp nguồn không tồn tại: ${data}`);
      }
      fs.copyFileSync(data, targetPath);
    } else if (Buffer.isBuffer(data)) {
      // Input is a memory Buffer
      fs.writeFileSync(targetPath, data);
    } else if (data instanceof Readable) {
      // Input is a readable stream
      const writeStream = fs.createWriteStream(targetPath);
      await streamPipeline(data, writeStream);
    } else {
      throw new Error('Unsupported data format for storage upload');
    }

    const stat = fs.statSync(targetPath);
    const hash = await this.calculateHash(storageKey);

    return {
      key: storageKey,
      category,
      fileName: sanitizedFileName,
      sizeBytes: stat.size,
      hash,
      provider: StorageProviderType.LOCAL,
      url: `/api/v1/storage/${storageKey}`
    };
  }

  public async delete(storageKey: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(storageKey);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[LocalStorageProvider] Lỗi khi xóa file ${storageKey}:`, err);
      return false;
    }
  }

  public async getUrl(storageKey: string): Promise<string> {
    return `/api/v1/storage/${storageKey.replace(/\\/g, '/')}`;
  }

  public async getStream(
    storageKey: string,
    range?: { start: number; end?: number }
  ): Promise<StorageStreamResult> {
    const fullPath = this.resolvePath(storageKey);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Storage file not found: ${storageKey}`);
    }

    const stat = fs.statSync(fullPath);
    const totalSize = stat.size;
    const ext = path.extname(fullPath).toLowerCase();
    const contentType =
      ext === '.mp4'
        ? 'video/mp4'
        : ext === '.webm'
        ? 'video/webm'
        : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.png'
        ? 'image/png'
        : 'application/octet-stream';

    if (range) {
      const start = range.start;
      const end = range.end !== undefined ? range.end : totalSize - 1;

      if (start >= totalSize) {
        throw new Error(`Requested range [${start}-${end}] exceeds total size ${totalSize}`);
      }

      const contentLength = end - start + 1;
      const stream = fs.createReadStream(fullPath, { start, end });

      return {
        stream,
        contentLength,
        contentType,
        contentRange: `bytes ${start}-${end}/${totalSize}`,
        isPartial: true,
        totalSize
      };
    }

    return {
      stream: fs.createReadStream(fullPath),
      contentLength: totalSize,
      contentType,
      isPartial: false,
      totalSize
    };
  }

  public async exists(storageKey: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(storageKey);
      return fs.existsSync(fullPath);
    } catch {
      return false;
    }
  }

  public async getMetadata(storageKey: string): Promise<StorageFileMetadata> {
    const fullPath = this.resolvePath(storageKey);
    const stat = fs.statSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    return {
      size: stat.size,
      lastModified: stat.mtime,
      mimeType:
        ext === '.mp4'
          ? 'video/mp4'
          : ext === '.webm'
          ? 'video/webm'
          : ext === '.jpg'
          ? 'image/jpeg'
          : 'application/octet-stream'
    };
  }

  public async calculateHash(storageKey: string): Promise<string> {
    const fullPath = this.resolvePath(storageKey);
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(fullPath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }
}
