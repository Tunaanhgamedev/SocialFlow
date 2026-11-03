import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export interface VideoValidationResult {
  isValid: boolean;
  format?: string;
  error?: string;
}

export class VideoValidator {
  /**
   * Kiểm tra tính toàn vẹn và định dạng video thực tế bằng Magic Bytes và FFprobe
   */
  public static async validate(filePath: string): Promise<VideoValidationResult> {
    if (!fs.existsSync(filePath)) {
      return { isValid: false, error: 'Tệp không tồn tại' };
    }

    const stat = fs.statSync(filePath);
    if (stat.size < 64) {
      return { isValid: false, error: 'Dung lượng tệp quá nhỏ, không phải là video hợp lệ' };
    }

    // 1. Kiểm tra Magic Bytes (32 byte đầu tiên)
    const buffer = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 32, 0);
    fs.closeSync(fd);

    let detectedFormat: string | undefined;

    // MP4 / MOV: offset 4 là 'ftyp' hoặc offset 4 là 'moov' / 'wide'
    const ftyp = buffer.toString('ascii', 4, 8);
    // WebM / MKV: 0x1A, 0x45, 0xDF, 0xA3 ở đầu tệp
    const isEbml = buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;

    if (ftyp === 'ftyp' || ftyp === 'moov' || ftyp === 'wide') {
      detectedFormat = 'mp4';
    } else if (isEbml) {
      detectedFormat = 'webm';
    } else {
      return {
        isValid: false,
        error: 'Chữ ký tệp (Magic Bytes) không hợp lệ. Chỉ chấp nhận video thực MP4, MOV, WebM, MKV.'
      };
    }

    // 2. Kiểm tra luồng video thực tế qua FFprobe
    try {
      const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of json "${filePath}"`;
      const { stdout } = await execAsync(probeCmd);
      const parsed = JSON.parse(stdout);

      if (!parsed.streams || parsed.streams.length === 0) {
        return {
          isValid: false,
          error: 'Tệp không chứa luồng hình ảnh video (video stream) hợp lệ.'
        };
      }

      return { isValid: true, format: detectedFormat };
    } catch (err: any) {
      return {
        isValid: false,
        error: `Tệp video bị hỏng hoặc định dạng không được hỗ trợ bởi bộ giải mã: ${err.message}`
      };
    }
  }
}
