import React, { useState } from 'react';
import { Share2, CheckCircle, AlertCircle, Trash2, Facebook } from 'lucide-react';
import { api } from '../services/api';

interface AccountsPageProps {
  accounts: any[];
  onRefresh: () => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({ accounts, onRefresh }) => {
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accountType, setAccountType] = useState('PAGE');
  const [platform, setPlatform] = useState('FACEBOOK');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.createAccount({
        accountName,
        accountId,
        platform,
        accountType,
        canAutoPublish: accountType === 'PAGE'
      });
      setAccountName('');
      setAccountId('');
      await onRefresh();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ngắt kết nối tài khoản này?')) return;
    try {
      await api.deleteAccount(id);
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
            <Share2 className="w-5 h-5 text-teal-400" />
            <span>Kênh Mạng Xã Hội (Social Accounts)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Quản lý Fanpage Facebook, tài khoản cá nhân và các nền tảng phân phối video
          </p>
        </div>
      </div>

      {/* Info notice about Personal vs Page */}
      <div className="p-3.5 sm:p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start space-x-3 text-xs leading-relaxed">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-slate-300">
          <span className="font-bold text-white">Lưu ý kiến trúc Facebook:</span>
          <p className="mt-1">
            • <strong>Facebook Fanpage:</strong> Hỗ trợ tự động xuất bản Reels trực tiếp qua Meta Graph API chính thức.
            <br />
            • <strong>Facebook Cá Nhân:</strong> Hệ thống kích hoạt chế độ xuất bản <em>Bán tự động</em> — tự chuẩn bị sẵn video, caption, gửi thông báo nhắc nhở khi đến lịch để bạn xác nhận đăng, tuyệt đối không dùng cookie hoặc giả lập vi phạm chính sách Meta.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Form to Connect Account */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white mb-1">Kết nối Kênh Mới</h2>
          <p className="text-xs text-slate-400 mb-4">Thêm Fanpage hoặc trang cá nhân của bạn</p>

          <form onSubmit={handleAddAccount} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Nền tảng:</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
              >
                <option value="FACEBOOK">Facebook</option>
                <option value="TIKTOK" disabled>TikTok (Sắp mở ở Phase 7)</option>
                <option value="YOUTUBE" disabled>YouTube Shorts (Sắp mở)</option>
                <option value="INSTAGRAM" disabled>Instagram Reels (Sắp mở)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Loại tài khoản:</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
              >
                <option value="PAGE">Facebook Fanpage (Tự động Graph API)</option>
                <option value="PERSONAL">Facebook Cá nhân (Bán tự động / Nhắc lịch)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Tên hiển thị:</label>
              <input
                type="text"
                placeholder="Ví dụ: Cos Dolove"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Page ID / Profile ID:</label>
              <input
                type="text"
                placeholder="Ví dụ: 102938475610..."
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm sm:text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-lg mt-2 active:scale-98 transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu kết nối tài khoản'}
            </button>
          </form>
        </div>

        {/* Account List */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white mb-3">Tài khoản đã liên kết ({accounts.length})</h2>

          {accounts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              Chưa có tài khoản nào được kết nối. Hãy thêm Fanpage Facebook "Cos Dolove" của bạn ở form bên cạnh.
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 sm:p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs sm:text-sm text-white truncate">{acc.accountName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                          {acc.accountType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="truncate">ID: {acc.accountId}</span>
                        <span>•</span>
                        {acc.canAutoPublish ? (
                          <span className="text-emerald-400 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Tự động xuất bản</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Bán tự động (Nhắc lịch)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 shrink-0"
                    title="Ngắt kết nối"
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
