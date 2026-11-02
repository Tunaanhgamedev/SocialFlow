import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { VideosPage } from './pages/VideosPage';
import { SourcesPage } from './pages/SourcesPage';
import { AccountsPage } from './pages/AccountsPage';
import { CalendarPage } from './pages/CalendarPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { ShieldCheck, PlusCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [systemHealth, setSystemHealth] = useState<any | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [importRightsStatus, setImportRightsStatus] = useState('AUTHORIZED');
  const [importLicenseNote, setImportLicenseNote] = useState('');
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [healthRes, overviewRes, videosRes, sourcesRes, accountsRes, campaignsRes] =
        await Promise.allSettled([
          api.getHealth(),
          api.getOverview(),
          api.getVideos(),
          api.getSources(),
          api.getAccounts(),
          api.getCampaigns()
        ]);

      if (healthRes.status === 'fulfilled') setSystemHealth(healthRes.value);
      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (videosRes.status === 'fulfilled') setVideos(videosRes.value);
      if (sourcesRes.status === 'fulfilled') setSources(sourcesRes.value);
      if (accountsRes.status === 'fulfilled') setAccounts(accountsRes.value);
      if (campaignsRes.status === 'fulfilled') setCampaigns(campaignsRes.value);
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImportDouyin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) {
      alert('Vui lòng dán link video Douyin');
      return;
    }

    try {
      setIsSubmittingImport(true);
      await api.importDouyin({
        url: importUrl,
        title: importTitle || undefined,
        rightsStatus: importRightsStatus,
        licenseNote: importLicenseNote || undefined
      });
      alert('Đã tiếp nhận video Douyin thành công vào hệ thống!');
      setIsImportModalOpen(false);
      setImportUrl('');
      setImportTitle('');
      setImportLicenseNote('');
      await loadData();
    } catch (err: any) {
      alert(`Lỗi tiếp nhận: ${err.message}`);
    } finally {
      setIsSubmittingImport(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          systemStatus={systemHealth}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              overview={overview}
              onNavigate={setCurrentTab}
              onOpenImport={() => setIsImportModalOpen(true)}
            />
          )}

          {currentTab === 'videos' && (
            <VideosPage
              videos={videos}
              onRefresh={loadData}
              onOpenImport={() => setIsImportModalOpen(true)}
              accounts={accounts}
            />
          )}

          {currentTab === 'sources' && (
            <SourcesPage
              sources={sources}
              onRefresh={loadData}
              onOpenImport={() => setIsImportModalOpen(true)}
            />
          )}

          {currentTab === 'accounts' && (
            <AccountsPage
              accounts={accounts}
              onRefresh={loadData}
            />
          )}

          {currentTab === 'calendar' && <CalendarPage />}

          {currentTab === 'campaigns' && (
            <CampaignsPage
              campaigns={campaigns}
              onRefresh={loadData}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsPage
              overview={overview}
              systemHealth={systemHealth}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage systemHealth={systemHealth} />
          )}
        </main>
      </div>

      {/* Global Douyin Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-teal-400" />
                <span>Tiếp nhận Video từ Douyin</span>
              </h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportDouyin} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Đường dẫn (URL) Video Douyin: *
                </label>
                <input
                  type="url"
                  placeholder="https://www.douyin.com/video/..."
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Tiêu đề gợi nhớ (Tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cosplay Ganyu Genshin Impact"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Xác nhận quyền sở hữu / cấp phép (Rights Status):
                </label>
                <select
                  value={importRightsStatus}
                  onChange={(e) => setImportRightsStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                >
                  <option value="AUTHORIZED">Đã có quyền sử dụng / Chủ sở hữu đồng ý (AUTHORIZED)</option>
                  <option value="PENDING_REVIEW">Chờ kiểm duyệt bản quyền (PENDING_REVIEW)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Ghi chú chứng từ cấp quyền:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giấy đồng ý của cosplayer, tin nhắn chấp thuận..."
                  value={importLicenseNote}
                  onChange={(e) => setImportLicenseNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-[11px] text-teal-300 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>
                  Video sau khi tiếp nhận sẽ được đưa vào hàng đợi tự động: Tải ➔ Kiểm tra FFmpeg 9:16 ➔ Tạo AI Metadata ➔ Chờ duyệt.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingImport}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-lg shadow-teal-500/20"
                >
                  {isSubmittingImport ? 'Đang tiếp nhận...' : 'Xác nhận tiếp nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
