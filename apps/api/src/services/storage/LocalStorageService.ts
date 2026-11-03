import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../../config/index.js';

export class LocalStorageService {
  private static instance: LocalStorageService;

  private constructor() {
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

  public async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  public saveRawVideo(fileName: string, buffer: Buffer): { filePath: string; sizeBytes: number; hash: string } {
    this.ensureDirectories();
    const filePath = path.join(config.storage.originalsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    const stats = fs.statSync(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return { filePath, sizeBytes: stats.size, hash };
  }

  public async moveFileToOriginals(
    tempFilePath: string,
    targetFileName: string
  ): Promise<{ filePath: string; sizeBytes: number; hash: string }> {
    this.ensureDirectories();
    const destinationPath = path.join(config.storage.originalsDir, targetFileName);

    // Calculate hash before or after copy
    const hash = await this.calculateFileHash(tempFilePath);

    // Move or copy
    fs.copyFileSync(tempFilePath, destinationPath);
    try {
      fs.unlinkSync(tempFilePath);
    } catch {
      // ignore temp cleanup error
    }

    const stats = fs.statSync(destinationPath);
    return {
      filePath: destinationPath,
      sizeBytes: stats.size,
      hash
    };
  }

  public getOriginalVideoPath(fileName: string): string {
    return path.join(config.storage.originalsDir, fileName);
  }

  public getRawVideoPath(fileName: string): string {
    return path.join(config.storage.originalsDir, fileName);
  }

  public getProcessedVideoPath(fileName: string): string {
    return path.join(config.storage.processedDir, fileName);
  }

  public getThumbnailPath(fileName: string): string {
    return path.join(config.storage.thumbnailsDir, fileName);
  }

  public fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  public deleteFile(filePath: string): boolean {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch (err) {
        console.error('Error deleting file:', filePath, err);
        return false;
      }
    }
    return false;
  }

  public getStorageStats(): { totalFiles: number; sizeBytes: number } {
    this.ensureDirectories();
    let totalFiles = 0;
    let sizeBytes = 0;

    const countDir = (dirPath: string) => {
      if (!fs.existsSync(dirPath)) return;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isFile() && !entry.name.startsWith('.')) {
          totalFiles++;
          sizeBytes += fs.statSync(fullPath).size;
        } else if (entry.isDirectory()) {
          countDir(fullPath);
        }
      }
    };

    countDir(config.storage.localRoot);
    return { totalFiles, sizeBytes };
  }
}
