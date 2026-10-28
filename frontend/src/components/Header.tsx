import React, { useState } from 'react';
import {
  Search,
  Bell,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: User | null;
  onSearch?: (term: string) => void;
  backendHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  user,
  onSearch,
  backendHealthy
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'overview':
        return 'Observability Overview';
      case 'new-investigation':
        return 'New Incident Investigation';
      case 'investigation-result':
        return 'Investigation Workspace';
      case 'history':
        return 'Incident History & Analysis Log';
      case 'evidence-explorer':
        return 'Evidence & Telemetry Explorer';
      case 'service-map':
        return 'Service Dependency Topology';
      case 'reports':
        return 'Incident Reports & Export';
      case 'guide':
        return 'Platform Documentation & RCA Guide';
      case 'settings':
        return 'System & Profile Settings';
      default:
        return 'IncidentIQ Platform';
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#090d16]/90 px-6 backdrop-blur-md">
      {/* Left: Breadcrumbs & Page Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center text-xs text-slate-400">
          <span className="hover:text-slate-200 cursor-pointer" onClick={() => onNavigate('overview')}>IncidentIQ</span>
          <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-slate-600" />
          <span className="text-cyan-400 font-medium capitalize">{currentPage.replace('-', ' ')}</span>
        </div>
        <h1 className="hidden sm:block text-sm font-bold text-white border-l border-slate-800 pl-3">
          {getPageTitle(currentPage)}
        </h1>
      </div>

      {/* Middle: Search incidents */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative max-w-sm w-full mx-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search incidents, services, traces..."
          className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
        />
      </form>

      {/* Right: Actions & Status */}
      <div className="flex items-center gap-3">
        {/* Backend health status pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/60 text-[11px]">
          <span className={`h-2 w-2 rounded-full ${backendHealthy ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
          <span className="text-slate-300 font-medium">{backendHealthy ? 'FastAPI 8000: Ready' : 'Backend Connecting...'}</span>
        </div>

        {/* Quick Guide link */}
        <button
          onClick={() => onNavigate('guide')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-cyan-400 hover:border-slate-700 transition-colors"
          title="Project Guide & Methodology"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* New Investigation Button */}
        <button
          onClick={() => onNavigate('new-investigation')}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-cyan-400 hover:to-blue-500 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          <span className="hidden sm:inline">New Investigation</span>
        </button>
      </div>
    </header>
  );
};
