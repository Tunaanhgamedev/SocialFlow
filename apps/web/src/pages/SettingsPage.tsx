import React from 'react';
import { Settings as SettingsIcon, Database, Cpu, HardDrive, Sparkles, Server, CheckCircle2, AlertCircle } from 'lucide-react';

interface SettingsPageProps {
  systemHealth: any;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ systemHealth }) => {
  const db = systemHealth?.services?.database || {};
  const redis = systemHealth?.services?.redis || {};
  const storage = systemHealth?.services?.storage || {};
  const ai = systemHealth?.services?.ai || {};
  const system = systemHealth?.system || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <SettingsIcon className="w-5 h-5 text-teal-400" />
          <span>Cấu Hình & Hệ Thống (Settings & Health)</span>
        </h1>
        <p className="text-xs text-slate-400">
          Trạng thái kết nối PostgreSQL, Redis/BullMQ, AI Multi-provider và lưu trữ cục bộ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Database Service */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Database className="w-4 h-4 text-blue-400" />
              <span>PostgreSQL + Prisma ORM</span>
            </div>
            {db.status === 'healthy' ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Disconnected</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Lưu trữ users, videos, rights, campaigns, publishing jobs và logs xuất bản.
          </p>
          {db.error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
              {db.error}
            </div>
          )}
        </div>

        {/* Redis & BullMQ */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Cpu className="w-4 h-4 text-rose-400" />
              <span>Redis & BullMQ Queues</span>
            </div>
            {redis.connected ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                <span>Standby Mode</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Quản lý hàng đợi tải video, xử lý FFmpeg transcode, gọi AI và lập lịch xuất bản Reels.
          </p>
          <div className="text-xs text-slate-400">
            Host: <span className="text-slate-200">{redis.host}:{redis.port}</span>
          </div>
        </div>

        {/* Local Storage Service */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>Local Storage Engine</span>
            </div>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Lưu video gốc (`storage/raw`), video đã render 9:16 (`storage/processed`) và thumbnail ảnh bìa.
          </p>
          <div className="text-xs text-slate-400">
            Tổng số tệp: <span className="text-white font-semibold">{storage.stats?.totalFiles || 0}</span> | Dung lượng: <span className="text-white font-semibold">{((storage.stats?.sizeBytes || 0) / 1024 / 1024).toFixed(1)} MB</span>
          </div>
        </div>

        {/* AI Multi-Provider */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI Multi-Provider Architecture</span>
            </div>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
              <span>{ai.active || 'mock'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hỗ trợ cắm rút linh hoạt giữa Google Gemini API, OpenAI GPT hoặc Mock Provider offline.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {ai.providers?.map((p: any) => (
              <span
                key={p.name}
                className={`px-2 py-1 rounded-lg border text-[11px] ${
                  p.name === ai.active
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-200 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {p.name.toUpperCase()} {p.isConfigured ? '✓' : '(No Key)'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* System info footer */}
      <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>Node.js: <strong className="text-slate-200">{system.nodeVersion}</strong></span>
        <span>Uptime: <strong className="text-slate-200">{system.uptimeSeconds}s</strong></span>
        <span>RAM: <strong className="text-slate-200">{system.memoryUsageMb} MB</strong></span>
        <span>SocialFlow v1.0.0 — Monorepo Architecture</span>
      </div>
    </div>
  );
};
