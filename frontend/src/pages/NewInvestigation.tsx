import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Server,
  Layers,
  HelpCircle,
  FileCode,
  FolderArchive,
  Trash2,
  Play,
  Info,
  Clock,
  Sparkles,
  RefreshCw,
  Cpu,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../services/api';
import { Incident, EvidenceFileSummary, ValidationSummary } from '../types';

interface NewInvestigationProps {
  onInvestigationComplete: (incidentId: string) => void;
  onCancel: () => void;
}

export const NewInvestigation: React.FC<NewInvestigationProps> = ({
  onInvestigationComplete,
  onCancel
}) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Details
  const [title, setTitle] = useState('');
  const [incidentCode, setIncidentCode] = useState(() => `INC-${Math.floor(1000 + Math.random() * 9000)}`);
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [servicesInput, setServicesInput] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [ticketRef, setTicketRef] = useState('');

  // Created Incident Object
  const [createdIncident, setCreatedIncident] = useState<Incident | null>(null);

  // Step 2 & 3: Upload files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedSummaries, setUploadedSummaries] = useState<EvidenceFileSummary[]>([]);
  const [expandedUploadGuide, setExpandedUploadGuide] = useState<string | null>('logs');

  // Step 4 & 5: Validation & Analysis
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // --- Step 1 Action: Create Incident ---
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Incident title is required.');
      return;
    }

    const servicesList = servicesInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setLoading(true);
    try {
      const inc = await api.createIncident({
        title: title.trim(),
        incident_id_code: incidentCode.trim(),
        description: description.trim(),
        start_time: timeUnknown ? undefined : startTime || undefined,
        end_time: timeUnknown ? undefined : endTime || undefined,
        severity,
        environment,
        affected_services: servicesList,
        symptoms: symptoms.trim(),
        ticket_ref: ticketRef.trim(),
      });
      setCreatedIncident(inc);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to create incident record.');
    } finally {
      setLoading(false);
    }
  };

  // --- File Selection Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Upload Files Action ---
  const handleUploadFiles = async () => {
    if (!createdIncident) return;
    if (selectedFiles.length === 0) {
      setError('Please select at least one evidence file or ZIP archive.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const summaries = await api.uploadEvidenceFiles(createdIncident.id, selectedFiles);
      setUploadedSummaries(summaries);
      const val = await api.getValidationSummary(createdIncident.id);
      setValidation(val);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'File upload and parsing failed.');
    } finally {
      setLoading(false);
    }
  };

  // --- Quick Load Synthetic Scenario ---
  const handleLoadSyntheticScenario = async (scenario: 'A' | 'B') => {
    if (!createdIncident) return;
    setLoading(true);
    setError(null);
    try {
      let fileList: { name: string; content: string; type: string }[] = [];
      if (scenario === 'A') {
        // Scenario A
        fileList = [
          {
            name: 'deployments.csv',
            type: 'text/csv',
            content: `timestamp,service,version,change_type,description,actor\n2026-10-28T14:15:00Z,checkout-service,v2.4.1,deployment,Deploy connection pool tuning and checkout retry logic,alex.dev@incidentiq.local\n`
          },
          {
            name: 'logs.csv',
            type: 'text/csv',
            content: `timestamp,service,level,message,trace_id\n2026-10-28T14:15:45Z,checkout-service,INFO,Warmup complete traffic routed to v2.4.1,tr-9013\n2026-10-28T14:16:10Z,checkout-service,ERROR,Database connection pool exhausted acquire timeout,tr-9014\n2026-10-28T14:16:22Z,api-gateway,ERROR,Upstream checkout-service returned HTTP 504 Gateway Timeout,tr-9015\n2026-10-28T14:16:40Z,checkout-service,CRITICAL,Deadlock detected during batch payment reservation,tr-9016\n`
          },
          {
            name: 'metrics.json',
            type: 'application/json',
            content: JSON.stringify([
              {"timestamp": "2026-10-28T14:15:00Z", "service": "checkout-service", "metric_name": "cpu_utilization", "value": 31.8},
              {"timestamp": "2026-10-28T14:16:00Z", "service": "checkout-service", "metric_name": "cpu_utilization", "value": 94.2},
              {"timestamp": "2026-10-28T14:16:00Z", "service": "checkout-service", "metric_name": "latency_p95_ms", "value": 4600.0},
              {"timestamp": "2026-10-28T14:16:00Z", "service": "database", "metric_name": "cpu_utilization", "value": 15.0}
            ])
          },
          {
            name: 'service_dependencies.json',
            type: 'application/json',
            content: JSON.stringify({
              "services": ["frontend-web", "api-gateway", "checkout-service", "database"],
              "dependencies": [
                {"source": "frontend-web", "target": "api-gateway"},
                {"source": "api-gateway", "target": "checkout-service"},
                {"source": "checkout-service", "target": "database"}
              ]
            })
          }
        ];
      } else {
        // Scenario B (Insufficient)
        fileList = [
          {
            name: 'logs.csv',
            type: 'text/csv',
            content: `timestamp,service,level,message\n2026-10-28T18:00:00Z,edge-proxy,INFO,TLS handshake completed successfully\n2026-10-28T18:00:15Z,edge-proxy,INFO,HTTP 200 GET /healthz 2ms\n`
          },
          {
            name: 'metrics.json',
            type: 'application/json',
            content: JSON.stringify([
              {"timestamp": "2026-10-28T18:00:00Z", "service": "edge-proxy", "metric_name": "cpu_utilization", "value": 14.0}
            ])
          }
        ];
      }

      // Convert to browser File objects
      const simulatedFiles = fileList.map(f => new File([f.content], f.name, { type: f.type }));
      setSelectedFiles(simulatedFiles);
      const summaries = await api.uploadEvidenceFiles(createdIncident.id, simulatedFiles);
      setUploadedSummaries(summaries);
      const val = await api.getValidationSummary(createdIncident.id);
      setValidation(val);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to load synthetic sample data.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 5 Action: Run Analysis ---
  const handleTriggerAnalysis = async () => {
    if (!createdIncident) return;
    setAnalyzing(true);
    setError(null);
    try {
      await api.analyzeIncident(createdIncident.id);
      onInvestigationComplete(createdIncident.id);
    } catch (err: any) {
      setError(err.message || 'Analysis run failed on the backend.');
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Wizard Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            New Incident Investigation
            {createdIncident && (
              <span className="font-mono text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">
                {createdIncident.incident_id_code}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Step-by-step evidence ingestion, schema normalization, and explainable root-cause discovery.
          </p>
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { num: 1, label: 'Incident Details' },
          { num: 2, label: 'Upload Guide' },
          { num: 3, label: 'Upload Files' },
          { num: 4, label: 'Schema Preview' },
          { num: 5, label: 'Analyze' }
        ].map((s) => (
          <div
            key={s.num}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
              step === s.num
                ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                : step > s.num
                ? 'border-emerald-600/60 bg-emerald-950/20 text-emerald-400'
                : 'border-slate-800 bg-slate-900/40 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-mono font-bold">0{s.num}</span>
            <span className="text-[11px] font-medium truncate w-full">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1 leading-relaxed">{error}</div>
        </div>
      )}

      {/* ================= STEP 1: Incident Details ================= */}
      {step === 1 && (
        <form onSubmit={handleCreateIncident} className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-5">
          <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-2">
            Step 1 — Incident Metadata & Context
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Incident Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Checkout Service 504 Gateway Timeouts Post-Deployment"
                className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Incident ID / Reference</label>
              <input
                type="text"
                value={incidentCode}
                onChange={(e) => setIncidentCode(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Incident Description & Scope</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief context on customer impact, timeline, or alert trigger..."
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full h-9 px-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="critical">Critical (P1 Outage)</option>
                <option value="high">High (P2 Degradation)</option>
                <option value="medium">Medium (P3 Partial)</option>
                <option value="low">Low (P4 Minor)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                className="w-full h-9 px-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Ticket Ref (Optional)</label>
              <input
                type="text"
                value={ticketRef}
                onChange={(e) => setTicketRef(e.target.value)}
                placeholder="e.g. JIRA-SRE-8821"
                className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Incident Start Time</label>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={timeUnknown}
                    onChange={(e) => setTimeUnknown(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500"
                  />
                  <span>Mark as Unknown</span>
                </label>
              </div>
              <input
                type="text"
                disabled={timeUnknown}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="2026-10-28T14:15:00Z"
                className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-slate-100 placeholder-slate-500 disabled:opacity-40 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Affected Services (Comma-separated)</label>
              <input
                type="text"
                value={servicesInput}
                onChange={(e) => setServicesInput(e.target.value)}
                placeholder="checkout-service, database, api-gateway"
                className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              <span>{loading ? 'Creating Incident...' : 'Continue to Evidence Guide'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* ================= STEP 2: "What Should I Upload?" Guide ================= */}
      {step === 2 && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-cyan-400" />
                Step 2 — What Should I Upload?
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload whatever evidence you have. Not every evidence type is mandatory. The platform correlates whatever telemetry is available.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">
              Formats: CSV, JSON, JSONL, LOG, ZIP
            </span>
          </div>

          {/* Quick Demo Buttons */}
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  Quick Evaluation Shortcuts
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Load pre-packaged synthetic datasets to test the full pipeline in 1 second.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadSyntheticScenario('A')}
                  disabled={loading}
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
                >
                  Load Scenario A (Checkout Deployment Outage)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSyntheticScenario('B')}
                  disabled={loading}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  Load Scenario B (Insufficient Evidence)
                </button>
              </div>
            </div>
          </div>

          {/* Evidence Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {[
              {
                id: 'logs',
                title: 'A. Application & Infrastructure Logs',
                formats: '.csv, .json, .jsonl, .log',
                desc: 'Identifies error surges, exception stack traces, connection timeouts, thread starvation, and retry storms.',
                fields: 'timestamp, service, level, message, trace_id, host'
              },
              {
                id: 'metrics',
                title: 'B. Time-Series Metrics',
                formats: '.csv, .json',
                desc: 'Demonstrates resource saturation (CPU/memory), latency spikes (p95/p99), and error rate surges relative to onset.',
                fields: 'timestamp, service, metric_name, value, unit'
              },
              {
                id: 'traces',
                title: 'C. Distributed Traces & Spans',
                formats: '.csv, .json, .jsonl',
                desc: 'Reconstructs end-to-end request calls to isolate slow RPC operations, downstream hops, and failing database spans.',
                fields: 'trace_id, span_id, parent_span_id, service, operation, duration_ms, status'
              },
              {
                id: 'deployments',
                title: 'D. Deployment & Config Changes',
                formats: '.csv, .json',
                desc: 'Correlates incident onset with software rollouts, container restarts, feature flags, or schema updates.',
                fields: 'timestamp, service, version, change_type, description, actor'
              },
              {
                id: 'dependencies',
                title: 'E. Service Dependency Graph',
                formats: '.json, .csv',
                desc: 'Defines upstream/downstream topology to evaluate blast radius and pinpoint root dependency failures.',
                fields: 'services: [...], dependencies: [{source, target}]'
              },
              {
                id: 'optional',
                title: 'F. Supporting Notes & Alerts',
                formats: '.csv, .json, .log',
                desc: 'Supplemental context such as monitoring alerts, on-call timeline notes, or infrastructure changes.',
                fields: 'timestamp, service, title, notes'
              }
            ].map((cat) => (
              <div
                key={cat.id}
                className="rounded-lg border border-slate-800 bg-slate-900/80 p-3.5 transition-all hover:border-slate-700"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-slate-200">{cat.title}</h4>
                  <span className="font-mono text-[10px] text-cyan-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {cat.formats}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{cat.desc}</p>
                <div className="text-[10px] font-mono text-slate-400 bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
                  <span className="text-slate-400 font-semibold">Useful columns: </span>
                  {cat.fields}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Details</span>
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
            >
              <span>Proceed to Upload Files</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: File Upload Zone ================= */}
      {step === 3 && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-cyan-400" />
                Step 3 — Drag-and-Drop File Upload
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Drop multiple evidence files or a ZIP archive. ZIP bombs and directory traversal are automatically guarded.
              </p>
            </div>
            <span className="text-[11px] text-slate-400">Limit: 50MB per file</span>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/80 hover:border-cyan-500/80 rounded-2xl p-8 bg-slate-900/40 text-center transition-all cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-3 border border-cyan-500/20">
              <UploadCloud className="h-6 w-6 animate-bounce" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              Drag & Drop incident evidence files here
            </p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Supports <code className="text-cyan-300 font-mono">.csv</code>, <code className="text-cyan-300 font-mono">.json</code>, <code className="text-cyan-300 font-mono">.jsonl</code>, <code className="text-cyan-300 font-mono">.log</code>, and <code className="text-cyan-300 font-mono">.zip</code> archives.
            </p>
            <label className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-cyan-300 border border-slate-700 transition-colors cursor-pointer">
              <span>Browse Files from Disk</span>
              <input
                type="file"
                multiple
                accept=".csv,.json,.jsonl,.log,.zip"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Selected Files ({selectedFiles.length})</span>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-slate-500 hover:text-rose-400 text-[11px]"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/90 text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {file.name.endsWith('.zip') ? (
                        <FolderArchive className="h-4 w-4 text-amber-400 shrink-0" />
                      ) : (
                        <FileCode className="h-4 w-4 text-cyan-400 shrink-0" />
                      )}
                      <span className="font-mono text-slate-200 truncate">{file.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors ml-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick upload synthetic dataset fallback button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Guide</span>
            </button>
            <button
              onClick={handleUploadFiles}
              disabled={selectedFiles.length === 0 || loading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              <span>{loading ? 'Uploading & Parsing...' : 'Parse & Preview Schema'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: Schema Preview & Mapping ================= */}
      {step === 4 && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" />
                Step 4 — Schema Detection & Record Preview
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Parsed evidence records with preserved source filenames and 1-based row numbers for 100% provenance.
              </p>
            </div>
            <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 rounded-full">
              {uploadedSummaries.length} Files Ingested
            </span>
          </div>

          {/* Ingested Files Tabs / Previews */}
          <div className="space-y-4">
            {uploadedSummaries.map((file) => (
              <div key={file.id} className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-cyan-400" />
                    <span className="font-mono text-xs font-bold text-white">{file.file_name}</span>
                    <span className="font-mono text-[10px] text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40 uppercase">
                      Category: {file.detected_category}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {file.record_count} records parsed ({(file.file_size / 1024).toFixed(1)} KB)
                  </div>
                </div>

                {/* Detected Column Mappings */}
                <div className="text-xs">
                  <span className="text-[11px] text-slate-400 font-semibold block mb-1">Normalized Mappings:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(file.column_mappings || {}).map(([target, src]) => (
                      <span key={target} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300">
                        <span className="text-cyan-400">{target}</span> &larr; {src}
                      </span>
                    ))}
                    {(!file.column_mappings || Object.keys(file.column_mappings).length === 0) && (
                      <span className="text-[11px] text-slate-500 italic">No normalized fields auto-detected</span>
                    )}
                  </div>
                </div>

                {/* Sample Records Table */}
                {(file.preview_rows && file.preview_rows.length > 0) && (
                  <div className="overflow-x-auto rounded border border-slate-800/80">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-1.5 px-2.5">Row</th>
                          {Object.keys(file.preview_rows[0] || {}).map((col) => (
                            <th key={col} className="py-1.5 px-2.5">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                        {file.preview_rows.map((row, idx) => {
                          const cols = Object.keys(file.preview_rows[0] || {});
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              <td className="py-1 px-2.5 text-cyan-400 font-bold">{idx + 2}</td>
                              {cols.map((colKey, cIdx) => {
                                const val = row ? row[colKey] : undefined;
                                return (
                                  <td key={cIdx} className="py-1 px-2.5 text-slate-300 truncate max-w-xs">
                                    {val === null || val === undefined ? '-' : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Upload More Files</span>
            </button>
            <button
              onClick={() => setStep(5)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
            >
              <span>Validation Summary & Analyze</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 5: Validation Summary & Run Analysis ================= */}
      {step === 5 && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Step 5 — Pre-Flight Validation Summary
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review data coverage, recognized categories, and documented limitations before triggering the RCA engine.
              </p>
            </div>
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/80">
              <span className="text-[10px] text-slate-400 block mb-1">Total Evidence Files</span>
              <span className="text-xl font-bold font-mono text-cyan-300">{validation?.total_files ?? 0}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/80">
              <span className="text-[10px] text-slate-400 block mb-1">Parsed Records</span>
              <span className="text-xl font-bold font-mono text-white">{validation?.total_records ?? 0}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/80">
              <span className="text-[10px] text-slate-400 block mb-1">Services Discovered</span>
              <span className="text-xl font-bold font-mono text-blue-400">
                {validation?.services_discovered?.length ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/80">
              <span className="text-[10px] text-slate-400 block mb-1">Telemetry Window</span>
              <span className="text-xs font-mono text-slate-300 truncate block">
                {validation?.time_coverage?.earliest ? 'Temporal Span OK' : 'No Timestamps'}
              </span>
            </div>
          </div>

          {/* Categories Detected vs Missing */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300">Evidence Categories Coverage:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-emerald-400 font-semibold block mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Detected Categories:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {validation?.categories_detected?.map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-[10px] font-mono text-emerald-300 capitalize">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-amber-400 font-semibold block mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Missing Categories:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {validation?.missing_categories?.length ? (
                    validation.missing_categories.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-[10px] font-mono text-amber-300 capitalize">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-500">All primary categories present</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Limitation Warning Notice */}
          {validation?.limitation_notice && (
            <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/20 text-xs text-amber-300 leading-relaxed flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Evaluation Scope Notice:</span>
                {validation.limitation_notice}
              </div>
            </div>
          )}

          {/* Trigger Analysis Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Schema Preview</span>
            </button>

            <button
              onClick={handleTriggerAnalysis}
              disabled={analyzing}
              className="flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {analyzing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Executing RCA Engine...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>Analyze Incident & Discover Root Causes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
