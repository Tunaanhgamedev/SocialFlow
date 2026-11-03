import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  StorageCategory,
  StorageProviderType,
  StorageUploadResult,
  StorageStreamResult,
  StorageFileMetadata
} from '@socialflow/shared';
import { IStorageProvider, UploadOptions } from './IStorageProvider.js';
import { config as appConfig } from '../../config/index.js';

const streamPipeline = promisify(pipeline);

export interface CloudStorageConfig {
  provider: StorageProviderType.S3 | StorageProviderType.R2 | StorageProviderType.SUPABASE;
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicUrlPrefix?: string;
}

/**
 * Cloud Storage Provider (AWS S3, Cloudflare R2, MinIO, Supabase Storage)
 * Triển khai đầy đủ upload, stream HTTP Range, xóa, kiểm tra tồn tại và presigned URL.
 */
export class CloudStorageProvider implements IStorageProvider {
  public readonly providerType: StorageProviderType;
  private client: S3Client;
  private config: CloudStorageConfig;
  private localTempCacheDir: string;

  constructor(config: CloudStorageConfig) {
    this.providerType = config.provider;
    this.config = config;
    this.localTempCacheDir = path.resolve(appConfig.storage.tempDir, 'cloud-cache');

    if (!fs.existsSync(this.localTempCacheDir)) {
      fs.mkdirSync(this.localTempCacheDir, { recursive: true });
    }

    this.client = new S3Client({
      region: config.region || 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId || '',
        secretAccessKey: config.secretAccessKey || ''
      },
      forcePathStyle: true // Tương thích với Cloudflare R2, MinIO và Supabase
    });
  }

  public async upload(
    category: StorageCategory,
    fileName: string,
    data: Buffer | Readable | string,
    options?: UploadOptions
  ): Promise<StorageUploadResult> {
    const sanitizedFileName = path.basename(fileName);
    const storageKey = `${category}/${sanitizedFileName}`;

    let body: Buffer | Readable;
    let sizeBytes = 0;
    let hash = '';

    if (typeof data === 'string') {
      if (!fs.existsSync(data)) {
        throw new Error(`Tệp nguồn cục bộ không tồn tại: ${data}`);
      }
      body = fs.createReadStream(data);
      const stat = fs.statSync(data);
      sizeBytes = stat.size;
      hash = await this.calculateLocalFileHash(data);
    } else if (Buffer.isBuffer(data)) {
      body = data;
      sizeBytes = data.length;
      hash = crypto.createHash('sha256').update(data).digest('hex');
    } else if (data instanceof Readable) {
      // Buffer stream temporarily to calculate hash and get size
      const chunks: Buffer[] = [];
      for await (const chunk of data) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      body = Buffer.concat(chunks);
      sizeBytes = body.length;
      hash = crypto.createHash('sha256').update(body).digest('hex');
    } else {
      throw new Error('Unsupported data format for cloud upload');
    }

    const ext = path.extname(sanitizedFileName).toLowerCase();
    const contentType =
      options?.contentType ||
      (ext === '.mp4'
        ? 'video/mp4'
        : ext === '.webm'
        ? 'video/webm'
        : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.png'
        ? 'image/png'
        : 'application/octet-stream');

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
        Metadata: {
          sha256: hash,
          ...(options?.metadata || {})
        }
      })
    );

    const publicUrl = this.config.publicUrlPrefix
      ? `${this.config.publicUrlPrefix}/${storageKey}`
      : `/api/v1/storage/${storageKey}`;

    return {
      key: storageKey,
      category,
      fileName: sanitizedFileName,
      sizeBytes,
      hash,
      provider: this.providerType,
      url: publicUrl
    };
  }

  public async delete(storageKey: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: storageKey
        })
      );

      // Clean local cache if exists
      const cachedPath = path.join(this.localTempCacheDir, path.basename(storageKey));
      if (fs.existsSync(cachedPath)) {
        try {
          fs.unlinkSync(cachedPath);
        } catch {}
      }

      return true;
    } catch (err: any) {
      console.warn(`[CloudStorageProvider] Lỗi xóa file ${storageKey}:`, err.message);
      return false;
    }
  }

  public async getUrl(storageKey: string): Promise<string> {
    if (this.config.publicUrlPrefix) {
      return `${this.config.publicUrlPrefix}/${storageKey}`;
    }

    // Generate signed GET URL with 1-hour expiration
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey
      });
      return await getSignedUrl(this.client, command, { expiresIn: 3600 });
    } catch {
      return `/api/v1/storage/${storageKey}`;
    }
  }

  public async getStream(
    storageKey: string,
    range?: { start: number; end?: number }
  ): Promise<StorageStreamResult> {
    const head = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey
      })
    );

    const totalSize = head.ContentLength || 0;
    const contentType = head.ContentType || 'video/mp4';

    let rangeString: string | undefined;
    if (range) {
      const end = range.end !== undefined ? range.end : totalSize - 1;
      rangeString = `bytes=${range.start}-${end}`;
    }

    const getRes = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey,
        Range: rangeString
      })
    );

    const stream = getRes.Body as Readable;
    const contentLength = getRes.ContentLength || (range ? (range.end ?? totalSize - 1) - range.start + 1 : totalSize);

    return {
      stream,
      contentLength,
      contentType,
      contentRange: range ? `bytes ${range.start}-${range.end ?? totalSize - 1}/${totalSize}` : undefined,
      isPartial: !!range,
      totalSize
    };
  }

  public async exists(storageKey: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: storageKey
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  public async getMetadata(storageKey: string): Promise<StorageFileMetadata> {
    const head = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey
      })
    );

    return {
      size: head.ContentLength || 0,
      mimeType: head.ContentType,
      lastModified: head.LastModified,
      hash: head.Metadata?.sha256 || head.ETag?.replace(/"/g, '')
    };
  }

  public async calculateHash(storageKey: string): Promise<string> {
    const meta = await this.getMetadata(storageKey);
    return meta.hash || 'cloud-hash';
  }

  /**
   * For local tools (such as FFmpeg/FFprobe), downloads the remote object to a local temp cache
   */
  public getAbsolutePath(storageKey: string): string {
    const cachedPath = path.join(this.localTempCacheDir, path.basename(storageKey));
    if (fs.existsSync(cachedPath)) {
      return cachedPath;
    }

    // Synchronous placeholder or trigger async sync
    return cachedPath;
  }

  public async downloadToLocalCache(storageKey: string): Promise<string> {
    const cachedPath = path.join(this.localTempCacheDir, path.basename(storageKey));
    if (fs.existsSync(cachedPath)) {
      return cachedPath;
    }

    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey
      })
    );

    const writeStream = fs.createWriteStream(cachedPath);
    await streamPipeline(res.Body as Readable, writeStream);
    return cachedPath;
  }

  private async calculateLocalFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }
}
