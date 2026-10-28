import React from 'react';
import { Settings as SettingsIcon, User, ShieldCheck, Database, Server, LogOut, CheckCircle2 } from 'lucide-react';
import { User as UserType } from '../types';

interface SettingsPageProps {
  user: UserType | null;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-cyan-400" />
          Settings & Environment
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Local development environment, user profile, and runtime configuration.
        </p>
      </div>

      {/* User Profile */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <User className="h-4 w-4 text-cyan-400" />
          Active SRE Profile
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[10px] mb-1">Full Name</span>
            <span className="text-slate-200 font-bold">{user?.full_name || 'Demo SRE'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[10px] mb-1">Email</span>
            <span className="text-cyan-300">{user?.email || 'demo@incidentiq.local'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[10px] mb-1">Account ID</span>
            <span className="text-slate-400 truncate block">{user?.id || 'local-demo-uuid'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[10px] mb-1">Session Scope</span>
            <span className="text-emerald-400">Authenticated (JWT)</span>
          </div>
        </div>
      </div>

      {/* Runtime Environment Info */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Server className="h-4 w-4 text-blue-400" />
          Local Runtime Architecture
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800 font-mono">
            <span className="text-slate-400">Backend API</span>
            <span className="text-cyan-400">FastAPI 0.110+ on Python 3.13 (Port 8000)</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800 font-mono">
            <span className="text-slate-400">Frontend Stack</span>
            <span className="text-cyan-400">React 18, Vite 5, Tailwind CSS, Recharts (Port 5173)</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800 font-mono">
            <span className="text-slate-400">Storage Layer</span>
            <span className="text-cyan-400">SQLite 3 (WAL Journal Mode)</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800 font-mono">
            <span className="text-slate-400">External API Dependencies</span>
            <span className="text-emerald-400 font-bold">None (100% Offline / Local Execution)</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out of Session</span>
        </button>
      </div>
    </div>
  );
};
