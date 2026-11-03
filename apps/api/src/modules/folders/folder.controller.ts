import { Request, Response } from 'express';
import { FolderWatcherService } from '../../services/folder-watcher.service.js';
import { folderWatchSchema } from '@socialflow/shared';

const watcherService = FolderWatcherService.getInstance();

export async function watchFolder(req: Request, res: Response): Promise<void> {
  const validated = folderWatchSchema.parse(req.body);

  const info = await watcherService.watchFolder(validated.folderPath, validated.autoIngest);

  res.status(200).json({
    success: true,
    data: info,
    message: `Đang theo dõi thư mục: ${info.folderPath}`
  });
}

export async function unwatchFolder(req: Request, res: Response): Promise<void> {
  const { folderPath } = req.body;
  if (!folderPath) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'folderPath là bắt buộc' } });
    return;
  }

  const stopped = await watcherService.unwatchFolder(folderPath);

  res.json({
    success: true,
    data: { stopped },
    message: stopped ? 'Đã dừng theo dõi thư mục' : 'Thư mục chưa được theo dõi trước đó'
  });
}

export async function scanFolder(req: Request, res: Response): Promise<void> {
  const { folderPath } = req.body;
  if (!folderPath) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'folderPath là bắt buộc' } });
    return;
  }

  const result = await watcherService.scanFolderImmediate(folderPath);

  res.json({
    success: true,
    data: result,
    message: `Quét hoàn tất: Tìm thấy ${result.totalScanned} tệp video, tiếp nhận mới ${result.ingestedCount} video`
  });
}

export async function getWatchersStatus(_req: Request, res: Response): Promise<void> {
  const list = watcherService.getActiveWatchers();
  res.json({ success: true, data: list });
}
