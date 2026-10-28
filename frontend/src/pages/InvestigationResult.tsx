import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  Server,
  Database,
  ArrowLeft,
  Download,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Eye,
  Info,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Cpu,
  Workflow,
  Sparkles,
  FileCode,
  FileText,
  FileSearch
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import { Incident, AnalysisResult, Hypothesis, TimelineEvent, EvidenceRecord } from '../types';

interface InvestigationResultProps {
  incidentId: string;
  onBack: () => void;
  onNavigateToTimeline?: () => void;
}

export const InvestigationResult: React.FC<InvestigationResultProps> = ({
  incidentId,
  onBack
}) => {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'hypotheses' | 'timeline' | 'metrics' | 'topology' | 'evidence' | 'checks'>('hypotheses');

  // Expanded hypothesis details state
  const [expandedHypothesis, setExpandedHypothesis] = useState<number | null>(1);

  // Evidence record detail modal
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Evidence Explorer Filters
  const [evidenceFilterCategory, setEvidenceFilterCategory] = useState<string>('all');
  const [evidenceFilterService, setEvidenceFilterService] = useState<string>('all');
  const [evidenceSearchTerm, setEvidenceSearchTerm] = useState<string>('');
  const [evidenceRecords, setEvidenceRecords] = useState<EvidenceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Fetch Incident & Analysis Result
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const inc = await api.getIncident(incidentId);
      setIncident(inc);
      const res = await api.getAnalysisResult(incidentId);
      setAnalysis(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load investigation results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [incidentId]);

  // Fetch Evidence Records when tab is opened
  useEffect(() => {
    if (activeTab === 'evidence') {
      const fetchRecords = async () => {
        setRecordsLoading(true);
        try {
          const res = await api.getEvidenceRecords(incidentId, {
            category: evidenceFilterCategory === 'all' ? undefined : evidenceFilterCategory,
            service: evidenceFilterService === 'all' ? undefined : evidenceFilterService,
            search: evidenceSearchTerm || undefined,
            limit: 100
          });
          setEvidenceRecords(res.items);
        } catch (e) {
          console.error(e);
        } finally {
          setRecordsLoading(false);
        }
      };
      fetchRecords();
    }
  }, [activeTab, evidenceFilterCategory, evidenceFilterService, evidenceSearchTerm, incidentId]);

  const handleExport = (format: 'json' | 'csv') => {
    const url = api.getReportDownloadUrl(incidentId, format);
    window.open(url, '_blank');
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'High evidence support':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
      case 'Moderate evidence support':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60';
      case 'Low evidence support':
        return 'text-amber-400 bg-amber-950/60 border-amber-800/60';
      default:
        return 'text-rose-400 bg-rose-950/60 border-rose-800/60';
    }
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'deployment':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      case 'log_error':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/60';
      case 'trace_failure':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/60';
      case 'metric_anomaly':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/60';
      case 'onset':
        return 'bg-red-950/80 text-red-300 border-red-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span className="text-xs text-slate-400">Loading incident investigation workspace...</span>
      </div>
    );
  }

  if (error || !incident || !analysis) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-6 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto" />
        <h3 className="text-sm font-bold text-white">Investigation Data Unavailable</h3>
        <p className="text-xs text-rose-300 max-w-md mx-auto">{error || 'Incident analysis has not completed yet.'}</p>
        <button
          onClick={onBack}
          className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
        >
          Return to Overview
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Incident Summary Banner */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <button
                onClick={onBack}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Back"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/50 px-2 py-0.5 rounded">
                {incident.incident_id_code}
              </span>
              <h2 className="text-lg font-bold text-white truncate max-w-xl">
                {incident.title}
              </h2>
            </div>
            <p className="text-xs text-slate-400 pl-9.5">
              {incident.description || 'No additional incident description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-2 pl-9.5 md:pl-0">
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Metadata Chips Row */}
        <div className="flex flex-wrap items-center gap-4 pt-3.5 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Severity:</span>
            <span className="font-bold uppercase tracking-wider text-[11px] text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded">
              {incident.severity}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <span className="font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">
              {incident.status}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Time Window:</span>
            <span className="font-mono text-slate-300">
              {incident.start_time ? new Date(incident.start_time).toUTCString().slice(5, 22) : 'Unknown'} &rarr;{' '}
              {incident.end_time ? new Date(incident.end_time).toUTCString().slice(5, 22) : 'Present'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Affected Services:</span>
            <div className="flex gap-1 font-mono text-cyan-300">
              {incident.affected_services?.map((s) => (
                <span key={s} className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 text-[10px]">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Abstention Banner if triggered */}
        {analysis.is_abstention && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold block mb-0.5">Engine Abstention: Insufficient Diagnostic Evidence</span>
              {analysis.summary} Telemetry density was insufficient to confirm causal root cause with statistical certainty. Review Recommended Next Checks below.
            </div>
          </div>
        )}
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto text-xs">
        {[
          { id: 'hypotheses', label: `Root-Cause Hypotheses (${analysis.ranked_hypotheses.length})`, icon: Sparkles },
          { id: 'timeline', label: `Incident Timeline (${analysis.timeline_events.length})`, icon: Clock },
          { id: 'metrics', label: 'Metrics Time Series', icon: TrendingUp },
          { id: 'topology', label: `Service Topology (${analysis.service_dependencies?.nodes?.length || 0})`, icon: Workflow },
          { id: 'evidence', label: 'Evidence Explorer', icon: FileSearch },
          { id: 'checks', label: `Next Checks (${analysis.next_checks.length})`, icon: CheckCircle2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold transition-all border-b-2 cursor-pointer ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: Ranked Root-Cause Hypotheses ================= */}
      {activeTab === 'hypotheses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ranked by transparent heuristic evidence weight and temporal correlation</span>
            <span className="font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Heuristic Score Range: 0.05 – 0.96
            </span>
          </div>

          <div className="space-y-4">
            {analysis.ranked_hypotheses.map((hyp) => {
              const isExpanded = expandedHypothesis === hyp.rank;
              return (
                <div
                  key={hyp.rank}
                  className={`rounded-xl border transition-all ${
                    hyp.rank === 1 && !analysis.is_abstention
                      ? 'border-cyan-500/40 bg-[#0d1424] shadow-md shadow-cyan-950/30'
                      : 'border-slate-800/80 bg-slate-900/50'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    onClick={() => setExpandedHypothesis(isExpanded ? null : hyp.rank)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-cyan-400">
                        #{hyp.rank}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-snug">
                          {hyp.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
                          {hyp.explanation}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-10 sm:pl-0 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-sm font-bold text-cyan-300">
                          {(hyp.score * 100).toFixed(0)}%
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getTierColor(hyp.confidence_tier)}`}>
                          {hyp.confidence_tier}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Hypothesis Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 p-5 space-y-5 bg-slate-950/40 rounded-b-xl">
                      {/* Formula Breakdown Banner */}
                      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-300">Explainable Scoring Logic:</span>
                          <span className="font-mono text-[11px] text-cyan-400">{hyp.score_formula_breakdown?.formula}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {hyp.score_formula_breakdown?.interpretation}
                        </p>
                      </div>

                      {/* Supporting Evidence Citations */}
                      <div>
                        <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Supporting Evidence Records ({hyp.supporting_evidence.length})
                        </h4>
                        <div className="space-y-1.5">
                          {hyp.supporting_evidence.map((cit, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedRecord(cit)}
                              className="flex items-start justify-between p-2.5 rounded border border-slate-800/80 bg-slate-900/60 hover:border-cyan-500/50 hover:bg-slate-800/50 text-xs transition-colors cursor-pointer"
                            >
                              <div className="space-y-0.5">
                                <span className="text-slate-200 block">{cit.summary}</span>
                                <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                                  <span className="text-cyan-400">{cit.file_name}</span>
                                  <span>&bull;</span>
                                  <span>Row #{cit.row_number}</span>
                                  {cit.timestamp && (
                                    <>
                                      <span>&bull;</span>
                                      <span>{cit.timestamp}</span>
                                    </>
                                  )}
                                  {cit.service && (
                                    <>
                                      <span>&bull;</span>
                                      <span className="text-slate-400">svc: {cit.service}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Eye className="h-3.5 w-3.5 text-slate-500 mt-1 shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Contradicting Evidence */}
                      {hyp.contradicting_evidence.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Contradicting / Weakening Evidence ({hyp.contradicting_evidence.length})
                          </h4>
                          <div className="space-y-1.5">
                            {hyp.contradicting_evidence.map((cit, idx) => (
                              <div
                                key={idx}
                                onClick={() => setSelectedRecord(cit)}
                                className="flex items-start justify-between p-2.5 rounded border border-amber-900/40 bg-amber-950/20 text-xs cursor-pointer hover:border-amber-700/60"
                              >
                                <div className="space-y-0.5">
                                  <span className="text-amber-200 block">{cit.summary}</span>
                                  <div className="flex items-center gap-2 font-mono text-[10px] text-amber-400/70">
                                    <span>{cit.file_name}</span>
                                    <span>&bull;</span>
                                    <span>Row #{cit.row_number}</span>
                                  </div>
                                </div>
                                <Eye className="h-3.5 w-3.5 text-amber-400/80 mt-1 shrink-0" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Alternative Explanations & Next Checks */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
                          <span className="text-xs font-semibold text-slate-300 block mb-1.5">Alternative Explanations:</span>
                          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                            {hyp.alternative_explanations.map((alt, idx) => (
                              <li key={idx} className="leading-relaxed">{alt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
                          <span className="text-xs font-semibold text-slate-300 block mb-1.5">Recommended Next Checks:</span>
                          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                            {hyp.recommended_next_checks.map((chk, idx) => (
                              <li key={idx} className="leading-relaxed text-cyan-300/90">{chk}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: Interactive Incident Timeline ================= */}
      {activeTab === 'timeline' && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Chronological Incident Timeline
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every event links back to the original source file and row number. No synthetic events invented.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {analysis.timeline_events.length} Telemetry Events
            </span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {analysis.timeline_events.map((evt) => (
              <div key={evt.id} className="relative group">
                {/* Event Marker Dot */}
                <div className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-[#090d16] ${
                  evt.event_type === 'deployment' ? 'bg-amber-400' :
                  evt.event_type === 'log_error' ? 'bg-rose-500' :
                  evt.event_type === 'trace_failure' ? 'bg-purple-500' :
                  evt.event_type === 'metric_anomaly' ? 'bg-blue-400' :
                  evt.event_type === 'onset' ? 'bg-red-500 ring-4 ring-red-500/20' : 'bg-slate-400'
                }`} />

                <div
                  onClick={() => setSelectedRecord(evt)}
                  className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-3.5 hover:border-cyan-500/50 hover:bg-slate-800/40 transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getEventBadgeColor(evt.event_type)} uppercase`}>
                        {evt.event_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{evt.title}</span>
                    </div>
                    <span className="font-mono text-[11px] text-cyan-400">
                      {evt.timestamp ? new Date(evt.timestamp).toUTCString().slice(17, 25) : 'Unknown'} UTC
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-2">
                    {evt.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>Source: <span className="text-slate-400">{evt.source_file}</span></span>
                      <span>&bull;</span>
                      <span>Row: #{evt.source_row}</span>
                      {evt.service && (
                        <>
                          <span>&bull;</span>
                          <span>Service: <span className="text-cyan-400">{evt.service}</span></span>
                        </>
                      )}
                    </div>
                    <span className="text-cyan-400 group-hover:underline flex items-center gap-1">
                      Inspect Record &rarr;
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: Metrics Visualizations ================= */}
      {activeTab === 'metrics' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Observed Time-Series Metrics
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Metrics extracted directly from uploaded time-series records. Only metrics present in uploaded telemetry are plotted.
            </p>

            {analysis.timeline_events.filter(e => e.event_type === 'metric_anomaly').length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analysis.timeline_events
                      .filter(e => e.event_type === 'metric_anomaly')
                      .map(e => ({
                        time: e.timestamp ? e.timestamp.slice(11, 19) : '',
                        value: e.description.match(/[\d\.]+/)?.[0] ? parseFloat(e.description.match(/[\d\.]+/)?.[0]!) : 50,
                        name: e.title
                      }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4, fill: '#06b6d4' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 rounded-lg border border-slate-800 bg-slate-950/40">
                No metric anomalies or CPU/latency metrics detected in the uploaded evidence dataset.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: Service Topology Map ================= */}
      {activeTab === 'topology' && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Workflow className="h-4 w-4 text-cyan-400" />
                Service Dependency Graph
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upstream and downstream topology highlighting failure propagation.
              </p>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 bg-slate-800 px-2 py-0.5 rounded">
              {analysis.service_dependencies.has_uploaded_graph ? 'Uploaded Graph' : 'Inferred Topology'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {analysis.service_dependencies.nodes.map((node) => (
              <div
                key={node.id}
                className={`rounded-lg border p-4 space-y-2 transition-all ${
                  node.status === 'critical'
                    ? 'border-rose-500/60 bg-rose-950/20'
                    : node.status === 'degraded'
                    ? 'border-amber-500/60 bg-amber-950/20'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white">{node.name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                    node.status === 'critical'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : node.status === 'degraded'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {node.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Observed Errors:</span>
                    <span className="font-mono text-slate-200 font-bold">{node.error_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Anomaly Detected:</span>
                    <span className="font-mono text-slate-200">{node.anomaly_detected ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dependencies Edges List */}
          {analysis.service_dependencies.edges.length > 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <span className="text-xs font-semibold text-slate-300 block mb-2">Service Call Edges:</span>
              <div className="flex flex-wrap gap-2">
                {analysis.service_dependencies.edges.map((edge, idx) => (
                  <span key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                    <span className="text-cyan-400">{edge.source}</span>
                    <span className="text-slate-500">&rarr;</span>
                    <span className="text-blue-400">{edge.target}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: Evidence Explorer ================= */}
      {activeTab === 'evidence' && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-cyan-400" />
                Evidence Record Explorer
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Filter and inspect individual raw telemetry records with row-level traceability.</p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <select
                value={evidenceFilterCategory}
                onChange={(e) => setEvidenceFilterCategory(e.target.value)}
                className="h-8 px-2 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="all">All Categories</option>
                <option value="logs">Logs</option>
                <option value="metrics">Metrics</option>
                <option value="traces">Traces</option>
                <option value="deployments">Deployments</option>
                <option value="dependencies">Dependencies</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">File / Row</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Severity / Value</th>
                  <th className="py-2.5 px-3">Message / Operation</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {recordsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Loading evidence records...
                    </td>
                  </tr>
                ) : evidenceRecords.length > 0 ? (
                  evidenceRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 text-cyan-400 font-bold">
                        {rec.file_name}:#{rec.row_number}
                      </td>
                      <td className="py-2 px-3 uppercase text-[10px] text-slate-300">{rec.category}</td>
                      <td className="py-2 px-3 text-slate-200">{rec.service || '-'}</td>
                      <td className="py-2 px-3">
                        {rec.metric_value !== null && rec.metric_value !== undefined ? (
                          <span className="text-blue-300 font-bold">{rec.metric_value}</span>
                        ) : rec.severity ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            ['ERROR', 'CRITICAL'].includes(rec.severity.toUpperCase()) ? 'text-rose-400 bg-rose-950/60' : 'text-slate-400'
                          }`}>
                            {rec.severity}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-3 truncate max-w-xs text-slate-300">
                        {rec.message || rec.metric_name || '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 6: Recommended Next Checks ================= */}
      {activeTab === 'checks' && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              Prioritized Remediation & Investigation Checks
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Grounded actions generated directly from observed anomalies and evidence gaps.
            </p>
          </div>

          <div className="space-y-3">
            {analysis.next_checks.map((chk, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3.5 text-xs text-slate-200"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400">
                  {idx + 1}
                </div>
                <div className="leading-relaxed font-medium">
                  {chk}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg border border-slate-800 bg-slate-950/60">
            <span className="text-xs font-semibold text-slate-300 block mb-1">Documented Investigation Limitations:</span>
            <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
              {analysis.limitations.map((lim, idx) => (
                <li key={idx} className="leading-relaxed">{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Detail Modal / Drawer for Provenance Record Inspection */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-700 bg-[#0d1424] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white">
                  Evidence Provenance Record
                </h4>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                &times; Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-500">Source File:</span>
                <span className="text-cyan-400">{selectedRecord.file_name || selectedRecord.source_file || 'unknown'}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-500">Source Row Number:</span>
                <span className="text-slate-200">#{selectedRecord.row_number || selectedRecord.source_row || 'N/A'}</span>
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
              <span className="text-xs font-semibold text-slate-300 block mb-1">Raw Record Content:</span>
              <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                {typeof selectedRecord.raw_data === 'object'
                  ? JSON.stringify(selectedRecord.raw_data, null, 2)
                  : selectedRecord.summary || selectedRecord.description || JSON.stringify(selectedRecord, null, 2)}
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
