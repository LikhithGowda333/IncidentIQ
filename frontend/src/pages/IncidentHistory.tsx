import React, { useEffect, useState } from 'react';
import { Clock, Search, Filter, ArrowUpRight, PlusCircle, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { Incident } from '../types';

interface IncidentHistoryProps {
  onSelectIncident: (id: string) => void;
  onNewInvestigation: () => void;
}

export const IncidentHistory: React.FC<IncidentHistoryProps> = ({
  onSelectIncident,
  onNewInvestigation
}) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidents({
        severity: severityFilter === 'all' ? undefined : severityFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined
      });
      setIncidents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch incidents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [severityFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIncidents();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this incident and all associated evidence?')) {
      try {
        await api.deleteIncident(id);
        fetchIncidents();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const SEVERITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#10b981'
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-400" />
            Incident History & Investigation Registry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit trail of all recorded production outages, ingested telemetry bundles, and RCA results.
          </p>
        </div>

        <button
          onClick={onNewInvestigation}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Investigation</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/50">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, title, or service..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="analyzed">Analyzed</option>
            <option value="investigating">Investigating</option>
            <option value="open">Open</option>
          </select>

          <button
            onClick={fetchIncidents}
            className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold text-[10px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Incident Code</th>
                <th className="py-3 px-4">Title & Context</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Affected Services</th>
                <th className="py-3 px-4">Evidence Records</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading incident history...
                  </td>
                </tr>
              ) : incidents.length > 0 ? (
                incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => onSelectIncident(inc.id)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                      {inc.incident_id_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200 truncate max-w-sm">{inc.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {new Date(inc.created_at).toLocaleDateString()} &bull; {inc.environment}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        inc.status === 'analyzed'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : inc.status === 'investigating'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs font-mono">
                        {inc.affected_services?.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {inc.files_count} files ({inc.records_count} rows)
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectIncident(inc.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-200 text-xs font-medium transition-colors"
                        >
                          View RCA
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, inc.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Delete incident"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No incidents match the selected filter.
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
