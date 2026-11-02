const BASE_URL = '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
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
  getVideos: (params?: { status?: string; search?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.page) q.append('page', params.page.toString());
    return request<any[]>(`/videos?${q.toString()}`);
  },
  getVideo: (id: string) => request<any>(`/videos/${id}`),
  createVideo: (data: any) => request<any>('/videos', { method: 'POST', body: JSON.stringify(data) }),
  generateAI: (id: string, data?: any) => request<any>(`/videos/${id}/generate-content`, { method: 'POST', body: JSON.stringify(data || {}) }),
  approveVideo: (id: string) => request<any>(`/videos/${id}/approve`, { method: 'POST' }),
  rejectVideo: (id: string, reason?: string) => request<any>(`/videos/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  processVideo: (id: string) => request<any>(`/videos/${id}/process`, { method: 'POST' }),
  deleteVideo: (id: string) => request<any>(`/videos/${id}`, { method: 'DELETE' }),

  // Sources
  getSources: () => request<any[]>('/sources'),
  createSource: (data: any) => request<any>('/sources', { method: 'POST', body: JSON.stringify(data) }),
  deleteSource: (id: string) => request<any>(`/sources/${id}`, { method: 'DELETE' }),
  importDouyin: (data: { url: string; title?: string; rightsStatus?: string; licenseNote?: string }) =>
    request<any>('/sources/douyin/import', { method: 'POST', body: JSON.stringify(data) }),

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
