import { Request, Response } from 'express';
import { RightsService } from './rights.service.js';
import { updateRightsSchema } from '@socialflow/shared';

const rightsService = RightsService.getInstance();

export async function getRights(req: Request, res: Response): Promise<void> {
  const { videoId } = req.params;
  const rights = await rightsService.getRightsByVideoId(videoId);

  if (!rights) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Chưa có thông tin bản quyền cho video này' }
    });
    return;
  }

  res.json({ success: true, data: rights });
}

export async function updateRights(req: Request, res: Response): Promise<void> {
  const { videoId } = req.params;
  const validated = updateRightsSchema.parse(req.body);

  const updated = await rightsService.updateRights(videoId, validated);

  res.json({
    success: true,
    data: updated,
    message: 'Cập nhật quyền sử dụng video thành công'
  });
}
