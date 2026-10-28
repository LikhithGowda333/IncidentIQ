import React, { useEffect, useState } from 'react';
import { FileSearch, Filter, Search, Eye, FileCode, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { api } from '../services/api';
import { Incident, EvidenceRecord } from '../types';

interface EvidenceExplorerPageProps {
  onSelectIncident: (id: string) => void;
}

export const EvidenceExplorerPage: React.FC<EvidenceExplorerPageProps> = ({ onSelectIncident }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [records, setRecords] = useState<EvidenceRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const list = await api.getIncidents();
        setIncidents(list);
        if (list.length > 0) {
          setSelectedIncidentId(list[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchIncidents();
  }, []);

  const fetchRecords = async () => {
    if (!selectedIncidentId) return;
    setLoading(true);
    try {
      const res = await api.getEvidenceRecords(selectedIncidentId, {
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        service: serviceFilter === 'all' ? undefined : serviceFilter,
        search: searchTerm || undefined,
        limit: 100
      });
      setRecords(res.items);
      setTotalRecords(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedIncidentId, categoryFilter, serviceFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-cyan-400" />
            Evidence & Telemetry Explorer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Query across parsed log records, telemetry time series, distributed trace spans, and deployments.
          </p>
        </div>

        {/* Incident Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Target Incident:</span>
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="h-8 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.incident_id_code} — {inc.title.slice(0, 30)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/50">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search record messages, metric names, trace IDs..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-200"
          >
            <option value="all">All Categories</option>
            <option value="logs">Logs</option>
            <option value="metrics">Metrics</option>
            <option value="traces">Traces</option>
            <option value="deployments">Deployments</option>
            <option value="dependencies">Dependencies</option>
          </select>

          <button
            onClick={fetchRecords}
            className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Evidence Records Table */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 overflow-hidden">
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex justify-between text-xs text-slate-400">
          <span>Found {totalRecords} evidence records</span>
          <span className="font-mono text-cyan-400">Traceability: 100% Grounded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">File / Line</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Severity / Val</th>
                <th className="py-2.5 px-3">Payload Summary</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading evidence telemetry...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-3 text-cyan-400 font-bold">
                      {r.file_name}:#{r.row_number}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {r.timestamp ? r.timestamp.slice(11, 19) : '-'}
                    </td>
                    <td className="py-2 px-3 uppercase text-[10px] text-slate-300">
                      {r.category}
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      {r.service || '-'}
                    </td>
                    <td className="py-2 px-3">
                      {r.metric_value !== null && r.metric_value !== undefined ? (
                        <span className="text-blue-300 font-bold">{r.metric_value}</span>
                      ) : r.severity ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          ['ERROR', 'CRITICAL'].includes(r.severity.toUpperCase()) ? 'text-rose-400 bg-rose-950/60' : 'text-slate-400'
                        }`}>
                          {r.severity}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-2 px-3 truncate max-w-sm text-slate-300">
                      {r.message || r.metric_name || JSON.stringify(r.raw_data)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No evidence records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-700 bg-[#0d1424] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white">
                  Evidence Telemetry Record #{selectedRecord.row_number}
                </h4>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                &times; Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-500">Source File:</span>
                <span className="text-cyan-400">{selectedRecord.file_name}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-500">Source Row:</span>
                <span className="text-slate-200">#{selectedRecord.row_number}</span>
              </div>
              {selectedRecord.timestamp && (
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-200">{selectedRecord.timestamp}</span>
                </div>
              )}
              {selectedRecord.service && (
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-500">Service:</span>
                  <span className="text-cyan-300">{selectedRecord.service}</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-1">Parsed Data:</span>
              <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                {JSON.stringify(selectedRecord.raw_data || selectedRecord, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
