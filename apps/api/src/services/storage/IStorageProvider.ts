import { Readable } from 'stream';
import {
  StorageCategory,
  StorageProviderType,
  StorageUploadResult,
  StorageStreamResult,
  StorageFileMetadata
} from '@socialflow/shared';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, any>;
}

export interface IStorageProvider {
  readonly providerType: StorageProviderType;

  /**
   * Uploads a file or stream into a designated category
   * @param category originals | processed | thumbnails | temp
   * @param fileName desired file name
   * @param data Buffer, Readable stream, or local file path
   * @returns StorageUploadResult containing normalized storageKey
   */
  upload(
    category: StorageCategory,
    fileName: string,
    data: Buffer | Readable | string,
    options?: UploadOptions
  ): Promise<StorageUploadResult>;

  /**
   * Deletes a file by its storage key (e.g. "originals/123_video.mp4")
   */
  delete(storageKey: string): Promise<boolean>;

  /**
   * Gets the public or API access URL for the storage key
   */
  getUrl(storageKey: string): Promise<string>;

  /**
   * Gets a readable stream with optional HTTP Range support (for video playback & streaming)
   */
  getStream(storageKey: string, range?: { start: number; end?: number }): Promise<StorageStreamResult>;

  /**
   * Checks whether the given storage key exists
   */
  exists(storageKey: string): Promise<boolean>;

  /**
   * Retrieves file size, mimeType, and last modified timestamp
   */
  getMetadata(storageKey: string): Promise<StorageFileMetadata>;

  /**
   * Calculates SHA-256 hash of the stored file for deduplication
   */
  calculateHash(storageKey: string): Promise<string>;

  /**
   * Returns absolute filesystem path on local disk (for FFmpeg/FFprobe operations)
   */
  getAbsolutePath(storageKey: string): string;
}
