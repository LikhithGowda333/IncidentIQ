import React, { useEffect, useState } from 'react';
import { Network, Server, ArrowRight, ShieldCheck, AlertTriangle, Layers, Activity } from 'lucide-react';
import { api } from '../services/api';
import { Incident, ServiceMapData } from '../types';

interface ServiceMapPageProps {
  onSelectIncident: (id: string) => void;
}

export const ServiceMapPage: React.FC<ServiceMapPageProps> = ({ onSelectIncident }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [mapData, setMapData] = useState<ServiceMapData | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!selectedIncidentId) return;
    const fetchTopology = async () => {
      setLoading(true);
      try {
        const data = await api.getServiceMap(selectedIncidentId);
        setMapData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTopology();
  }, [selectedIncidentId]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="h-5 w-5 text-cyan-400" />
            Service Dependency Topology
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Architecture map mapping upstream caller paths to downstream databases, caches, and third-party APIs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Context:</span>
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

      {loading ? (
        <div className="flex h-64 items-center justify-center text-xs text-slate-400">
          Loading service graph...
        </div>
      ) : mapData && mapData.nodes.length > 0 ? (
        <div className="space-y-6">
          {/* Status Header */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Topology Source:</span>
              <span className="font-mono text-cyan-400 font-semibold">
                {mapData.has_uploaded_graph ? 'Explicit Service Graph JSON' : 'Inferred from Observability Telemetry'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Healthy
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Degraded
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Critical
              </span>
            </div>
          </div>

          {/* Nodes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mapData.nodes.map((node) => (
              <div
                key={node.id}
                className={`rounded-xl border p-5 space-y-3 transition-all ${
                  node.status === 'critical'
                    ? 'border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-950/20'
                    : node.status === 'degraded'
                    ? 'border-amber-500/50 bg-amber-950/20 shadow-lg shadow-amber-950/20'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className={`h-4 w-4 ${
                      node.status === 'critical' ? 'text-rose-400' : node.status === 'degraded' ? 'text-amber-400' : 'text-cyan-400'
                    }`} />
                    <span className="font-mono text-sm font-bold text-white">{node.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    node.status === 'critical'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : node.status === 'degraded'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {node.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 font-mono pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Errors Encountered:</span>
                    <span className="font-bold text-slate-200">{node.error_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latency / Saturation:</span>
                    <span className="text-slate-200">{node.anomaly_detected ? 'Alert Fired' : 'Nominal'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Directed Call Graph */}
          {mapData.edges.length > 0 && (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Directed Dependency Flow:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mapData.edges.map((edge, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950 font-mono text-xs"
                  >
                    <span className="text-cyan-400 font-bold">{edge.source}</span>
                    <div className="flex flex-col items-center px-2">
                      <span className="text-[10px] text-slate-500">{edge.relationship || 'calls'}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <span className="text-blue-400 font-bold">{edge.target}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-500 text-xs">
          No service dependency graph or topology records found for this incident.
        </div>
      )}
    </div>
  );
};
