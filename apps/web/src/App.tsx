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
import { UploadModal } from './features/video-upload/UploadModal';
import {
  ShieldCheck,
  PlusCircle,
  LayoutDashboard,
  Film,
  DownloadCloud,
  Calendar,
  Settings,
  X
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Import & Upload Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
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

  // Quick bottom nav items for mobile
  const mobileNavItems: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'videos', label: 'Kho Video', icon: Film },
    { id: 'sources', label: 'Nguồn', icon: DownloadCloud },
    { id: 'calendar', label: 'Lịch đăng', icon: Calendar },
    { id: 'settings', label: 'Cài đặt', icon: Settings }
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-slate-950">
      {/* Sidebar Navigation (Desktop persistent, Mobile slide-over drawer) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          systemStatus={systemHealth}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8 min-w-0">
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
              onOpenUpload={() => setIsUploadModalOpen(true)}
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

      {/* Mobile Bottom Navigation Dock (Visible on mobile/tablet < lg) */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md px-2 py-1.5 flex items-center justify-around lg:hidden safe-bottom shadow-2xl">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-teal-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-teal-500/15' : ''
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] mt-0.5 leading-none tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Global Douyin Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-teal-400" />
                <span>Tiếp nhận Video từ Douyin</span>
              </h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportDouyin} className="space-y-4 text-xs sm:text-xs">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm sm:text-xs"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm sm:text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Xác nhận quyền sở hữu / cấp phép (Rights Status):
                </label>
                <select
                  value={importRightsStatus}
                  onChange={(e) => setImportRightsStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm sm:text-xs"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm sm:text-xs"
                />
              </div>

              <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-[11px] text-teal-300 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>
                  Video sau khi tiếp nhận sẽ được đưa vào hàng đợi tự động: Tải ➔ Kiểm tra FFmpeg 9:16 ➔ Tạo AI Metadata ➔ Chờ duyệt.
                </span>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium text-center"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingImport}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-lg shadow-teal-500/20 text-center"
                >
                  {isSubmittingImport ? 'Đang tiếp nhận...' : 'Xác nhận tiếp nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-File Video Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={loadData}
      />
    </div>
  );
};
