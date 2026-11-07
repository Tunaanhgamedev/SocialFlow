import React from 'react';
import {
  LayoutDashboard,
  Film,
  DownloadCloud,
  Share2,
  Calendar,
  Layers,
  BarChart3,
  Settings,
  Sparkles,
  X
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'videos'
  | 'sources'
  | 'accounts'
  | 'calendar'
  | 'campaigns'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, isOpen = false, onClose }) => {
  const menuItems: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'videos', label: 'Video Library', icon: Film },
    { id: 'sources', label: 'Sources', icon: DownloadCloud },
    { id: 'accounts', label: 'Accounts', icon: Share2 },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'campaigns', label: 'Campaigns', icon: Layers },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleSelectTab = (tab: TabType) => {
    onTabChange(tab);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar (Drawer on mobile, Static on Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full'
        }`}
      >
        {/* Brand logo & mobile close button */}
        <div className="h-16 px-5 sm:px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-teal-200 to-emerald-300 bg-clip-text text-transparent">
                SocialFlow
              </span>
              <span className="text-[10px] block text-slate-400 font-medium tracking-wide uppercase">
                Multi-Platform Manager
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 sm:p-4 space-y-1.5 flex-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Quản lý tổng hợp
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Footer */}
        <div className="p-4 border-t border-slate-800/80 safe-bottom">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="text-slate-300 font-semibold mb-1">Cos Dolove Auto Flow</div>
            <div className="text-slate-400 text-[11px] leading-relaxed">
              Hệ thống tự động hóa Douyin ➜ Reels Facebook
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
