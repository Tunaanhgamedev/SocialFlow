import React from 'react';
import { Bell, Sparkles, RefreshCw, Menu } from 'lucide-react';

interface HeaderProps {
  systemStatus: {
    status: string;
    services?: {
      database?: { status: string };
      redis?: { connected: boolean };
    };
  } | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemStatus,
  onRefresh,
  isRefreshing,
  onToggleMobileMenu
}) => {
  const isHealthy = systemStatus?.status === 'healthy';

  return (
    <header className="h-16 bg-slate-900/80 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-30 safe-top">
      {/* Left side: Hamburger button on mobile + System Health Badge */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile menu toggle button */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg lg:hidden transition-colors"
          title="Mở menu điều hướng"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* System Online / Degraded Badge */}
        <div className="flex items-center space-x-2 bg-slate-950/50 px-2.5 py-1.5 rounded-full border border-slate-800">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isHealthy ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isHealthy ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 hidden xs:inline sm:inline">
            {isHealthy ? 'System Online' : 'System Degraded'}
          </span>
        </div>
      </div>

      {/* Right side: Actions & Studio Badge */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-750 active:scale-95 border border-slate-700/60 rounded-lg transition-all"
          title="Làm mới trạng thái"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
          <span className="hidden sm:inline">Làm mới</span>
        </button>

        {/* Studio Badge - hidden on small mobile to avoid header clutter */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/40 text-xs text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span className="truncate max-w-[140px]">Cos Dolove Studio</span>
        </div>

        {/* Notification Bell */}
        <button
          className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 relative transition-colors"
          title="Thông báo"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
        </button>
      </div>
    </header>
  );
};
