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
  Sparkles
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
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
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

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand logo */}
      <div className="h-16 px-6 flex items-center space-x-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-teal-200 to-emerald-300 bg-clip-text text-transparent">
            SocialFlow
          </span>
          <span className="text-[10px] block text-slate-400 font-medium tracking-wide uppercase">
            Phase 1 Foundation
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-4 space-y-1.5 flex-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Quản lý tổng hợp
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
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
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
          <div className="text-slate-300 font-semibold mb-1">Cos Dolove Auto Flow</div>
          <div className="text-slate-400 text-[11px] leading-relaxed">
            Hệ thống tự động hóa Douyin ➜ Reels Facebook
          </div>
        </div>
      </div>
    </aside>
  );
};
