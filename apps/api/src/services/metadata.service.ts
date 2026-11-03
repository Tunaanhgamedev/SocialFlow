import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';
import { LocalStorageService } from './storage/LocalStorageService.js';

const execAsync = util.promisify(exec);

export interface ExtractedVideoMetadata {
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  format?: string;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
  hasAudio?: boolean;
  fps?: number;
  thumbnailKey?: string;
  thumbnailPath?: string;
}

export class MetadataService {
  private static instance: MetadataService;
  private ffprobeBinary = 'ffprobe';
  private ffmpegBinary = 'ffmpeg';

  private constructor() {
    if (config.storage.localRoot) {
      // Local check
    }
  }

  public static getInstance(): MetadataService {
    if (!MetadataService.instance) {
      MetadataService.instance = new MetadataService();
    }
    return MetadataService.instance;
  }

  public async extractMetadata(videoFilePath: string, videoId: string): Promise<ExtractedVideoMetadata> {
    const result: ExtractedVideoMetadata = {
      format: path.extname(videoFilePath).replace('.', '').toLowerCase(),
      hasAudio: false
    };

    try {
      // 1. Probe video with ffprobe
      const cmd = `"${this.ffprobeBinary}" -v error -show_entries format=duration,size,bit_rate:stream=width,height,codec_name,codec_type,r_frame_rate -of json "${videoFilePath}"`;
      const { stdout } = await execAsync(cmd);
      const parsed = JSON.parse(stdout);

      if (parsed.format?.duration) {
        result.duration = parseFloat(parsed.format.duration);
      }
      if (parsed.format?.bit_rate) {
        result.bitrate = parseInt(parsed.format.bit_rate, 10);
      }

      const streams = parsed.streams || [];
      const videoStream = streams.find((s: any) => s.codec_type === 'video');
      const audioStream = streams.find((s: any) => s.codec_type === 'audio');

      if (videoStream) {
        result.width = videoStream.width;
        result.height = videoStream.height;
        result.videoCodec = videoStream.codec_name;

        if (videoStream.width && videoStream.height) {
          const ratio = videoStream.width / videoStream.height;
          if (Math.abs(ratio - 9 / 16) < 0.08) {
            result.aspectRatio = '9:16';
          } else if (Math.abs(ratio - 16 / 9) < 0.08) {
            result.aspectRatio = '16:9';
          } else if (Math.abs(ratio - 1) < 0.05) {
            result.aspectRatio = '1:1';
          } else {
            result.aspectRatio = `${videoStream.width}:${videoStream.height}`;
          }
        }

        if (videoStream.r_frame_rate) {
          const parts = videoStream.r_frame_rate.split('/');
          if (parts.length === 2 && parseInt(parts[1], 10) > 0) {
            result.fps = Math.round(parseInt(parts[0], 10) / parseInt(parts[1], 10));
          }
        }
      }

      if (audioStream) {
        result.hasAudio = true;
        result.audioCodec = audioStream.codec_name;
      }
    } catch (err: any) {
      console.warn(`[MetadataService] Warning: ffprobe scan failed for ${videoFilePath}:`, err.message);
      // Fallback: estimate from file stats
      try {
        const stats = fs.statSync(videoFilePath);
        result.duration = Math.max(1, Math.round(stats.size / (500 * 1024))); // crude fallback
        result.aspectRatio = '9:16';
        result.width = 1080;
        result.height = 1920;
      } catch {
        // ignore
      }
    }

    // 2. Generate thumbnail screenshot with ffmpeg
    try {
      const storageService = LocalStorageService.getInstance();
      storageService.ensureDirectories();

      const thumbnailFileName = `thumb_${videoId}.jpg`;
      const thumbnailFullPath = path.join(config.storage.thumbnailsDir, thumbnailFileName);

      const seekSec = result.duration && result.duration > 2 ? 1 : 0;
      const ffmpegCmd = `"${this.ffmpegBinary}" -y -ss ${seekSec} -i "${videoFilePath}" -vframes 1 -q:v 2 "${thumbnailFullPath}"`;

      await execAsync(ffmpegCmd);

      if (fs.existsSync(thumbnailFullPath)) {
        result.thumbnailPath = thumbnailFullPath;
        result.thumbnailKey = `thumbnails/${thumbnailFileName}`;
      }
    } catch (err: any) {
      console.warn(`[MetadataService] Thumbnail generation warning:`, err.message);
    }

    return result;
  }
}
