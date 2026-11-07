import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Play,
  Calendar,
  Trash2,
  LayoutGrid,
  List,
  Upload,
  Lock,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { RightsModal } from '../features/rights-management/RightsModal';

interface VideosPageProps {
  videos: any[];
  onRefresh: () => void;
  onOpenImport: () => void;
  onOpenUpload: () => void;
  accounts: any[];
}

export const VideosPage: React.FC<VideosPageProps> = ({
  videos,
  onRefresh,
  onOpenImport,
  onOpenUpload,
  accounts
}) => {
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [rightsModalVideo, setRightsModalVideo] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [rightsFilter, setRightsFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleTargetAccountId, setScheduleTargetAccountId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');

  // Filtering and Sorting
  const filteredVideos = videos
    .filter((v) => {
      const matchesSearch = v.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
      const matchesRights =
        rightsFilter === 'ALL' ||
        v.rightsStatus === rightsFilter ||
        v.rights?.rightsStatus === rightsFilter;
      return matchesSearch && matchesStatus && matchesRights;
    })
    .sort((a, b) => {
      if (sortBy === 'OLDEST') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'DURATION_DESC') {
        return (b.duration || 0) - (a.duration || 0);
      }
      if (sortBy === 'TITLE_ASC') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'SIZE_DESC') {
        const sizeA = a.assets?.[0]?.fileSizeBytes ? Number(a.assets[0].fileSizeBytes) : 0;
        const sizeB = b.assets?.[0]?.fileSizeBytes ? Number(b.assets[0].fileSizeBytes) : 0;
        return sizeB - sizeA;
      }
      // default NEWEST
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleGenerateAI = async (videoId: string) => {
    try {
      setIsGenerating(true);
      await api.generateAI(videoId, { language: 'vi', targetPlatform: 'FACEBOOK' });
      await onRefresh();
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
      alert('Đã duyệt video thành công!');
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
    if (!confirm('Bạn có chắc chắn muốn xóa video này cùng toàn bộ tệp lưu trữ liên quan?')) return;
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatFileSize = (bytes?: any) => {
    if (!bytes) return 'N/A';
    const num = Number(bytes);
    if (isNaN(num) || num === 0) return '0 MB';
    return (num / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">APPROVED</span>;
      case 'DOWNLOADED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">DOWNLOADED</span>;
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">PENDING</span>;
      case 'PROCESSED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30">PROCESSED</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">REJECTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  const getRightsBadge = (video: any) => {
    const status = video.rightsStatus || video.rights?.rightsStatus || 'PENDING_REVIEW';
    if (status === 'AUTHORIZED' || status === 'LICENSED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>{status}</span>
        </span>
      );
    }
    if (status === 'PROHIBITED' || status === 'REVOKED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 backdrop-blur-md">
          <Lock className="w-3 h-3 text-rose-400" />
          <span>{status}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
        <ShieldAlert className="w-3 h-3 text-amber-400" />
        <span>PENDING_REVIEW</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
            <Film className="w-5 h-5 text-teal-400" />
            <span>Thư Viện Video (Video Library)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Quản lý kho video đã tiếp nhận, kiểm tra quyền sử dụng, xem trước và tạo nội dung AI
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Upload className="w-4 h-4 text-teal-400" />
            <span>Tải Video Lên</span>
          </button>

          <button
            onClick={onOpenImport}
            className="inline-flex items-center justify-center space-x-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-md shadow-teal-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Dán Link Douyin</span>
          </button>
        </div>
      </div>

      {/* Filter, Sort & Search Toolbar */}
      <div className="bg-slate-900/80 p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm video theo tiêu đề..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-sm sm:text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm sm:text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="NEWEST">Mới nhất trước</option>
              <option value="OLDEST">Cũ nhất trước</option>
              <option value="SIZE_DESC">Dung lượng lớn nhất</option>
              <option value="DURATION_DESC">Thời lượng dài nhất</option>
              <option value="TITLE_ASC">Tên tiêu đề A-Z</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Dạng lưới"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Dạng danh sách"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400 text-[11px] mr-1">Trạng thái:</span>
          {['ALL', 'DOWNLOADED', 'PROCESSED', 'APPROVED', 'PENDING', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}

          <span className="text-slate-400 text-[11px] ml-2 mr-1">Bản quyền:</span>
          {['ALL', 'AUTHORIZED', 'LICENSED', 'PENDING_REVIEW', 'PROHIBITED'].map((rt) => (
            <button
              key={rt}
              onClick={() => setRightsFilter(rt)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                rightsFilter === rt
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {rt}
            </button>
          ))}
        </div>
      </div>

      {/* Videos Display Area */}
      {filteredVideos.length === 0 ? (
        <div className="py-16 sm:py-20 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 p-4">
          <Film className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">Không tìm thấy video nào phù hợp</p>
          <p className="text-xs text-slate-500 mt-1">Hãy tải video lên từ máy tính hoặc dán link Douyin để bắt đầu</p>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              onClick={onOpenUpload}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-700"
            >
              Tải video từ máy tính
            </button>
            <button
              onClick={onOpenImport}
              className="w-full sm:w-auto px-4 py-2 bg-teal-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-teal-400"
            >
              Dán Link Tiếp Nhận
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => setSelectedVideo(video)}
              className={`group cursor-pointer rounded-2xl bg-slate-900/80 border p-3 transition-all hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/5 flex flex-col justify-between ${
                selectedVideo?.id === video.id ? 'border-teal-500 ring-1 ring-teal-500/40' : 'border-slate-800'
              }`}
            >
              <div>
                {/* Thumbnail Preview Container (9:14 / 9:16 Vertical Reels) */}
                <div className="aspect-[9/13] w-full rounded-xl bg-slate-950 border border-slate-800/90 relative overflow-hidden flex items-center justify-center mb-2.5">
                  <img
                    src={api.getThumbnailUrl(video.id)}
                    alt={video.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="433" fill="%230f172a"><rect width="100%" height="100%"/><text x="50%" y="50%" fill="%23475569" font-family="sans-serif" font-size="16" text-anchor="middle">9:16 Video</text></svg>';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Play overlay icon */}
                  <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <div className="w-10 h-10 rounded-full bg-teal-500/90 text-slate-950 flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </div>

                  {/* Top badges */}
                  <div className="absolute top-2 left-2">{getStatusBadge(video.status)}</div>
                  <div className="absolute top-2 right-2">{getRightsBadge(video)}</div>

                  {/* Bottom Duration & Resolution badge */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono text-slate-200">
                    {formatDuration(video.duration)} {video.aspectRatio ? `• ${video.aspectRatio}` : ''}
                  </div>
                </div>

                <h3 className="font-semibold text-xs text-white line-clamp-2 mb-1 group-hover:text-teal-300 transition-colors">
                  {video.title}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[120px]">{video.sourceType}</span>
                  <span>{formatFileSize(video.assets?.[0]?.fileSizeBytes)}</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{new Date(video.createdAt).toLocaleDateString('vi-VN')}</span>
                <span className="text-teal-400 group-hover:underline flex items-center space-x-1">
                  <span>Chi tiết</span>
                  <span>&rarr;</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">Tiêu đề Video</th>
                  <th className="py-3 px-4">Nguồn</th>
                  <th className="py-3 px-4">Thời lượng / Size</th>
                  <th className="py-3 px-4">Bản quyền</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVideos.map((video) => (
                  <tr
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-4">
                      <div className="w-12 h-16 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative">
                        <img
                          src={api.getThumbnailUrl(video.id)}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-white max-w-xs truncate">{video.title}</td>
                    <td className="py-3 px-4 text-slate-400">{video.sourceType}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                      {formatDuration(video.duration)} • {formatFileSize(video.assets?.[0]?.fileSizeBytes)}
                    </td>
                    <td className="py-3 px-4">{getRightsBadge(video)}</td>
                    <td className="py-3 px-4">{getStatusBadge(video.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVideo(video);
                        }}
                        className="text-teal-400 hover:text-teal-300 font-medium text-xs px-2.5 py-1 rounded bg-slate-800"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Video Detail Modal with Responsive 9:16 HTML5 Video Player */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4 sm:mb-5">
              <div className="pr-2 min-w-0">
                <span className="text-xs uppercase font-semibold text-teal-400">Trình phát & Chi tiết Video</span>
                <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">{selectedVideo.title}</h2>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
              {/* Left Column: Interactive 9:16 Vertical Video Player */}
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden bg-black border border-slate-800 relative aspect-[9/14] sm:aspect-[9/16] max-h-[46vh] sm:max-h-[58vh] mx-auto flex items-center justify-center shadow-lg w-full max-w-[320px] lg:max-w-none">
                  <video
                    key={selectedVideo.id}
                    controls
                    preload="metadata"
                    poster={api.getThumbnailUrl(selectedVideo.id)}
                    className="w-full h-full object-contain"
                  >
                    <source src={api.getVideoStreamUrl(selectedVideo.id)} type="video/mp4" />
                    Trình duyệt của bạn không hỗ trợ phát thẻ video HTML5.
                  </video>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Thời lượng:</span>
                    <span className="text-white font-mono">{formatDuration(selectedVideo.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Độ phân giải / Tỷ lệ:</span>
                    <span className="text-white font-mono">
                      {selectedVideo.width || '1080'}x{selectedVideo.height || '1920'} ({selectedVideo.aspectRatio || '9:16'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dung lượng:</span>
                    <span className="text-white font-mono">{formatFileSize(selectedVideo.assets?.[0]?.fileSizeBytes)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Storage Provider:</span>
                    <span className="text-teal-400 font-mono text-[11px] font-semibold">
                      {selectedVideo.storageProvider || 'LOCAL'}
                    </span>
                  </div>
                  {(selectedVideo.storageKey || selectedVideo.assets?.[0]?.storageKey) && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Storage Key:</span>
                      <span
                        className="text-slate-400 font-mono text-[10px] truncate max-w-[180px] sm:max-w-[220px]"
                        title={selectedVideo.storageKey || selectedVideo.assets?.[0]?.storageKey}
                      >
                        {selectedVideo.storageKey || selectedVideo.assets?.[0]?.storageKey}
                      </span>
                    </div>
                  )}
                  {selectedVideo.fileHash && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">Mã SHA-256:</span>
                      <span className="text-slate-500 font-mono text-[10px] truncate max-w-[160px] sm:max-w-[180px]">
                        {selectedVideo.fileHash}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Workflow Controls, Rights Management & AI Content */}
              <div className="space-y-4 text-xs">
                {/* Rights Management Quick Card */}
                <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-400" />
                      <span>Quyền sở hữu & Bản quyền</span>
                    </span>
                    <button
                      onClick={() => setRightsModalVideo(selectedVideo)}
                      className="text-teal-400 hover:underline font-semibold text-[11px]"
                    >
                      Chỉnh sửa quyền
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getRightsBadge(selectedVideo)}
                    <span className="text-slate-300 text-[11px] truncate">
                      {selectedVideo.rights?.authorConsent ? '• Đã có xác nhận của tác giả' : '• Chưa có văn bản thỏa thuận'}
                    </span>
                  </div>

                  {selectedVideo.rights?.notes && (
                    <div className="text-slate-400 text-[11px] italic">"{selectedVideo.rights.notes}"</div>
                  )}
                </div>

                {/* Workflow Actions */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Hành động quy trình</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleGenerateAI(selectedVideo.id)}
                      disabled={isGenerating}
                      className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 font-medium active:scale-95 transition-transform"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isGenerating ? 'Đang tạo...' : 'Tạo AI Caption'}</span>
                    </button>

                    <button
                      onClick={() => handleProcessVideo(selectedVideo.id)}
                      className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 font-medium active:scale-95 transition-transform"
                    >
                      <Play className="w-3.5 h-3.5 text-blue-400" />
                      <span>FFmpeg 9:16</span>
                    </button>

                    <button
                      onClick={() => handleApprove(selectedVideo.id)}
                      className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-medium active:scale-95 transition-transform"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Duyệt Video</span>
                    </button>

                    <button
                      onClick={() => handleReject(selectedVideo.id)}
                      className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-medium active:scale-95 transition-transform"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Từ chối</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsScheduling(!isScheduling)}
                    className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-md transition-all active:scale-98"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Lên lịch xuất bản Reels</span>
                  </button>
                </div>

                {/* Scheduling form */}
                {isScheduling && (
                  <form onSubmit={handleScheduleSubmit} className="p-3.5 sm:p-4 bg-slate-950 rounded-xl border border-teal-500/40 space-y-3">
                    <div className="text-xs font-semibold text-teal-300">Lên lịch đăng Reels Facebook</div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Kênh đích (Page hoặc Cá nhân):</label>
                      <select
                        value={scheduleTargetAccountId}
                        onChange={(e) => setScheduleTargetAccountId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg transition-colors"
                    >
                      Xác nhận xếp lịch đăng
                    </button>
                  </form>
                )}

                {/* AI Content Preview */}
                <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Nội dung AI ({selectedVideo.contents?.length || 0})</span>
                    </span>
                  </div>

                  {selectedVideo.contents?.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedVideo.contents.map((c: any) => (
                        <div key={c.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] space-y-1">
                          <div className="font-bold text-teal-300">{c.title}</div>
                          <p className="text-slate-300 leading-relaxed">{c.caption}</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {c.hashtags?.map((tag: string) => (
                              <span key={tag} className="text-[10px] text-teal-400/80 bg-teal-500/10 px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      Chưa có nội dung AI. Bấm "Tạo AI Caption" để tạo tiêu đề và hashtag.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleDelete(selectedVideo.id)}
                    className="flex items-center space-x-1 text-rose-400 hover:text-rose-300 text-xs px-3 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Video khỏi hệ thống</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rights Management Modal */}
      {rightsModalVideo && (
        <RightsModal
          isOpen={!!rightsModalVideo}
          video={rightsModalVideo}
          onClose={() => setRightsModalVideo(null)}
          onSuccess={async () => {
            await onRefresh();
            if (selectedVideo) {
              const updated = await api.getVideo(selectedVideo.id);
              setSelectedVideo(updated);
            }
          }}
        />
      )}
    </div>
  );
};
