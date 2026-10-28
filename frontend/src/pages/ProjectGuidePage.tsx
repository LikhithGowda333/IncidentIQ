import React from 'react';
import { BookOpen, HelpCircle, CheckCircle2, AlertTriangle, Layers, ShieldCheck, Sparkles, Workflow, ArrowRight } from 'lucide-react';

export const ProjectGuidePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-cyan-400" />
          IncidentIQ Platform & RCA Guide
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Comprehensive manual for SREs, DevOps engineers, and hackathon evaluators on evidence ingestion, ranking interpretation, and hypothesis falsification.
        </p>
      </div>

      {/* Section 1: Project Identity */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-3">
        <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          1. Platform Theme & Motivation
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white">“The incident is resolved; nobody knows why.”</strong> In modern distributed microservice architectures, on-call responders frequently roll back, restart containers, or scale up replicas to stop the bleeding. However, identifying the true causal chain requires correlating logs, metrics, traces, and code releases across interdependent systems.
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          IncidentIQ provides a deterministic, transparent pipeline that links every hypothesis to concrete source file lines, checks for contradictory data, and explicitly abstains when telemetry is missing.
        </p>
      </div>

      {/* Section 2: What Evidence to Upload */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
          <Layers className="h-4 w-4" />
          2. Accepted Evidence Schemas
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          IncidentIQ accepts structured formats (<code className="text-cyan-300 font-mono">.csv</code>, <code className="text-cyan-300 font-mono">.json</code>, <code className="text-cyan-300 font-mono">.jsonl</code>, <code className="text-cyan-300 font-mono">.log</code>) and multi-file <code className="text-cyan-300 font-mono">.zip</code> archives:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950 space-y-1.5 font-mono">
            <span className="text-white font-bold block text-[11px]">Application & Infra Logs</span>
            <span className="text-[10px] text-cyan-400 block">.csv, .json, .jsonl, .log</span>
            <p className="text-[11px] text-slate-400 font-sans leading-normal">
              Captures error messages, exceptions, timeouts, retries, and thread contention.
            </p>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
              Columns: timestamp, service, level, message, trace_id
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950 space-y-1.5 font-mono">
            <span className="text-white font-bold block text-[11px]">Time-Series Metrics</span>
            <span className="text-[10px] text-cyan-400 block">.csv, .json</span>
            <p className="text-[11px] text-slate-400 font-sans leading-normal">
              Reveals resource spikes, CPU saturation, latency surges (p95/p99), and connection pool utilization.
            </p>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
              Columns: timestamp, service, metric_name, value, unit
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950 space-y-1.5 font-mono">
            <span className="text-white font-bold block text-[11px]">Distributed Traces</span>
            <span className="text-[10px] text-cyan-400 block">.csv, .json, .jsonl</span>
            <p className="text-[11px] text-slate-400 font-sans leading-normal">
              Reconstructs caller-to-callee hops to identify exactly which downstream service timed out.
            </p>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
              Columns: trace_id, span_id, parent_span_id, duration_ms, status
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950 space-y-1.5 font-mono">
            <span className="text-white font-bold block text-[11px]">Deployments & Changes</span>
            <span className="text-[10px] text-cyan-400 block">.csv, .json</span>
            <p className="text-[11px] text-slate-400 font-sans leading-normal">
              Correlates software releases, config edits, and feature flag flips with failure onset.
            </p>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
              Columns: timestamp, service, version, change_type, description
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Understanding Rankings & Heuristic Scores */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
          <Workflow className="h-4 w-4" />
          3. How to Interpret Hypothesis Rankings & Heuristic Scores
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          The engine computes an explainable, bounded heuristic score between 0.05 and 0.96. <strong className="text-rose-400">Scores are heuristic evidence weights, not statistically calibrated probabilities.</strong>
        </p>

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs font-mono">
          <div className="text-cyan-300 font-bold">
            Score = Base(0.15) + (0.25 &times; TemporalMatch) + (0.30 &times; ErrorDensity) + (0.25 &times; CausalLink) &minus; (0.35 &times; Contradictions)
          </div>
          <ul className="text-slate-400 space-y-1 text-[11px]">
            <li>&bull; <strong className="text-slate-300">TemporalMatch (0.0 to 1.0):</strong> Proximity of state changes (e.g. deployment) to error onset.</li>
            <li>&bull; <strong className="text-slate-300">ErrorDensity (0.0 to 1.0):</strong> Concentration of 5xx errors and critical logs within the incident window.</li>
            <li>&bull; <strong className="text-slate-300">CausalLink (0.0 to 1.0):</strong> Direct topological dependency matches (e.g. checkout &rarr; database).</li>
            <li>&bull; <strong className="text-slate-300">Contradictions (0.0 to 1.0):</strong> Penalties for conflicting evidence (e.g. errors occurring prior to rollout).</li>
          </ul>
        </div>
      </div>

      {/* Section 4: Correlation vs Causation & Abstention */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          4. Correlation is Not Causation & Engine Abstention
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Just because an alert occurred at 14:15 does not prove it triggered the failure. IncidentIQ guards against false certainty by:
        </p>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="p-3 rounded bg-slate-950 border border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Dedicated Contradicting Evidence Panel:</strong>
              Lists observations that weaken or falsify the hypothesis (e.g. another service reporting normal CPU or errors starting before a deployment).
            </div>
          </div>

          <div className="p-3 rounded bg-slate-950 border border-slate-800 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Engine Abstention:</strong>
              If fewer than 4 relevant records exist or zero error signals are present, the engine abstains with: <code className="text-amber-300 font-mono">“Insufficient evidence to rank a root cause reliably”</code> and generates a missing telemetry checklist.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
