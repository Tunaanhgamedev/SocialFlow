import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { prisma, VideoStatus, AssetType } from '@socialflow/database';
import { StorageCategory } from '@socialflow/shared';
import { config } from '../config/index.js';
import { getStorageProvider } from './storage/index.js';
import { MetadataService } from './metadata.service.js';
import { VideoValidator } from './video-validator.service.js';

const streamPipeline = promisify(pipeline);

export class VideoDownloaderService {
  private static instance: VideoDownloaderService;
  private storage = getStorageProvider();
  private metadataService = MetadataService.getInstance();

  private constructor() {}

  public static getInstance(): VideoDownloaderService {
    if (!VideoDownloaderService.instance) {
      VideoDownloaderService.instance = new VideoDownloaderService();
    }
    return VideoDownloaderService.instance;
  }

  /**
   * Trích xuất link stream video trực tiếp từ link chia sẻ Douyin
   */
  public async resolveDouyinVideoUrl(shareUrl: string): Promise<{ directUrl?: string; title?: string; author?: string; error?: string }> {
    try {
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      };

      // 1. Theo dõi redirect để lấy URL đầy đủ và video ID
      const response = await fetch(shareUrl, {
        headers,
        redirect: 'follow'
      });

      const finalUrl = response.url;
      const html = await response.text();

      // Trích xuất video ID từ URL (dạng /video/7123456789012345678)
      const idMatch = finalUrl.match(/\/video\/(\d+)/) || html.match(/\/video\/(\d+)/);
      if (!idMatch) {
        return {
          error: 'Không tìm thấy ID video trong link Douyin (Link có thể đã bị xóa hoặc không hợp lệ)'
        };
      }

      const videoId = idMatch[1];

      // 2. Thử truy vấn API chi tiết video của Douyin
      const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`;
      const apiRes = await fetch(apiUrl, { headers });

      if (apiRes.ok) {
        const data: any = await apiRes.json();
        const item = data.item_list?.[0];
        if (item && item.video?.play_addr?.url_list?.length > 0) {
          // Thay thế "playwm" (có watermark) thành "play" (không watermark)
          let playUrl: string = item.video.play_addr.url_list[0];
          playUrl = playUrl.replace('playwm', 'play');

          return {
            directUrl: playUrl,
            title: item.desc || `Douyin Video ${videoId}`,
            author: item.author?.nickname || 'Douyin Creator'
          };
        }
      }

      // 3. Fallback: tìm thẻ <video src="..."> trong HTML
      const videoSrcMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i);
      if (videoSrcMatch && videoSrcMatch[1]) {
        return {
          directUrl: videoSrcMatch[1],
          title: `Douyin Video ${videoId}`
        };
      }

      return {
        error: 'Douyin kích hoạt cơ chế chống quét dữ liệu (Cần cookie/token bảo mật). Vui lòng tải file về máy và dùng nút Tải Lên.'
      };
    } catch (err: any) {
      return {
        error: `Lỗi kết nối tới Douyin: ${err.message}`
      };
    }
  }

  /**
   * Tải video thực tế từ URL (Direct URL hoặc Douyin) và cập nhật database/storage
   */
  public async downloadAndIngest(videoId: string, rawUrl: string): Promise<boolean> {
    const tempFileName = `download_${videoId}_${Date.now()}.mp4`;
    const tempFilePath = path.join(config.storage.tempDir, tempFileName);

    let savedStorageKey: string | null = null;

    try {
      // 1. Cập nhật trạng thái DOWNLOADING
      await prisma.video.update({
        where: { id: videoId },
        data: { status: VideoStatus.DOWNLOADING }
      });

      let downloadUrl = rawUrl;
      const isDouyin = rawUrl.includes('douyin.com');

      if (isDouyin) {
        console.log(`[VideoDownloader] Đang trích xuất link stream từ Douyin: ${rawUrl}`);
        const resolved = await this.resolveDouyinVideoUrl(rawUrl);

        if (!resolved.directUrl) {
          console.warn(`[VideoDownloader] Thất bại khi giải mã link Douyin: ${resolved.error}`);
          await prisma.video.update({
            where: { id: videoId },
            data: {
              status: VideoStatus.FAILED,
              description: `[Lỗi nạp link]: ${resolved.error}`
            }
          });
          return false;
        }

        downloadUrl = resolved.directUrl;
      }

      // 2. Tải luồng video thực tế qua HTTP
      console.log(`[VideoDownloader] Đang tải luồng video từ: ${downloadUrl.slice(0, 80)}...`);
      const fetchRes = await fetch(downloadUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!fetchRes.ok || !fetchRes.body) {
        throw new Error(`Máy chủ nguồn phản hồi mã lỗi HTTP: ${fetchRes.status} ${fetchRes.statusText}`);
      }

      if (!fs.existsSync(config.storage.tempDir)) {
        fs.mkdirSync(config.storage.tempDir, { recursive: true });
      }

      // Pipe luồng mạng vào tệp tạm
      const writeStream = fs.createWriteStream(tempFilePath);
      // @ts-ignore Node 18+ Web ReadableStream to Node stream
      await streamPipeline(fetchRes.body, writeStream);

      // 3. Kiểm tra tính toàn vẹn của tệp đã tải (Magic Bytes & FFprobe)
      const validation = await VideoValidator.validate(tempFilePath);
      if (!validation.isValid) {
        throw new Error(`Tệp tải về không hợp lệ: ${validation.error}`);
      }

      // 4. Tính mã băm SHA-256
      const hash = crypto.createHash('sha256');
      const hashStream = fs.createReadStream(tempFilePath);
      for await (const chunk of hashStream) {
        hash.update(chunk);
      }
      const fileHash = hash.digest('hex');

      // 5. Nạp vào Storage Provider
      const targetFileName = `${Date.now()}_video_${videoId}.mp4`;
      const saved = await this.storage.upload(StorageCategory.ORIGINALS, targetFileName, tempFilePath);
      savedStorageKey = saved.key;

      // 6. Trích xuất metadata & thumbnail
      const localOriginalPath = this.storage.getAbsolutePath(saved.key);
      const meta = await this.metadataService.extractMetadata(localOriginalPath, targetFileName);

      // 7. Cập nhật Video và VideoAsset trong transaction
      await prisma.$transaction(async (tx) => {
        await tx.video.update({
          where: { id: videoId },
          data: {
            status: VideoStatus.DOWNLOADED,
            duration: meta.duration,
            width: meta.width,
            height: meta.height,
            aspectRatio: meta.aspectRatio,
            thumbnailKey: meta.thumbnailKey,
            fileHash,
            storageProvider: this.storage.providerType,
            storageKey: saved.key
          }
        });

        // Tạo VideoAsset Gốc
        await tx.videoAsset.create({
          data: {
            videoId,
            assetType: AssetType.ORIGINAL,
            storageProvider: this.storage.providerType,
            storageKey: saved.key,
            filePath: saved.key,
            fileSizeBytes: BigInt(saved.sizeBytes),
            fileHash,
            mimeType: 'video/mp4',
            metadata: meta as any
          }
        });

        // Tạo VideoAsset Thumbnail nếu có
        if (meta.thumbnailKey) {
          const thumbMeta = await this.storage.getMetadata(meta.thumbnailKey);
          await tx.videoAsset.create({
            data: {
              videoId,
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

      console.log(`[VideoDownloader] Tải và lập chỉ mục video thành công: ${videoId} (${meta.duration || 0}s, ${meta.aspectRatio || '9:16'})`);
      return true;
    } catch (err: any) {
      console.error(`[VideoDownloader] Lỗi trong quá trình tải video ${videoId}:`, err);

      // Đánh dấu FAILED và lưu nguyên nhân cụ thể, không giả lập DOWNLOADED!
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: VideoStatus.FAILED,
          description: `[Lỗi tải file]: ${err.message}`
        }
      }).catch(() => {});

      if (savedStorageKey) {
        await this.storage.delete(savedStorageKey).catch(() => {});
      }

      return false;
    } finally {
      // Dọn dẹp tệp tạm
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch {}
      }
    }
  }
}
