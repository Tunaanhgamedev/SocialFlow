import { Readable } from 'stream';
import {
  StorageCategory,
  StorageProviderType,
  StorageUploadResult,
  StorageStreamResult,
  StorageFileMetadata
} from '@socialflow/shared';
import { IStorageProvider, UploadOptions } from './IStorageProvider.js';

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
 * Giai đoạn tương lai: Khi người dùng chuyển sang Cloud Storage,
 * chỉ cần cấu hình biến môi trường AWS/R2 mà không cần sửa đổi bất kỳ logic nào trong VideoService.
 */
export class CloudStorageProvider implements IStorageProvider {
  public readonly providerType: StorageProviderType;
  private config: CloudStorageConfig;

  constructor(config: CloudStorageConfig) {
    this.providerType = config.provider;
    this.config = config;
  }

  public async upload(
    category: StorageCategory,
    fileName: string,
    data: Buffer | Readable | string,
    options?: UploadOptions
  ): Promise<StorageUploadResult> {
    const storageKey = `${category}/${fileName}`;
    console.log(`[CloudStorageProvider] [S3/R2 STUB] Uploading to bucket ${this.config.bucket}/${storageKey}`);

    // In production with @aws-sdk/client-s3:
    // await s3Client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: storageKey, Body: data, ContentType: options?.contentType }));

    return {
      key: storageKey,
      category,
      fileName,
      sizeBytes: 0,
      hash: 'stub-hash',
      provider: this.providerType,
      url: `${this.config.publicUrlPrefix || 'https://storage.socialflow.local'}/${storageKey}`
    };
  }

  public async delete(storageKey: string): Promise<boolean> {
    console.log(`[CloudStorageProvider] [S3/R2 STUB] Deleting object ${this.config.bucket}/${storageKey}`);
    return true;
  }

  public async getUrl(storageKey: string): Promise<string> {
    if (this.config.publicUrlPrefix) {
      return `${this.config.publicUrlPrefix}/${storageKey}`;
    }
    return `https://${this.config.bucket}.s3.amazonaws.com/${storageKey}`;
  }

  public async getStream(
    storageKey: string,
    range?: { start: number; end?: number }
  ): Promise<StorageStreamResult> {
    throw new Error('Cloud storage streaming requires @aws-sdk/client-s3 GetObjectCommand');
  }

  public async exists(storageKey: string): Promise<boolean> {
    return true;
  }

  public async getMetadata(storageKey: string): Promise<StorageFileMetadata> {
    return {
      size: 0,
      lastModified: new Date()
    };
  }

  public async calculateHash(storageKey: string): Promise<string> {
    return 'cloud-etag-hash';
  }

  public getAbsolutePath(storageKey: string): string {
    throw new Error('Cloud storage provider does not provide local absolute filesystem paths');
  }
}
