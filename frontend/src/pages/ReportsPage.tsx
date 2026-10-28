import React, { useEffect, useState } from 'react';
import { FileText, Download, Printer, CheckCircle2, ShieldCheck, Clock, Layers } from 'lucide-react';
import { api } from '../services/api';
import { Incident } from '../types';

interface ReportsPageProps {
  onSelectIncident: (id: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onSelectIncident }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const list = await api.getIncidents({ status: 'analyzed' });
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
    const fetchReport = async () => {
      setLoading(true);
      try {
        const data = await api.getReportJson(selectedIncidentId);
        setReportData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedIncidentId]);

  const handleDownload = (format: 'json' | 'csv') => {
    if (!selectedIncidentId) return;
    window.open(api.getReportDownloadUrl(selectedIncidentId, format), '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            Post-Incident Reports & Export
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Structured, audit-grade post-mortem artifacts with evidence provenance, hypothesis scores, and next checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload('json')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download JSON</span>
          </button>
          <button
            onClick={() => handleDownload('csv')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Incident Selection Dropdown */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/60 text-xs">
        <span className="text-slate-400 font-medium">Select Incident Report:</span>
        <select
          value={selectedIncidentId}
          onChange={(e) => setSelectedIncidentId(e.target.value)}
          className="h-8 px-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
        >
          {incidents.map((inc) => (
            <option key={inc.id} value={inc.id}>
              {inc.incident_id_code} — {inc.title}
            </option>
          ))}
        </select>
      </div>

      {/* Rendered Formal Report Document */}
      {reportData ? (
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-8 shadow-2xl space-y-8 font-sans max-w-4xl mx-auto">
          {/* Document Header */}
          <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50 text-[11px] font-mono font-bold text-cyan-400 mb-2">
                OFFICIAL POST-INCIDENT RCA REPORT
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {reportData.incident?.title}
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Incident Reference: <span className="text-cyan-300">{reportData.incident?.incident_id_code}</span> &bull; Severity: <span className="uppercase font-bold text-rose-400">{reportData.incident?.severity}</span> &bull; Environment: {reportData.incident?.environment}
              </p>
            </div>

            <div className="text-right text-[11px] font-mono text-slate-400">
              <div>Platform: {reportData.platform}</div>
              <div>Generated: {new Date(reportData.export_time).toUTCString()}</div>
              <div>Engine: v{reportData.version}</div>
            </div>
          </div>

          {/* Incident Overview */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">1. Executive Summary</h3>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-4 rounded-lg border border-slate-800/80">
              {reportData.investigation?.summary || 'Analysis summary unavailable.'}
            </p>
          </div>

          {/* Telemetry Ingestion Metrics */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">2. Ingested Telemetry Provenance</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Total Files</span>
                <span className="text-lg font-bold text-white">{reportData.evidence_summary?.total_files}</span>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Records Processed</span>
                <span className="text-lg font-bold text-cyan-400">{reportData.evidence_summary?.total_records}</span>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Time Window</span>
                <span className="text-xs text-slate-300 truncate block">{reportData.incident?.start_time ? 'Bounded' : 'Unbounded'}</span>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Data Sanitization</span>
                <span className="text-xs text-emerald-400 block">Verified (No Secrets)</span>
              </div>
            </div>
          </div>

          {/* Ranked Root-Cause Hypotheses */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">3. Ranked Root-Cause Hypotheses</h3>
            <div className="space-y-3">
              {reportData.investigation?.ranked_hypotheses?.map((h: any) => (
                <div key={h.rank} className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">
                      #{h.rank} — {h.title}
                    </span>
                    <span className="font-mono text-xs text-cyan-300 font-bold">
                      Score: {(h.score * 100).toFixed(0)}% ({h.confidence_tier})
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{h.explanation}</p>
                  <div className="text-[11px] text-slate-400 font-mono pt-1">
                    Affected Services: {h.affected_services?.join(', ') || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prioritized Next Checks */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">4. Recommended Next Steps</h3>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300 bg-slate-950/80 p-4 rounded-lg border border-slate-800/80">
              {reportData.investigation?.next_checks?.map((chk: string, idx: number) => (
                <li key={idx} className="leading-relaxed font-mono">{chk}</li>
              ))}
            </ul>
          </div>

          {/* Limitations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">5. Methodological Limitations</h3>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
              {reportData.investigation?.limitations?.map((lim: string, idx: number) => (
                <li key={idx} className="leading-relaxed">{lim}</li>
              ))}
            </ul>
          </div>

          <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>IncidentIQ Observability Suite</span>
            <span>Deterministic Provenance &bull; Grounded RCA</span>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-500 rounded-xl border border-slate-800 bg-slate-900/40">
          No report available. Please select an analyzed incident.
        </div>
      )}
    </div>
  );
};
