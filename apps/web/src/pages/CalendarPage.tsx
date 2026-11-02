import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export const CalendarPage: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await api.getPublishingJobs(statusFilter === 'ALL' ? undefined : statusFilter);
      setJobs(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [statusFilter]);

  const handleConfirmManual = async (jobId: string) => {
    const url = prompt('Nhập đường dẫn bài đăng Reels Facebook (tùy chọn):', 'https://facebook.com/reel/123456');
    if (url === null) return;
    try {
      await api.confirmManualPublish(jobId, url);
      await loadJobs();
      alert('Đã xác nhận đăng thành công!');
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await api.retryJob(jobId);
      await loadJobs();
      alert('Đã đưa vào hàng chờ thử lại');
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!confirm('Hủy lịch đăng này?')) return;
    try {
      await api.cancelJob(jobId);
      await loadJobs();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-teal-400" />
            <span>Lịch Đăng Bài (Publishing Calendar)</span>
          </h1>
          <p className="text-xs text-slate-400">
            Theo dõi hàng đợi phát hành video, xử lý các bài đăng bán tự động và kiểm tra nhật ký
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {['ALL', 'SCHEDULED', 'AWAITING_MANUAL_PUBLISH', 'PUBLISHED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-400 mb-2" />
          Đang tải danh sách lịch đăng...
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">Không có lịch đăng nào</p>
          <p className="text-xs text-slate-500 mt-1">
            Vào mục "Video Library", chọn một video đã được duyệt và bấm "Lên lịch đăng Reels".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-white">{job.video?.title || 'Video'}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                    {job.account?.accountName} ({job.account?.accountType})
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Lịch: {new Date(job.scheduledAt).toLocaleString('vi-VN')}</span>
                  </span>
                  <span>•</span>
                  <span>ID: {job.id.slice(0, 8)}...</span>
                </div>

                {job.content?.caption && (
                  <p className="text-xs text-slate-400 italic line-clamp-1 pt-1">
                    "{job.content.caption}"
                  </p>
                )}
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center space-x-3 shrink-0">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    job.status === 'PUBLISHED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : job.status === 'AWAITING_MANUAL_PUBLISH'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : job.status === 'FAILED'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }`}
                >
                  {job.status}
                </span>

                {job.status === 'AWAITING_MANUAL_PUBLISH' && (
                  <button
                    onClick={() => handleConfirmManual(job.id)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Xác nhận đã đăng
                  </button>
                )}

                {job.status === 'FAILED' && (
                  <button
                    onClick={() => handleRetry(job.id)}
                    className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white font-semibold text-xs rounded-xl transition-colors"
                  >
                    Thử lại
                  </button>
                )}

                {job.status === 'PUBLISHED' && job.publishedUrl && (
                  <a
                    href={job.publishedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-teal-400 hover:text-teal-300 rounded border border-slate-700 bg-slate-800"
                    title="Mở bài đăng Facebook"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                {job.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleCancel(job.id)}
                    className="text-xs text-slate-500 hover:text-rose-400"
                  >
                    Hủy lịch
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
