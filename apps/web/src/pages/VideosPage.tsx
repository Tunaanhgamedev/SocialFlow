import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Play,
  Calendar,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';

interface VideosPageProps {
  videos: any[];
  onRefresh: () => void;
  onOpenImport: () => void;
  accounts: any[];
}

export const VideosPage: React.FC<VideosPageProps> = ({
  videos,
  onRefresh,
  onOpenImport,
  accounts
}) => {
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleTargetAccountId, setScheduleTargetAccountId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');

  const filteredVideos = videos.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleGenerateAI = async (videoId: string) => {
    try {
      setIsGenerating(true);
      await api.generateAI(videoId, { language: 'vi', targetPlatform: 'FACEBOOK' });
      await onRefresh();
      // update selected video view
      const updated = await api.getVideo(videoId);
      setSelectedVideo(updated);
    } catch (err: any) {
      alert(`Lỗi tạo AI: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (videoId: string) => {
    try {
      await api.approveVideo(videoId);
      await onRefresh();
      const updated = await api.getVideo(videoId);
      setSelectedVideo(updated);
    } catch (err: any) {
      alert(`Không thể duyệt: ${err.message}`);
    }
  };

  const handleReject = async (videoId: string) => {
    const reason = prompt('Nhập lý do từ chối:');
    if (reason === null) return;
    try {
      await api.rejectVideo(videoId, reason);
      await onRefresh();
      const updated = await api.getVideo(videoId);
      setSelectedVideo(updated);
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleProcessVideo = async (videoId: string) => {
    try {
      await api.processVideo(videoId);
      alert('Đã đưa tác vụ xử lý video vào hàng đợi');
      await onRefresh();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa video này?')) return;
    try {
      await api.deleteVideo(videoId);
      setSelectedVideo(null);
      await onRefresh();
    } catch (err: any) {
      alert(`Lỗi xóa: ${err.message}`);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo || !scheduleTargetAccountId || !scheduleDate) {
      alert('Vui lòng chọn tài khoản và thời gian đăng');
      return;
    }

    try {
      await api.scheduleJobs({
        videoId: selectedVideo.id,
        targets: [
          {
            accountId: scheduleTargetAccountId,
            contentId: selectedVideo.contents?.[0]?.id,
            scheduledAt: new Date(scheduleDate).toISOString()
          }
        ]
      });
      alert('Đã lên lịch xuất bản thành công!');
      setIsScheduling(false);
      await onRefresh();
      const updated = await api.getVideo(selectedVideo.id);
      setSelectedVideo(updated);
    } catch (err: any) {
      alert(`Lỗi lên lịch: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">APPROVED</span>;
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30">PENDING</span>;
      case 'PROCESSED':
        return <span className="px-2 py-0.5 rounded text-xs bg-teal-500/10 text-teal-400 border border-teal-500/30">PROCESSED</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-xs bg-rose-500/10 text-rose-400 border border-rose-500/30">REJECTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Film className="w-5 h-5 text-teal-400" />
            <span>Video Library</span>
          </h1>
          <p className="text-xs text-slate-400">
            Quản lý kho video đã tiếp nhận, kiểm duyệt bản quyền và tạo nội dung AI
          </p>
        </div>

        <button
          onClick={onOpenImport}
          className="inline-flex items-center space-x-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Tiếp nhận Video</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm kiếm video theo tiêu đề..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          {['ALL', 'PENDING', 'APPROVED', 'PROCESSED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
          <Film className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">Không tìm thấy video nào</p>
          <p className="text-xs text-slate-500 mt-1">Hãy tiếp nhận link Douyin hoặc upload video để bắt đầu</p>
          <button
            onClick={onOpenImport}
            className="mt-4 px-4 py-2 bg-teal-500 text-slate-950 rounded-xl text-xs font-semibold hover:bg-teal-400"
          >
            Tiếp nhận Video ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => setSelectedVideo(video)}
              className={`group cursor-pointer rounded-2xl bg-slate-900/80 border p-4 transition-all hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/5 flex flex-col justify-between ${
                selectedVideo?.id === video.id ? 'border-teal-500 ring-1 ring-teal-500/40' : 'border-slate-800'
              }`}
            >
              <div>
                {/* Thumbnail placeholder */}
                <div className="aspect-[9/12] w-full rounded-xl bg-slate-950 border border-slate-800 relative overflow-hidden flex items-center justify-center mb-3">
                  <div className="text-center p-4">
                    <Play className="w-8 h-8 text-teal-400/80 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-mono text-slate-500 block">Tỷ lệ 9:16 Reels</span>
                  </div>

                  {/* Status badges */}
                  <div className="absolute top-2.5 left-2.5">
                    {getStatusBadge(video.status)}
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    {video.rights?.rightsStatus === 'AUTHORIZED' ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Authorized</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        <span>Pending Check</span>
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-sm text-white line-clamp-2 mb-1 group-hover:text-teal-300 transition-colors">
                  {video.title}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{video.sourceType}</span>
                  <span>{new Date(video.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              {/* Quick info footer */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  AI Caption:{' '}
                  <span className={video.contents?.length ? 'text-teal-400 font-semibold' : 'text-slate-600'}>
                    {video.contents?.length ? `${video.contents.length} bản` : 'Chưa tạo'}
                  </span>
                </span>
                <span className="text-teal-400 group-hover:underline text-[11px]">Chi tiết &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <span className="text-xs uppercase font-semibold text-teal-400">Chi tiết Video</span>
                <h2 className="text-lg font-bold text-white mt-0.5">{selectedVideo.title}</h2>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Metadata & Actions */}
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mã định danh ID:</span>
                    <span className="text-slate-300 font-mono">{selectedVideo.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nguồn:</span>
                    <span className="text-slate-300">{selectedVideo.sourceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trạng thái:</span>
                    <span>{getStatusBadge(selectedVideo.status)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Bản quyền (Rights):</span>
                    <span className="font-semibold text-emerald-400">
                      {selectedVideo.rights?.rightsStatus || 'PENDING_REVIEW'}
                    </span>
                  </div>
                  {selectedVideo.sourceUrl && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-slate-400 block mb-1">URL Gốc:</span>
                      <a
                        href={selectedVideo.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-400 underline break-all text-[11px]"
                      >
                        {selectedVideo.sourceUrl}
                      </a>
                    </div>
                  )}
                </div>

                {/* Workflow Actions */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Quy trình duyệt & xử lý</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleGenerateAI(selectedVideo.id)}
                      disabled={isGenerating}
                      className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-xs font-medium"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isGenerating ? 'Đang tạo...' : 'Tạo AI Caption'}</span>
                    </button>

                    <button
                      onClick={() => handleProcessVideo(selectedVideo.id)}
                      className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 text-xs font-medium"
                    >
                      <Play className="w-3.5 h-3.5 text-blue-400" />
                      <span>Xử lý FFmpeg 9:16</span>
                    </button>

                    <button
                      onClick={() => handleApprove(selectedVideo.id)}
                      className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-medium"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Duyệt Video</span>
                    </button>

                    <button
                      onClick={() => handleReject(selectedVideo.id)}
                      className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-xs font-medium"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Từ chối</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsScheduling(!isScheduling)}
                    className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs shadow-md transition-all"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Lên lịch đăng Reels</span>
                  </button>
                </div>

                {/* Scheduling form */}
                {isScheduling && (
                  <form onSubmit={handleScheduleSubmit} className="p-4 bg-slate-950 rounded-xl border border-teal-500/40 space-y-3">
                    <div className="text-xs font-semibold text-teal-300">Lên lịch đăng bài</div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Chọn kênh đích (Fanpage hoặc Cá nhân):</label>
                      <select
                        value={scheduleTargetAccountId}
                        onChange={(e) => setScheduleTargetAccountId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        required
                      >
                        <option value="">-- Chọn tài khoản đích --</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.accountName} ({acc.accountType})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Thời gian đăng:</label>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-lg text-xs"
                    >
                      Xác nhận xếp lịch
                    </button>
                  </form>
                )}
              </div>

              {/* Right Column: AI Generated Content & Publishing Jobs */}
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Nội dung AI đã tạo</span>
                    </span>
                  </div>

                  {selectedVideo.contents?.length > 0 ? (
                    <div className="space-y-3">
                      {selectedVideo.contents.map((c: any) => (
                        <div key={c.id} className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1.5">
                          <div className="font-semibold text-teal-300">{c.title}</div>
                          <p className="text-slate-300 leading-relaxed">{c.caption}</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {c.hashtags?.map((tag: string) => (
                              <span key={tag} className="text-[10px] text-teal-400/80 bg-teal-500/10 px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                          {c.pinnedComment && (
                            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                              📌 Ghim: {c.pinnedComment}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Chưa có nội dung AI. Bấm "Tạo AI Caption" để AI viết tiêu đề, hashtag và caption.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleDelete(selectedVideo.id)}
                    className="flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 text-xs px-3 py-1.5 rounded-lg border border-rose-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Video</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
