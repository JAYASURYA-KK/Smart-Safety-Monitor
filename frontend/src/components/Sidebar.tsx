import React from 'react';
import {
  LayoutDashboard,
  Video,
  ShieldAlert,
  BarChart3,
  History,
  Cpu,
  Settings,
} from 'lucide-react';

export type PageId =
  | 'overview'
  | 'monitoring'
  | 'alerts'
  | 'analytics'
  | 'history'
  | 'system'
  | 'settings';

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  activeAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  activeAlertsCount,
}) => {
  const menuItems = [
    { id: 'overview' as PageId, label: 'Overview', icon: LayoutDashboard },
    { id: 'monitoring' as PageId, label: 'Live Monitoring', icon: Video },
    {
      id: 'alerts' as PageId,
      label: 'Safety Alerts',
      icon: ShieldAlert,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
    },
    { id: 'analytics' as PageId, label: 'Analytics', icon: BarChart3 },
    { id: 'history' as PageId, label: 'Event History', icon: History },
    { id: 'system' as PageId, label: 'System & Model', icon: Cpu },
    { id: 'settings' as PageId, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between shrink-0 p-4">
      {/* Navigation Section */}
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Dashboard Views
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-xs font-bold bg-rose-600 text-white rounded-full animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span>YOLO Backend</span>
          <span className="text-emerald-400 font-medium">FastAPI v0.116</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Inference Device</span>
          <span className="text-cyan-400 font-medium">PyTorch CPU</span>
        </div>
        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          Smart Safety Monitor v2.0
        </div>
      </div>
    </aside>
  );
};
