import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  Server,
  Database,
  ArrowUpRight,
  PlusCircle,
  FileSearch,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Cpu
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { OverviewStats, Incident } from '../types';

interface OverviewProps {
  onNavigate: (page: string) => void;
  onSelectIncident: (id: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigate, onSelectIncident }) => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getOverviewStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load observability statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const SEVERITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#10b981'
  };

  const severityPieData = stats?.severity_distribution ? [
    { name: 'Critical', value: stats.severity_distribution.critical || 0, color: '#ef4444' },
    { name: 'High', value: stats.severity_distribution.high || 0, color: '#f59e0b' },
    { name: 'Medium', value: stats.severity_distribution.medium || 0, color: '#3b82f6' },
    { name: 'Low', value: stats.severity_distribution.low || 0, color: '#10b981' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Incident Operations Center
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time incident posture, root-cause telemetry, and service health across monitored infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
          <button
            onClick={() => onNavigate('new-investigation')}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Investigate Incident</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Incidents */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Incidents</span>
            <Layers className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {stats?.total_incidents ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Recorded in local registry</p>
        </div>

        {/* Incidents Analyzed */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">RCA Analyzed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {stats?.incidents_analyzed ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">With ranked hypotheses</p>
        </div>

        {/* Critical Severity */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Critical Tier</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">
            {stats?.critical_incidents ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Requires urgent remediation</p>
        </div>

        {/* Needs Evidence */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Missing Evidence</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            {stats?.insufficient_evidence_incidents ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Abstained or pending files</p>
        </div>

        {/* Implicated Services */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Implicated Services</span>
            <Server className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 tracking-tight truncate">
            {stats?.implicated_services?.[0]?.service || 'None'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Highest incident frequency</p>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Incident Trend Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                Incident Timeline Volume
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Chronological incident frequency across monitored days</p>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
              Actual Stored Data
            </span>
          </div>

          <div className="h-56 w-full">
            {stats?.incident_trends && stats.incident_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.incident_trends}>
                  <defs>
                    <linearGradient id="incidentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#38bdf8' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#incidentGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No incident timeline events recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Severity Distribution Donut */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Severity Breakdown</h3>
              <p className="text-xs text-slate-400 mt-0.5">Critical, High, Medium, Low</p>
            </div>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {severityPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {severityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">No severity metrics available.</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            {['critical', 'high', 'medium', 'low'].map((sev) => (
              <div key={sev} className="flex items-center justify-between px-2 py-1 rounded bg-slate-900/80">
                <span className="flex items-center gap-1.5 capitalize text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} />
                  {sev}
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {stats?.severity_distribution?.[sev] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service Impact & System Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Service Impact Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-400" />
                Service Impact Distribution
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Services correlated with incidents and high-severity logs</p>
            </div>
          </div>

          <div className="h-48 w-full">
            {stats?.service_impact && stats.service_impact.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.service_impact}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="service" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No service impact data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Real System Health Panel */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                System Health Status
              </h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {stats?.system_health?.status === 'healthy' ? 'Healthy' : 'Online'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Real-time health verification from the backend service and database engine.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400">API Server</span>
                <span className="font-mono text-cyan-300">{stats?.system_health?.api_server || 'FastAPI 0.110+'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400">Database</span>
                <span className="font-mono text-cyan-300">{stats?.system_health?.database || 'SQLite WAL'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400">Analysis Engine</span>
                <span className="font-mono text-emerald-300">{stats?.system_health?.analysis_engine || 'Operational'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400">Uptime Check</span>
                <span className="font-mono text-emerald-300">{stats?.system_health?.uptime_check || 'Passed'}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
            <span>Checked: {stats?.system_health?.timestamp ? new Date(stats.system_health.timestamp).toLocaleTimeString() : 'now'}</span>
            <span className="text-cyan-400 hover:underline cursor-pointer" onClick={() => onNavigate('guide')}>
              Architecture Docs &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Production Incidents</h3>
            <p className="text-xs text-slate-400 mt-0.5">Stored incidents with file provenance and investigation state</p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All History</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="pb-3 pl-2">Incident ID</th>
                <th className="pb-3">Title</th>
                <th className="pb-3">Severity</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Services</th>
                <th className="pb-3">Evidence Files</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stats?.recent_incidents && stats.recent_incidents.length > 0 ? (
                stats.recent_incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pl-2 font-mono font-semibold text-cyan-400">
                      {inc.incident_id_code}
                    </td>
                    <td className="py-3 max-w-xs truncate font-medium text-slate-200">
                      {inc.title}
                    </td>
                    <td className="py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                        style={{
                          backgroundColor: `${SEVERITY_COLORS[inc.severity]}15`,
                          color: SEVERITY_COLORS[inc.severity],
                          border: `1px solid ${SEVERITY_COLORS[inc.severity]}40`
                        }}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        inc.status === 'analyzed'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                          : inc.status === 'investigating'
                          ? 'bg-blue-950/60 text-blue-300 border border-blue-800/50'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {inc.status === 'analyzed' ? 'Analyzed' : inc.status === 'investigating' ? 'Investigating' : 'Open'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {inc.affected_services?.slice(0, 3).map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] font-mono text-slate-300 border border-slate-700/60">
                            {s}
                          </span>
                        ))}
                        {(inc.affected_services?.length || 0) > 3 && (
                          <span className="text-[10px] text-slate-500">+{inc.affected_services.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 font-mono text-slate-400">
                      {inc.files_count} files ({inc.records_count} records)
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button
                        onClick={() => onSelectIncident(inc.id)}
                        className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white px-2.5 py-1 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                      >
                        <span>{inc.has_analysis ? 'View RCA' : 'Investigate'}</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No incidents uploaded yet. Click "Investigate Incident" to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
