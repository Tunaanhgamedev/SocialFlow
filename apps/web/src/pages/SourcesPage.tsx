import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  Plus,
  Link as LinkIcon,
  Folder,
  Upload,
  ShieldCheck,
  Trash2,
  RefreshCw,
  FolderSync,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import { api } from '../services/api';

interface SourcesPageProps {
  sources: any[];
  onRefresh: () => void;
  onOpenImport: () => void;
}

export const SourcesPage: React.FC<SourcesPageProps> = ({ sources, onRefresh, onOpenImport }) => {
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('DOUYIN_URL');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Folder Watcher State
  const [folderPathInput, setFolderPathInput] = useState('');
  const [isWatching, setIsWatching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [watchers, setWatchers] = useState<any[]>([]);

  const loadWatchers = async () => {
    try {
      const data = await api.getFolderWatchers();
      setWatchers(data);
    } catch (err) {
      console.warn('Could not load watchers:', err);
    }
  };

  useEffect(() => {
    loadWatchers();
  }, []);

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      await api.createSource({
        sourceName,
        sourceType,
        sourceUrl: sourceUrl || undefined
      });
      setSourceName('');
      setSourceUrl('');
      await onRefresh();
    } catch (err: any) {
      alert(`Lỗi tạo nguồn: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartWatchFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPathInput.trim()) {
      alert('Vui lòng nhập đường dẫn thư mục trên máy tính');
      return;
    }

    try {
      setIsWatching(true);
      await api.watchFolder({ folderPath: folderPathInput.trim(), autoIngest: true });
      alert(`Đang theo dõi thư mục: ${folderPathInput}`);
      setFolderPathInput('');
      await loadWatchers();
      await onRefresh();
    } catch (err: any) {
      alert(`Lỗi theo dõi thư mục: ${err.message}`);
    } finally {
      setIsWatching(false);
    }
  };

  const handleImmediateScan = async (folderPath: string) => {
    try {
      setIsScanning(true);
      const res = await api.scanFolder(folderPath);
      alert(
        `Quét hoàn tất: Quét ${res.totalScanned} tệp video, tiếp nhận mới ${res.ingestedCount} video vào thư viện!`
      );
      await onRefresh();
    } catch (err: any) {
      alert(`Lỗi quét: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleStopWatch = async (folderPath: string) => {
    try {
      await api.unwatchFolder(folderPath);
      await loadWatchers();
      alert(`Đã dừng theo dõi thư mục: ${folderPath}`);
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa nguồn video này?')) return;
    try {
      await api.deleteSource(id);
      await onRefresh();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
            <DownloadCloud className="w-5 h-5 text-teal-400" />
            <span>Quản Lý Nguồn Video (Sources & Folder Watcher)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Tiếp nhận video từ Douyin URL, theo dõi thư mục máy tính (Chokidar) và đồng bộ tự động
          </p>
        </div>

        <button
          onClick={onOpenImport}
          className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-teal-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Dán Link Tiếp Nhận</span>
        </button>
      </div>

      {/* Folder Watcher & Auto-Sync Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl shrink-0">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Đồng Bộ Thư Mục Máy Tính (Folder Watcher Service)</h2>
              <p className="text-xs text-slate-400">
                Tự động quét và tiếp nhận video khi bạn thả tệp vào bất kỳ thư mục nào trên máy
              </p>
            </div>
          </div>
          <button
            onClick={loadWatchers}
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới danh sách</span>
          </button>
        </div>

        <form onSubmit={handleStartWatchFolder} className="flex flex-col sm:flex-row gap-2.5 text-xs">
          <div className="relative flex-1">
            <Folder className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Nhập đường dẫn thư mục, ví dụ: E:\Videos hoặc D:\DouyinDownloads"
              value={folderPathInput}
              onChange={(e) => setFolderPathInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm sm:text-xs focus:outline-none focus:border-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={isWatching}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl whitespace-nowrap shadow-md shadow-teal-500/20 active:scale-95"
          >
            {isWatching ? 'Đang kích hoạt...' : 'Bắt đầu Theo Dõi (Watch)'}
          </button>
        </form>

        {/* Active Watchers Table */}
        {watchers.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Thư mục đang theo dõi:</div>
            <div className="divide-y divide-slate-800 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs">
              {watchers.map((w) => (
                <div key={w.folderPath} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-white flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                      <span className="truncate">{w.folderPath}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                      <span>Đã phát hiện: {w.filesFound} files</span>
                      <span>•</span>
                      <span>Lần quét: {new Date(w.lastScannedAt).toLocaleTimeString('vi-VN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleImmediateScan(w.folderPath)}
                      disabled={isScanning}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 text-[11px]"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>{isScanning ? 'Đang quét...' : 'Quét ngay'}</span>
                    </button>
                    <button
                      onClick={() => handleStopWatch(w.folderPath)}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-[11px]"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Dừng</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Create Source Config Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white mb-1">Cấu hình Nguồn Mới</h2>
          <p className="text-xs text-slate-400 mb-4">Lưu cấu hình kênh nguồn phục vụ thống kê & quản lý</p>

          <form onSubmit={handleCreateSource} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Loại nguồn:</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
              >
                <option value="DOUYIN_URL">Douyin URL / Dán Link</option>
                <option value="AUTHORIZED_ACCOUNT">Tài khoản Douyin được cấp phép</option>
                <option value="LOCAL_FOLDER">Thư mục máy tính (Local Folder)</option>
                <option value="MANUAL_UPLOAD">Tải lên thủ công (Manual Upload)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Tên nguồn nhận diện:</label>
              <input
                type="text"
                placeholder="Ví dụ: Douyin Cosplay Channel 01"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">URL hoặc Thư mục nguồn:</label>
              <input
                type="text"
                placeholder="https://v.douyin.com/... hoặc E:\Videos"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg mt-2 transition-colors active:scale-98"
            >
              {isCreating ? 'Đang tạo...' : 'Lưu nguồn video'}
            </button>
          </form>
        </div>

        {/* Sources List */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white mb-3">Danh sách nguồn đã cấu hình ({sources.length})</h2>

          {sources.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              Chưa có nguồn nào được cấu hình. Bạn có thể thêm cấu hình hoặc dán link video trực tiếp.
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
                      {s.sourceType === 'DOUYIN_URL' && <LinkIcon className="w-4 h-4" />}
                      {s.sourceType === 'LOCAL_FOLDER' && <Folder className="w-4 h-4" />}
                      {s.sourceType === 'MANUAL_UPLOAD' && <Upload className="w-4 h-4" />}
                      {s.sourceType === 'AUTHORIZED_ACCOUNT' && <ShieldCheck className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{s.sourceName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                        <span>{s.sourceType}</span>
                        <span>•</span>
                        <span>{s._count?.sourceItems || 0} mục đã tiếp nhận</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg shrink-0"
                    title="Xóa nguồn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
