import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { api } from '../services/api';

interface CampaignsPageProps {
  campaigns: any[];
  onRefresh: () => void;
}

export const CampaignsPage: React.FC<CampaignsPageProps> = ({ campaigns, onRefresh }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      await api.createCampaign({
        name,
        description,
        startDate: new Date().toISOString()
      });
      setName('');
      setDescription('');
      await onRefresh();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-teal-400" />
            <span>Chiến Dịch Phát Hành (Campaigns)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Tổ chức và phân phối các video theo từng chiến dịch chủ đề (Cosplay Theme, Brand Event...)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Create Campaign Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white mb-1">Tạo Chiến Dịch Mới</h2>
          <p className="text-xs text-slate-400 mb-4">Nhóm các video phát hành theo mục tiêu</p>

          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Tên chiến dịch:</label>
              <input
                type="text"
                placeholder="Ví dụ: Cosplay Genshin Wave 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Mô tả mục tiêu:</label>
              <textarea
                placeholder="Mục tiêu lượt xem, đối tượng người xem, lưu ý..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white resize-none text-sm sm:text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-lg mt-2 active:scale-98 transition-colors"
            >
              {isCreating ? 'Đang tạo...' : 'Tạo Chiến Dịch'}
            </button>
          </form>
        </div>

        {/* Campaign List */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white mb-3">Danh sách chiến dịch ({campaigns.length})</h2>

          {campaigns.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              Chưa có chiến dịch nào được tạo. Tạo chiến dịch đầu tiên để gom nhóm các bài đăng Reels.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 sm:p-4 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-teal-500/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-white truncate pr-2">{c.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        Active
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2">{c.description}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{c._count?.jobs || 0} Video Jobs</span>
                    <span>{new Date(c.startDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
