import React from 'react';
import { BarChart3, TrendingUp, CheckCircle, Clock, AlertTriangle, HardDrive } from 'lucide-react';

interface AnalyticsPageProps {
  overview: any;
  systemHealth: any;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ overview, systemHealth }) => {
  const stats = overview?.stats || {
    totalVideos: 0,
    publishedCount: 0,
    scheduledCount: 0,
    failedCount: 0,
    pendingReviewCount: 0,
    totalAccounts: 0
  };

  const storageStats = systemHealth?.services?.storage?.stats || { totalFiles: 0, sizeBytes: 0 };
  const storageMb = (storageStats.sizeBytes / (1024 * 1024)).toFixed(1);

  const totalPublishedOrScheduled = stats.publishedCount + stats.scheduledCount + stats.failedCount;
  const successRate = totalPublishedOrScheduled > 0
    ? Math.round((stats.publishedCount / totalPublishedOrScheduled) * 100)
    : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-teal-400" />
          <span>Thống Kê & Hiệu Suất (Analytics)</span>
        </h1>
        <p className="text-xs text-slate-400">
          Tổng quan số liệu xuất bản Reels, tỷ lệ thành công và dung lượng lưu trữ cục bộ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Tỷ lệ xuất bản thành công</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{successRate}%</div>
          <p className="text-xs text-slate-500 mt-1">Dựa trên {totalPublishedOrScheduled} jobs phát hành</p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Dung lượng lưu trữ cục bộ</span>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{storageMb} MB</div>
          <p className="text-xs text-slate-500 mt-1">{storageStats.totalFiles} files trong thư mục storage/</p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Kênh đích hoạt động</span>
            <CheckCircle className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.totalAccounts}</div>
          <p className="text-xs text-slate-500 mt-1">Facebook Fanpages & Cá nhân</p>
        </div>
      </div>

      {/* Breakdown Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <h3 className="text-sm font-bold text-white mb-4">Trạng thái phát hành Reels</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Đã đăng thành công</span>
              </span>
              <span className="font-bold text-white">{stats.publishedCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Đang chờ theo lịch</span>
              </span>
              <span className="font-bold text-white">{stats.scheduledCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Thất bại / Cần xử lý</span>
              </span>
              <span className="font-bold text-white">{stats.failedCount}</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <h3 className="text-sm font-bold text-white mb-4">Kho nội dung & bản quyền</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Tổng video đã tiếp nhận</span>
              <span className="font-bold text-white">{stats.totalVideos}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Video đang chờ duyệt (Pending)</span>
              <span className="font-bold text-amber-400">{stats.pendingReviewCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Chế độ AI Metadata</span>
              <span className="font-bold text-teal-400">
                {systemHealth?.services?.ai?.active || 'Mock Provider'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
