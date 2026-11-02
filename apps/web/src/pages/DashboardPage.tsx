import React from 'react';
import { Film, CheckCircle2, Clock, AlertTriangle, Share2, PlusCircle, ArrowRight, Video } from 'lucide-react';

interface DashboardPageProps {
  overview: any;
  onNavigate: (tab: any) => void;
  onOpenImport: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ overview, onNavigate, onOpenImport }) => {
  const stats = overview?.stats || {
    totalVideos: 0,
    publishedCount: 0,
    scheduledCount: 0,
    failedCount: 0,
    pendingReviewCount: 0,
    totalAccounts: 0,
  };

  const recentJobs = overview?.recentJobs || [];

  const statCards = [
    {
      title: 'Total Videos',
      subtitle: 'Video trong thư viện',
      value: stats.totalVideos,
      icon: Film,
      color: 'from-blue-500/20 to-indigo-500/10',
      border: 'border-blue-500/30',
      textColor: 'text-blue-400'
    },
    {
      title: 'Published',
      subtitle: 'Đã xuất bản Reels',
      value: stats.publishedCount,
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/30',
      textColor: 'text-emerald-400'
    },
    {
      title: 'Scheduled',
      subtitle: 'Đang chờ theo lịch',
      value: stats.scheduledCount,
      icon: Clock,
      color: 'from-amber-500/20 to-yellow-500/10',
      border: 'border-amber-500/30',
      textColor: 'text-amber-400'
    },
    {
      title: 'Failed',
      subtitle: 'Cần kiểm tra lại',
      value: stats.failedCount,
      icon: AlertTriangle,
      color: 'from-rose-500/20 to-red-500/10',
      border: 'border-rose-500/30',
      textColor: 'text-rose-400'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900/40 via-slate-900 to-slate-900 border border-teal-500/20 p-6 md:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-3">
            <span>✨ Phase 1 — Project Foundation</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
            Social Media Automation Platform
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            Hệ thống quản lý nội dung mạng xã hội tập trung: tiếp nhận video Douyin có quyền sử dụng, tạo caption bằng AI, kiểm duyệt nội dung và tự động xuất bản lên Facebook Reels.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onOpenImport}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tiếp nhận Video Douyin</span>
            </button>
            <button
              onClick={() => onNavigate('accounts')}
              className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-medium text-sm px-4 py-2.5 rounded-xl transition-all"
            >
              <Share2 className="w-4 h-4 text-slate-400" />
              <span>Quản lý Fanpage ({stats.totalAccounts})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className={`p-5 rounded-2xl bg-gradient-to-b ${c.color} bg-slate-900/60 border ${c.border} backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{c.title}</span>
                <div className={`p-2 rounded-xl bg-slate-800/80 ${c.textColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">{c.value}</div>
              <div className="text-xs text-slate-400 mt-1">{c.subtitle}</div>
            </div>
          );
        })}
      </div>

      {/* Upcoming Publishing Jobs */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white">Lịch đăng sắp tới (Upcoming Publishing Jobs)</h2>
            <p className="text-xs text-slate-400">Các video đã được duyệt và lên lịch phát hành</p>
          </div>
          <button
            onClick={() => onNavigate('calendar')}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center space-x-1"
          >
            <span>Xem toàn bộ lịch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl">
            <Video className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">Chưa có lịch đăng nào được thiết lập</p>
            <p className="text-xs text-slate-500 mt-1">
              Hãy tiếp nhận video, kiểm duyệt bản quyền và lên lịch xuất bản tại Video Library.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold uppercase text-slate-400">
                  <th className="pb-3 px-3">Video</th>
                  <th className="pb-3 px-3">Kênh đích</th>
                  <th className="pb-3 px-3">Thời gian dự kiến</th>
                  <th className="pb-3 px-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentJobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-3 font-medium text-white">{job.video?.title || 'Video'}</td>
                    <td className="py-3.5 px-3 text-slate-300">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700">
                        <span>{job.account?.accountName || 'Fanpage'}</span>
                        <span className="text-[10px] text-slate-400">({job.account?.accountType})</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 text-xs">
                      {new Date(job.scheduledAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
