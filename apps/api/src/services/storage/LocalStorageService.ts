import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import {
  StorageCategory,
  StorageProviderType,
  StorageUploadResult,
  StorageStreamResult,
  StorageFileMetadata
} from '@socialflow/shared';
import { config } from '../../config/index.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { IStorageProvider } from './IStorageProvider.js';

export class LocalStorageService implements IStorageProvider {
  private static instance: LocalStorageService;
  private provider: LocalStorageProvider;
  public readonly providerType = StorageProviderType.LOCAL;

  private constructor() {
    this.provider = new LocalStorageProvider();
    this.ensureDirectories();
  }

  public static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  public ensureDirectories(): void {
    const dirs = [
      config.storage.localRoot,
      config.storage.originalsDir,
      config.storage.rawDir,
      config.storage.processedDir,
      config.storage.thumbnailsDir,
      config.storage.tempDir
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  public async upload(
    category: StorageCategory,
    fileName: string,
    data: Buffer | Readable | string
  ): Promise<StorageUploadResult> {
    return this.provider.upload(category, fileName, data);
  }

  public async delete(storageKey: string): Promise<boolean> {
    return this.provider.delete(storageKey);
  }

  public async getUrl(storageKey: string): Promise<string> {
    return this.provider.getUrl(storageKey);
  }

  public async getStream(
    storageKey: string,
    range?: { start: number; end?: number }
  ): Promise<StorageStreamResult> {
    return this.provider.getStream(storageKey, range);
  }

  public async exists(storageKey: string): Promise<boolean> {
    return this.provider.exists(storageKey);
  }

  public async getMetadata(storageKey: string): Promise<StorageFileMetadata> {
    return this.provider.getMetadata(storageKey);
  }

  public async calculateHash(storageKey: string): Promise<string> {
    return this.provider.calculateHash(storageKey);
  }

  public getAbsolutePath(storageKey: string): string {
    return this.provider.getAbsolutePath(storageKey);
  }

  public getStorageStats(): {
    provider: StorageProviderType;
    root: string;
    categories: {
      originals: number;
      processed: number;
      thumbnails: number;
      temp: number;
    };
  } {
    const getCount = (dir: string) => {
      try {
        if (!fs.existsSync(dir)) return 0;
        return fs.readdirSync(dir).filter((f) => !f.startsWith('.')).length;
      } catch {
        return 0;
      }
    };

    return {
      provider: this.providerType,
      root: config.storage.localRoot,
      categories: {
        originals: getCount(config.storage.originalsDir),
        processed: getCount(config.storage.processedDir),
        thumbnails: getCount(config.storage.thumbnailsDir),
        temp: getCount(config.storage.tempDir)
      }
    };
  }

  // Legacy helper methods for backward compatibility
  public async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  public async moveFileToOriginals(
    tempFilePath: string,
    targetFileName: string
  ): Promise<{ storageKey: string; filePath: string; sizeBytes: number; hash: string }> {
    const result = await this.provider.upload(StorageCategory.ORIGINALS, targetFileName, tempFilePath);
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch {}
    return {
      storageKey: result.key,
      filePath: this.provider.getAbsolutePath(result.key),
      sizeBytes: result.sizeBytes,
      hash: result.hash
    };
  }

  public deleteFile(targetPath: string): boolean {
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
