import fs from 'fs';
import path from 'path';
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
      config.storage.rawDir,
      config.storage.processedDir,
      config.storage.thumbnailsDir
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  public saveRawVideo(fileName: string, buffer: Buffer): { filePath: string; sizeBytes: number } {
    this.ensureDirectories();
    const filePath = path.join(config.storage.rawDir, fileName);
    fs.writeFileSync(filePath, buffer);
    const stats = fs.statSync(filePath);
    return { filePath, sizeBytes: stats.size };
  }

  public getRawVideoPath(fileName: string): string {
    return path.join(config.storage.rawDir, fileName);
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
      fs.unlinkSync(filePath);
      return true;
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
