import React from 'react';
import { Bell, Activity, Sparkles, RefreshCw } from 'lucide-react';

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
}

export const Header: React.FC<HeaderProps> = ({ systemStatus, onRefresh, isRefreshing }) => {
  const isHealthy = systemStatus?.status === 'healthy';

  return (
    <header className="h-16 bg-slate-900/80 border-b border-slate-800 px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isHealthy ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isHealthy ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isHealthy ? 'System Online' : 'System Degraded'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 rounded-lg transition-colors"
          title="Làm mới trạng thái"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
          <span>Làm mới</span>
        </button>

        <div className="flex items-center space-x-2 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/40 text-xs text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Cos Dolove Studio</span>
        </div>

        <button className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 rounded-lg border border-slate-700/50 relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
};
