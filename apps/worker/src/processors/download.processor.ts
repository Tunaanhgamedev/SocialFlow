import { Job } from 'bullmq';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { exec } from 'child_process';
import { prisma, VideoStatus, AssetType, StorageProviderType } from '@socialflow/database';

const streamPipeline = promisify(pipeline);
const execAsync = promisify(exec);

export async function processDownloadJob(job: Job): Promise<void> {
  const { videoId, url } = job.data;
  console.log(`[Worker - Download] Bắt đầu tải video ${videoId} từ URL: ${url}`);

  const storageRoot = path.resolve(process.cwd(), '../../storage');
  const tempDir = path.join(storageRoot, 'temp');
  const originalsDir = path.join(storageRoot, 'originals');
  const thumbnailsDir = path.join(storageRoot, 'thumbnails');

  for (const dir of [tempDir, originalsDir, thumbnailsDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `worker_dl_${videoId}_${Date.now()}.mp4`);
  let savedStorageKey: string | null = null;

  try {
    await prisma.video.update({
      where: { id: videoId },
      data: { status: VideoStatus.DOWNLOADING }
    });

    let downloadUrl = url;

    // Phân tích Douyin URL nếu có
    if (url.includes('douyin.com')) {
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      };

      const redirectRes = await fetch(url, { headers, redirect: 'follow' });
      const finalUrl = redirectRes.url;
      const html = await redirectRes.text();

      const idMatch = finalUrl.match(/\/video\/(\d+)/) || html.match(/\/video\/(\d+)/);
      if (idMatch) {
        const dId = idMatch[1];
        const apiRes = await fetch(`https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${dId}`, { headers });
        if (apiRes.ok) {
          const json: any = await apiRes.json();
          const item = json.item_list?.[0];
          if (item?.video?.play_addr?.url_list?.length > 0) {
            downloadUrl = item.video.play_addr.url_list[0].replace('playwm', 'play');
          }
        }
      }
    }

    // Tải luồng video
    console.log(`[Worker - Download] Tải luồng dữ liệu từ: ${downloadUrl.slice(0, 80)}...`);
    const fetchRes = await fetch(downloadUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!fetchRes.ok || !fetchRes.body) {
      throw new Error(`Máy chủ nguồn báo lỗi HTTP ${fetchRes.status}: ${fetchRes.statusText}`);
    }

    const writeStream = fs.createWriteStream(tempFilePath);
    // @ts-ignore
    await streamPipeline(fetchRes.body, writeStream);

    // Kiểm tra dung lượng
    const stat = fs.statSync(tempFilePath);
    if (stat.size < 100) {
      throw new Error('Dữ liệu tải về quá nhỏ hoặc không phải video hợp lệ');
    }

    // Tính mã băm SHA-256
    const hash = crypto.createHash('sha256');
    const hashStream = fs.createReadStream(tempFilePath);
    for await (const chunk of hashStream) {
      hash.update(chunk);
    }
    const fileHash = hash.digest('hex');

    // Di chuyển vào originals
    const targetFileName = `${Date.now()}_video_${videoId}.mp4`;
    const targetFilePath = path.join(originalsDir, targetFileName);
    fs.copyFileSync(tempFilePath, targetFilePath);
    savedStorageKey = `originals/${targetFileName}`;

    // Trích xuất metadata bằng ffprobe
    let duration = 0;
    let width = 1080;
    let height = 1920;
    let aspectRatio = '9:16';

    try {
      const probeCmd = `ffprobe -v error -show_entries format=duration:stream=width,height -of json "${targetFilePath}"`;
      const { stdout } = await execAsync(probeCmd);
      const parsed = JSON.parse(stdout);
      if (parsed.format?.duration) duration = parseFloat(parsed.format.duration);
      if (parsed.streams?.[0]?.width) width = parsed.streams[0].width;
      if (parsed.streams?.[0]?.height) height = parsed.streams[0].height;
      if (width && height) {
        aspectRatio = Math.abs(width / height - 9 / 16) < 0.08 ? '9:16' : `${width}:${height}`;
      }
    } catch (e: any) {
      console.warn(`[Worker - Download] Warning ffprobe:`, e.message);
    }

    // Tạo thumbnail bằng ffmpeg
    const thumbName = `thumb_${videoId}.jpg`;
    const thumbPath = path.join(thumbnailsDir, thumbName);
    const thumbKey = `thumbnails/${thumbName}`;
    try {
      const thumbCmd = `ffmpeg -y -ss ${duration > 2 ? 1 : 0} -i "${targetFilePath}" -vframes 1 -q:v 2 "${thumbPath}"`;
      await execAsync(thumbCmd);
    } catch {}

    // Cập nhật database trong transaction
    await prisma.$transaction(async (tx) => {
      await tx.video.update({
        where: { id: videoId },
        data: {
          status: VideoStatus.DOWNLOADED,
          duration,
          width,
          height,
          aspectRatio,
          thumbnailKey: fs.existsSync(thumbPath) ? thumbKey : undefined,
          fileHash,
          storageProvider: StorageProviderType.LOCAL,
          storageKey: savedStorageKey
        }
      });

      await tx.videoAsset.create({
        data: {
          videoId,
          assetType: AssetType.ORIGINAL,
          storageProvider: StorageProviderType.LOCAL,
          storageKey: savedStorageKey!,
          filePath: savedStorageKey!,
          fileSizeBytes: BigInt(stat.size),
          fileHash,
          mimeType: 'video/mp4'
        }
      });

      if (fs.existsSync(thumbPath)) {
        const thumbStat = fs.statSync(thumbPath);
        await tx.videoAsset.create({
          data: {
            videoId,
            assetType: AssetType.THUMBNAIL,
            storageProvider: StorageProviderType.LOCAL,
            storageKey: thumbKey,
            filePath: thumbKey,
            fileSizeBytes: BigInt(thumbStat.size),
            mimeType: 'image/jpeg'
          }
        });
      }
    });

    console.log(`[Worker - Download] Hoàn thành tải và xác thực video ${videoId} (${duration}s, ${aspectRatio})`);
  } catch (err: any) {
    console.error(`[Worker - Download] Lỗi tải video ${videoId}:`, err.message);

    // Đánh dấu FAILED với nguyên nhân rõ ràng, KHÔNG giả lập DOWNLOADED!
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: VideoStatus.FAILED,
        description: `[Lỗi tải file]: ${err.message}`
      }
    }).catch(() => {});

    if (savedStorageKey) {
      const p = path.join(storageRoot, savedStorageKey);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }
    throw err;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }
  }
}
