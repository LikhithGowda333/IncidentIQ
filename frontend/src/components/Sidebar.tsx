import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  Search,
  Network,
  FileText,
  BookOpen,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  user: User | null;
  onLogout: () => void;
  backendHealthy: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  user,
  onLogout,
  backendHealthy
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'new-investigation', label: 'New Investigation', icon: PlusCircle, highlight: true },
    { id: 'history', label: 'Incident History', icon: Clock },
    { id: 'evidence-explorer', label: 'Evidence Explorer', icon: Search },
    { id: 'service-map', label: 'Service Map', icon: Network },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'guide', label: 'Project Guide', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative z-20 flex flex-col border-r border-slate-800/80 bg-[#0a0f1d] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-violet-600/20 border border-cyan-500/30 text-cyan-400">
            <Activity className="h-5 w-5 animate-pulse text-cyan-400" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className={`inline-flex h-full w-full rounded-full ${backendHealthy ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75 animate-ping`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${backendHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Incident<span className="text-cyan-400">IQ</span>
                <span className="rounded bg-cyan-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-800/50">
                  v1.0
                </span>
              </span>
              <span className="text-[11px] text-slate-400 truncate">RCA & Investigation</span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:bg-slate-700/50 hover:text-white"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : item.highlight
                  ? 'bg-slate-800/40 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                  isActive ? 'text-cyan-400' : item.highlight ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!collapsed && (
                <span className="flex-1 truncate text-left">{item.label}</span>
              )}
              {!collapsed && item.highlight && (
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                  New
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Backend Health Badge */}
      {!collapsed && (
        <div className="mx-3 mb-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-medium">Backend Health</span>
            <span className={`inline-flex items-center gap-1.5 font-semibold ${backendHealthy ? 'text-emerald-400' : 'text-amber-400'}`}>
              <span className={`h-2 w-2 rounded-full ${backendHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {backendHealthy ? 'Operational' : 'Degraded'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Local SQLite WAL mode active. Rule-based analysis engine online.
          </p>
        </div>
      )}

      {/* User Footer */}
      <div className="border-t border-slate-800/80 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-xs font-bold text-white shadow-sm">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="truncate text-xs font-semibold text-slate-200">
                  {user?.full_name || 'SRE Engineer'}
                </span>
                <span className="truncate text-[10px] text-slate-400">
                  {user?.email || 'local@incidentiq'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
