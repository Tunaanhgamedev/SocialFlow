import { z } from 'zod';
import { SourceType, PlatformType, RightsStatus } from '../enums/index.js';

export const importDouyinSchema = z.object({
  url: z.string().url({ message: 'URL không hợp lệ' }),
  title: z.string().min(1, { message: 'Tiêu đề không được để trống' }).optional(),
  rightsStatus: z.nativeEnum(RightsStatus).default(RightsStatus.AUTHORIZED),
  licenseNote: z.string().optional()
});

export const createSourceSchema = z.object({
  sourceType: z.nativeEnum(SourceType),
  sourceName: z.string().min(1, { message: 'Tên nguồn không được để trống' }),
  sourceUrl: z.string().url().optional(),
  configuration: z.record(z.any()).optional()
});

export const generateContentSchema = z.object({
  videoId: z.string().uuid(),
  platform: z.nativeEnum(PlatformType).default(PlatformType.FACEBOOK),
  language: z.enum(['vi', 'en']).default('vi'),
  tone: z.string().default('engaging'),
  includeHashtags: z.boolean().default(true),
  customPrompt: z.string().optional()
});

export const schedulePublishingSchema = z.object({
  videoId: z.string().uuid(),
  targets: z.array(
    z.object({
      accountId: z.string().uuid(),
      contentId: z.string().uuid().optional(),
      scheduledAt: z.string().datetime({ message: 'Thời gian đăng không đúng định dạng ISO 8601' })
    })
  ).min(1, { message: 'Cần chọn ít nhất một kênh đích' })
});

export const updateRightsSchema = z.object({
  rightsStatus: z.nativeEnum(RightsStatus),
  licenseDocument: z.string().optional(),
  evidence: z.string().optional(),
  notes: z.string().optional(),
  authorConsent: z.boolean().default(false)
});

export const folderWatchSchema = z.object({
  folderPath: z.string().min(1, { message: 'Đường dẫn thư mục không được để trống' }),
  autoIngest: z.boolean().default(true)
});

export type ImportDouyinInput = z.infer<typeof importDouyinSchema>;
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type GenerateContentInput = z.infer<typeof generateContentSchema>;
export type SchedulePublishingInput = z.infer<typeof schedulePublishingSchema>;
export type UpdateRightsInput = z.infer<typeof updateRightsSchema>;
export type FolderWatchInput = z.infer<typeof folderWatchSchema>;
