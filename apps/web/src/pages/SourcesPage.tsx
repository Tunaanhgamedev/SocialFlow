import React, { useState } from 'react';
import { DownloadCloud, Plus, Link, Folder, Upload, ShieldCheck, Trash2 } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <DownloadCloud className="w-5 h-5 text-teal-400" />
            <span>Nguồn Video (Sources Manager)</span>
          </h1>
          <p className="text-xs text-slate-400">
            Quản lý các nguồn tiếp nhận video: Douyin URLs, tài khoản cấp quyền, thư mục máy tính
          </p>
        </div>

        <button
          onClick={onOpenImport}
          className="inline-flex items-center space-x-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Dán link Douyin tiếp nhận</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Source Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-1">Thêm cấu hình nguồn mới</h2>
          <p className="text-xs text-slate-400 mb-4">Cài đặt kênh nguồn để tự động quét hoặc đồng bộ</p>

          <form onSubmit={handleCreateSource} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Loại nguồn:</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">URL hoặc Đường dẫn (tùy chọn):</label>
              <input
                type="text"
                placeholder="https://v.douyin.com/... hoặc E:/Videos"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-[11px] text-teal-300 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>Chỉ tiếp nhận nội dung có văn bản thỏa thuận hoặc quyền sử dụng hợp lệ.</span>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-lg"
            >
              {isCreating ? 'Đang tạo...' : 'Lưu nguồn video'}
            </button>
          </form>
        </div>

        {/* Sources List */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-3">Danh sách nguồn hiện tại ({sources.length})</h2>

          {sources.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              Chưa có nguồn nào được cấu hình. Bạn có thể thêm nguồn hoặc sử dụng nút "Dán link Douyin tiếp nhận".
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                      {s.sourceType === 'DOUYIN_URL' && <Link className="w-4 h-4" />}
                      {s.sourceType === 'LOCAL_FOLDER' && <Folder className="w-4 h-4" />}
                      {s.sourceType === 'MANUAL_UPLOAD' && <Upload className="w-4 h-4" />}
                      {s.sourceType === 'AUTHORIZED_ACCOUNT' && <ShieldCheck className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{s.sourceName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                        <span>{s.sourceType}</span>
                        <span>•</span>
                        <span>{s._count?.sourceItems || 0} mục đã tiếp nhận</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded"
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
