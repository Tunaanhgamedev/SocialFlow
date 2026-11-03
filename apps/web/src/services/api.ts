const BASE_URL = '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};

  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || 'Yêu cầu máy chủ thất bại');
  }

  return json.data;
}

export const api = {
  // Health
  getHealth: () => request<any>('/health'),

  // Analytics
  getOverview: () => request<any>('/analytics/overview'),

  // Videos
  getVideos: (params?: {
    status?: string;
    rightsStatus?: string;
    sourceType?: string;
    search?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.rightsStatus) q.append('rightsStatus', params.rightsStatus);
    if (params?.sourceType) q.append('sourceType', params.sourceType);
    if (params?.search) q.append('search', params.search);
    if (params?.sortBy) q.append('sortBy', params.sortBy);
    if (params?.page) q.append('page', params.page.toString());
    if (params?.limit) q.append('limit', params.limit.toString());
    return request<any[]>(`/videos?${q.toString()}`);
  },
  getVideo: (id: string) => request<any>(`/videos/${id}`),
  getVideoStreamUrl: (id: string) => `${BASE_URL}/videos/${id}/stream`,
  getThumbnailUrl: (id: string) => `${BASE_URL}/videos/${id}/thumbnail`,
  createVideo: (data: any) => request<any>('/videos', { method: 'POST', body: JSON.stringify(data) }),
  uploadVideos: (formData: FormData) => request<any>('/videos/upload', { method: 'POST', body: formData }),
  generateAI: (id: string, data?: any) => request<any>(`/videos/${id}/generate-content`, { method: 'POST', body: JSON.stringify(data || {}) }),
  approveVideo: (id: string) => request<any>(`/videos/${id}/approve`, { method: 'POST' }),
  rejectVideo: (id: string, reason?: string) => request<any>(`/videos/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  processVideo: (id: string) => request<any>(`/videos/${id}/process`, { method: 'POST' }),
  deleteVideo: (id: string) => request<any>(`/videos/${id}`, { method: 'DELETE' }),

  // Rights Management
  getRights: (videoId: string) => request<any>(`/rights/${videoId}`),
  updateRights: (videoId: string, data: {
    rightsStatus: string;
    licenseDocument?: string;
    evidence?: string;
    notes?: string;
    authorConsent?: boolean;
  }) => request<any>(`/rights/${videoId}`, { method: 'POST', body: JSON.stringify(data) }),

  // Sources
  getSources: () => request<any[]>('/sources'),
  createSource: (data: any) => request<any>('/sources', { method: 'POST', body: JSON.stringify(data) }),
  deleteSource: (id: string) => request<any>(`/sources/${id}`, { method: 'DELETE' }),
  importDouyin: (data: {
    url: string;
    title?: string;
    rightsStatus?: string;
    licenseNote?: string;
    authorConsent?: boolean;
  }) => request<any>('/sources/import', { method: 'POST', body: JSON.stringify(data) }),

  // Folder Watcher & Sync
  watchFolder: (data: { folderPath: string; autoIngest?: boolean }) =>
    request<any>('/folders/watch', { method: 'POST', body: JSON.stringify(data) }),
  unwatchFolder: (folderPath: string) =>
    request<any>('/folders/unwatch', { method: 'POST', body: JSON.stringify({ folderPath }) }),
  scanFolder: (folderPath: string) =>
    request<any>('/folders/scan', { method: 'POST', body: JSON.stringify({ folderPath }) }),
  getFolderWatchers: () => request<any[]>('/folders/status'),

  // Accounts
  getAccounts: () => request<any[]>('/accounts'),
  createAccount: (data: any) => request<any>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  deleteAccount: (id: string) => request<any>(`/accounts/${id}`, { method: 'DELETE' }),

  // Publishing
  scheduleJobs: (data: { videoId: string; campaignId?: string; targets: any[] }) =>
    request<any>('/publishing/schedule', { method: 'POST', body: JSON.stringify(data) }),
  getPublishingJobs: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return request<any[]>(`/publishing/jobs${q}`);
  },
  confirmManualPublish: (id: string, publishedUrl?: string) =>
    request<any>(`/publishing/jobs/${id}/confirm`, { method: 'POST', body: JSON.stringify({ publishedUrl }) }),
  cancelJob: (id: string) => request<any>(`/publishing/jobs/${id}/cancel`, { method: 'POST' }),
  retryJob: (id: string) => request<any>(`/publishing/jobs/${id}/retry`, { method: 'POST' }),

  // Campaigns
  getCampaigns: () => request<any[]>('/campaigns'),
  createCampaign: (data: any) => request<any>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
};
