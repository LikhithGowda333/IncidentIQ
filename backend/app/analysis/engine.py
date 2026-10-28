import re
import datetime
from typing import List, Dict, Any, Optional
from app.analysis.patterns import (
    detect_log_patterns,
    detect_metric_anomalies,
    detect_trace_bottlenecks,
    TIMEOUT_REGEX,
    DB_REGEX
)
from app.analysis.correlator import build_timeline_events, resolve_service_topology
from app.analysis.scorer import compute_heuristic_score

def make_citation(record: Dict[str, Any], summary: str) -> Dict[str, Any]:
    """Format an evidence citation linking back to source file and row number."""
    return {
        "file_name": record.get("file_name", "unknown"),
        "row_number": record.get("row_number", 0),
        "timestamp": record.get("timestamp"),
        "service": record.get("service") or "unknown",
        "category": record.get("category", "logs"),
        "summary": summary,
        "metric_value": record.get("metric_value"),
        "trace_id": record.get("trace_id")
    }

def analyze_incident_evidence(
    incident: Dict[str, Any],
    records: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Main incident analysis pipeline:
    1. Timeline creation
    2. Pattern & anomaly detection
    3. Service topology resolution
    4. Grounded hypothesis generation & ranking
    5. Contradiction evaluation & abstention
    """
    incident_start = incident.get("start_time")
    incident_services = incident.get("affected_services", [])
    if isinstance(incident_services, str):
        import json
        try:
            incident_services = json.loads(incident_services)
        except Exception:
            incident_services = []
            
    # Group records by category
    logs = [r for r in records if r.get("category") == "logs"]
    metrics = [r for r in records if r.get("category") == "metrics"]
    traces = [r for r in records if r.get("category") == "traces"]
    deployments = [r for r in records if r.get("category") == "deployments"]
    dependencies = [r for r in records if r.get("category") == "dependencies"]
    
    # 1. Timeline & Topology
    timeline = build_timeline_events(records, incident_start=incident_start)
    topology = resolve_service_topology(dependencies, records)
    
    # 2. Pattern Analysis
    log_stats = detect_log_patterns(logs)
    metric_stats = detect_metric_anomalies(metrics)
    trace_stats = detect_trace_bottlenecks(traces)
    
    # Discovered services
    all_services = list({r.get("service") for r in records if r.get("service")})
    
    # 3. Check for Abstention / Insufficient Evidence
    total_evidence_signals = (
        log_stats["error_count"] +
        len(metric_stats["anomalies"]) +
        len(trace_stats["failed_spans"]) +
        len(deployments)
    )
    
    is_insufficient = len(records) < 4 or (total_evidence_signals == 0 and len(records) < 20)
    
    if is_insufficient:
        # Abstention case
        abstention_hypothesis = {
            "rank": 1,
            "title": "Insufficient evidence to rank a root cause reliably",
            "score": 0.10,
            "confidence_tier": "Insufficient evidence",
            "explanation": (
                "The uploaded evidence does not contain sufficient error signals, anomalies, or temporal correlations "
                "to reliably attribute this incident to a specific root cause. Correlation cannot be established without "
                "telemetry covering the incident window."
            ),
            "score_formula_breakdown": {
                "formula": "Score = 0.10 (Abstention Threshold)",
                "inputs": {"total_records": len(records), "error_signals": total_evidence_signals},
                "interpretation": "Engine abstains when evidence density is below diagnostic confidence thresholds."
            },
            "supporting_evidence": [],
            "contradicting_evidence": [],
            "affected_services": incident_services or all_services,
            "relevant_interval": {"start": incident_start, "end": incident.get("end_time")},
            "alternative_explanations": [
                "Unmonitored external network partition or third-party outage",
                "Transient client-side traffic spike not captured in service logs",
                "Silent failures without error log emission or threshold alerts"
            ],
            "recommended_next_checks": [
                "Upload application error logs from affected services during the incident window",
                "Provide time-series metrics (CPU, memory, request rate, error rate) for adjacent services",
                "Include distributed trace spans to map failing RPC or database requests",
                "Verify whether any configuration or infrastructure changes took place"
            ],
            "limitations": [
                "Evidence density is too low for statistical or heuristic causality ranking",
                "Missing error logs and metrics prevents pinpointing failure onset"
            ]
        }
        
        return {
            "status": "completed",
            "is_abstention": True,
            "summary": "Analysis completed with abstention. Insufficient evidence was found to rank a root cause reliably.",
            "ranked_hypotheses": [abstention_hypothesis],
            "timeline_events": timeline,
            "service_dependencies": topology,
            "metrics_summary": metric_stats["service_metric_stats"],
            "limitations": [
                "Evidence dataset is incomplete or lacks error telemetry.",
                "Correlation cannot be inferred without observable state changes."
            ],
            "next_checks": [
                "Retrieve logs from edge proxies or load balancers",
                "Upload metric snapshots for services: " + ", ".join(incident_services or ["all"])
            ],
            "data_quality_warnings": ["Zero or low error density detected in uploaded records."]
        }
        
    # 4. Generate Candidate Hypotheses
    hypotheses = []
    
    # --- Hypothesis A: Deployment Regression ---
    if deployments:
        dep_support = []
        dep_contradict = []
        target_dep = deployments[0]
        dep_service = target_dep.get("service") or (incident_services[0] if incident_services else "unknown")
        dep_time = target_dep.get("timestamp")
        dep_version = target_dep.get("version") or target_dep.get("raw_data", {}).get("version", "new release")
        
        dep_support.append(make_citation(
            target_dep,
            f"Deployment of {dep_service} ({dep_version}) recorded at {dep_time or 'prior to error onset'}."
        ))
        
        # Look for errors in this service or downstream following deployment
        service_errors = [l for l in logs if l.get("service") == dep_service and (
            str(l.get("severity") or "").upper() in ["ERROR", "CRITICAL"] or "error" in str(l.get("message", "")).lower()
        )]
        for err in service_errors[:4]:
            dep_support.append(make_citation(
                err,
                f"Error surge in {dep_service} shortly following deployment: {str(err.get('message'))[:100]}"
            ))
            
        # Check for contradicting evidence: errors before deployment
        if dep_time:
            early_errors = [l for l in logs if l.get("timestamp") and l.get("timestamp") < dep_time and (
                str(l.get("severity") or "").upper() in ["ERROR", "CRITICAL"]
            )]
            for e in early_errors[:2]:
                dep_contradict.append(make_citation(
                    e,
                    f"Contradiction: Error observed in {e.get('service')} BEFORE deployment at {e.get('timestamp')}."
                ))
                
        # Also check if another unrelated service was healthy
        healthy_metrics = [m for m in metrics if ("cpu" in str(m.get("metric_name", "")).lower()) and float(m.get("metric_value", 0)) < 30]
        if healthy_metrics and not dep_contradict:
            dep_contradict.append(make_citation(
                healthy_metrics[0],
                f"Baseline stability: {healthy_metrics[0].get('service')} maintained low resource usage ({healthy_metrics[0].get('metric_value')}%)."
            ))
            
        temporal_match = 0.9 if dep_time else 0.6
        error_density = min(1.0, len(service_errors) / max(len(logs) * 0.2, 1))
        causal_link = 0.85 if dep_service in incident_services or len(service_errors) > 0 else 0.4
        penalty = 0.8 if len(dep_contradict) > 0 and "BEFORE" in dep_contradict[0]["summary"] else 0.1
        
        score, tier, formula = compute_heuristic_score(0.20, temporal_match, error_density, causal_link, penalty)
        
        hypotheses.append({
            "title": f"Recent deployment of '{dep_service}' ({dep_version}) introduced a regression",
            "score": score,
            "confidence_tier": tier,
            "explanation": (
                f"Deployment of {dep_service} ({dep_version}) occurred immediately prior to an onset of error logs "
                f"and latency degradations. Service errors strongly correlate with this release window."
            ),
            "score_formula_breakdown": formula,
            "supporting_evidence": dep_support,
            "contradicting_evidence": dep_contradict,
            "affected_services": [dep_service] + [s for s in incident_services if s != dep_service],
            "relevant_interval": {"start": dep_time or incident_start, "end": incident.get("end_time")},
            "alternative_explanations": [
                "Concurrent traffic surge coincidental with deployment",
                "Unrelated third-party API outage that started during deployment rollout"
            ],
            "recommended_next_checks": [
                f"Inspect git commit diff for {dep_service} {dep_version}",
                "Review rollback metrics or test rollback in staging environment",
                "Check whether database migrations or schema updates accompanied this release"
            ],
            "limitations": [
                "Log timestamps and deployment webhook times may have clock drift across hosts",
                "Deployment causation is inferred from temporal sequence, not isolated AB testing"
            ]
        })
        
    # --- Hypothesis B: Database Connection Pool Exhaustion / Deadlock ---
    db_support = []
    db_contradict = []
    db_errors = [l for l in logs if DB_REGEX.search(str(l.get("message", "")))]
    
    for de in db_errors[:4]:
        db_support.append(make_citation(
            de,
            f"Database / connection pool error log: {str(de.get('message'))[:120]}"
        ))
        
    db_metrics = [m for m in metrics if "conn" in str(m.get("metric_name", "")).lower() or "pool" in str(m.get("metric_name", "")).lower()]
    for dm in db_metrics[:2]:
        val = float(dm.get("metric_value", 0))
        if val > 80:
            db_support.append(make_citation(
                dm,
                f"Connection pool saturation metric ({val} connections utilized)."
            ))
            
    # Contradiction: if DB CPU was normal
    db_cpu = [m for m in metrics if "cpu" in str(m.get("metric_name", "")).lower() and ("db" in str(m.get("service", "")).lower() or "postgres" in str(m.get("service", "")).lower())]
    if db_cpu and float(db_cpu[0].get("metric_value", 0)) < 40:
        db_contradict.append(make_citation(
            db_cpu[0],
            f"Database CPU remained low ({db_cpu[0].get('metric_value')}%), suggesting connection exhaustion was client-pool bounded rather than database server crash."
        ))
        
    if db_support:
        err_density = min(1.0, len(db_errors) / 5.0)
        score, tier, formula = compute_heuristic_score(0.20, 0.8, err_density, 0.85, 0.15 if db_contradict else 0.05)
        hypotheses.append({
            "title": "Database connection pool exhaustion and client acquisition timeout",
            "score": score,
            "confidence_tier": tier,
            "explanation": (
                "Services experienced cascading failures due to connection pool saturation or lock contention. "
                "Worker threads were unable to acquire database connections within the configured timeout."
            ),
            "score_formula_breakdown": formula,
            "supporting_evidence": db_support,
            "contradicting_evidence": db_contradict,
            "affected_services": list({s.get("service") for s in db_support if s.get("service")}),
            "relevant_interval": {"start": incident_start, "end": incident.get("end_time")},
            "alternative_explanations": [
                "Network packet loss between application nodes and database subnet",
                "Slow unindexed queries holding active connections open prematurely"
            ],
            "recommended_next_checks": [
                "Check database active queries via pg_stat_activity or SHOW PROCESSLIST",
                "Verify application connection pool max size and leak detection settings",
                "Inspect slow query logs around incident onset"
            ],
            "limitations": [
                "Connection pool metrics may not show individual thread stack traces"
            ]
        })
        
    # --- Hypothesis C: Downstream Dependency Timeout / Cascading Failure ---
    downstream_support = []
    downstream_contradict = []
    timeouts = [l for l in logs if TIMEOUT_REGEX.search(str(l.get("message", "")))]
    slow_traces = [t for t in traces if float(t.get("duration_ms") or 0) > 1500 or str(t.get("raw_data", {}).get("status", "")).lower() in ["504", "error"]]
    
    for to in timeouts[:3]:
        downstream_support.append(make_citation(
            to,
            f"Client timeout calling downstream service: {str(to.get('message'))[:110]}"
        ))
    for st in slow_traces[:3]:
        downstream_support.append(make_citation(
            st,
            f"Trace span latency spike in {st.get('service')}: {st.get('duration_ms')}ms"
        ))
        
    if downstream_support:
        score, tier, formula = compute_heuristic_score(0.18, 0.75, min(1.0, len(timeouts) / 4.0), 0.80, 0.1)
        hypotheses.append({
            "title": "Downstream dependency latency degradation causing upstream timeout cascade",
            "score": score,
            "confidence_tier": tier,
            "explanation": (
                "Upstream caller services experienced request backlog and client timeouts waiting for "
                "unresponsive or slow downstream dependencies."
            ),
            "score_formula_breakdown": formula,
            "supporting_evidence": downstream_support,
            "contradicting_evidence": downstream_contradict,
            "affected_services": list({s.get("service") for s in downstream_support if s.get("service")}),
            "relevant_interval": {"start": incident_start, "end": incident.get("end_time")},
            "alternative_explanations": [
                "Internal CPU throttling on the upstream service mimicking downstream slowness",
                "DNS lookup latency degradation"
            ],
            "recommended_next_checks": [
                "Review circuit breaker status and fallback execution rates",
                "Compare p95 and p99 latency between upstream client spans and downstream server spans",
                "Ensure upstream timeout thresholds match downstream SLA expectations"
            ],
            "limitations": [
                "Missing traces for intermediate proxy hops (e.g. Envoy/Istio)"
            ]
        })
        
    # --- Hypothesis D: Resource Saturation (CPU / Memory) ---
    if metric_stats["cpu_spikes"] or metric_stats["memory_spikes"]:
        res_support = []
        for cs in metric_stats["cpu_spikes"][:3]:
            res_support.append(make_citation(cs, f"CPU utilization spiked to {cs.get('metric_value')}% on {cs.get('service')}."))
        for ms in metric_stats["memory_spikes"][:3]:
            res_support.append(make_citation(ms, f"Memory saturation reached {ms.get('metric_value')}% on {ms.get('service')}."))
            
        score, tier, formula = compute_heuristic_score(0.15, 0.80, 0.70, 0.75, 0.1)
        hypotheses.append({
            "title": "System resource saturation (CPU/Memory exhaustion) causing throttling and request drops",
            "score": score,
            "confidence_tier": tier,
            "explanation": "Observed CPU/memory spikes above critical thresholds led to process throttling or thread starvation.",
            "score_formula_breakdown": formula,
            "supporting_evidence": res_support,
            "contradicting_evidence": [],
            "affected_services": list({s.get("service") for s in res_support if s.get("service")}),
            "relevant_interval": {"start": incident_start, "end": incident.get("end_time")},
            "alternative_explanations": ["Garbage collection stop-the-world pauses", "Sudden unthrottled batch job execution"],
            "recommended_next_checks": [
                "Check for heap dump or out-of-memory kernel dmesg events",
                "Analyze request concurrency limits vs available CPU cores"
            ],
            "limitations": ["Metric collection interval may smooth out microburst spikes"]
        })

    # Sort hypotheses by score descending and assign rank
    hypotheses.sort(key=lambda h: h["score"], reverse=True)
    for idx, h in enumerate(hypotheses, start=1):
        h["rank"] = idx

    # If no hypotheses were generated, fallback to abstention
    if not hypotheses:
        return analyze_incident_evidence(incident, records[:3]) # trigger abstention branch cleanly

    summary_text = (
        f"Analysis evaluated {len(records)} records across {len(all_services)} services. "
        f"Ranked {len(hypotheses)} root-cause candidate{'s' if len(hypotheses) > 1 else ''}. "
        f"Top hypothesis: '{hypotheses[0]['title']}' with score {hypotheses[0]['score']} ({hypotheses[0]['confidence_tier']})."
    )

    data_warnings = []
    if not traces:
        data_warnings.append("No distributed trace spans were uploaded; request paths could not be fully reconstructed.")
    if not metrics:
        data_warnings.append("No time-series metrics were provided; resource saturation detection relied on log messages.")
    if not dependencies:
        data_warnings.append("No service dependency graph provided; topology was inferred from record observations.")

    return {
        "status": "completed",
        "is_abstention": False,
        "summary": summary_text,
        "ranked_hypotheses": hypotheses,
        "timeline_events": timeline,
        "service_dependencies": topology,
        "metrics_summary": metric_stats["service_metric_stats"],
        "limitations": [
            "Heuristic evidence scoring reflects recorded observability signals and is not a calibrated probability distribution.",
            "Correlation does not guarantee singular causation without controlled canary testing."
        ],
        "next_checks": hypotheses[0]["recommended_next_checks"][:4],
        "data_quality_warnings": data_warnings
    }
