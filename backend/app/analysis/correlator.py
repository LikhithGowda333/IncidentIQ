import json
import datetime
from typing import List, Dict, Any, Tuple, Optional
from app.analysis.normalizer import parse_iso_timestamp

def get_raw_dict(record: Dict[str, Any]) -> Dict[str, Any]:
    raw = record.get("raw_data", {})
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return {}
    elif isinstance(raw, dict):
        return raw
    return {}

def build_timeline_events(
    records: List[Dict[str, Any]],
    incident_start: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Assemble a unified chronological event timeline with evidence references."""
    events = []
    
    # Optional incident reported onset event
    if incident_start:
        events.append({
            "id": "event-onset",
            "timestamp": incident_start,
            "event_type": "onset",
            "service": "incident_system",
            "title": "Incident Reported Onset",
            "description": "Reported incident window begins.",
            "severity": "critical",
            "source_file": "incident_metadata",
            "source_row": 1,
            "record_id": None
        })
        
    for r in records:
        cat = r.get("category", "").lower()
        ts = r.get("timestamp")
        if not ts:
            continue
            
        svc = r.get("service") or "system"
        file_name = r.get("file_name", "unknown")
        row_num = r.get("row_number", 0)
        rec_id = r.get("id")
        trace_id = r.get("trace_id")
        raw = get_raw_dict(r)
        
        if cat == "deployments":
            v = r.get("version") or raw.get("version", "v1.0")
            desc = r.get("message") or raw.get("description", "Service deployment/configuration change")
            events.append({
                "id": f"event-dep-{rec_id or row_num}",
                "timestamp": ts,
                "event_type": "deployment",
                "service": svc,
                "title": f"Deployment/Change: {svc} ({v})",
                "description": str(desc),
                "severity": "warning",
                "source_file": file_name,
                "source_row": row_num,
                "record_id": rec_id
            })
        elif cat == "logs":
            sev = str(r.get("severity") or r.get("level") or "").upper()
            msg = str(r.get("message") or "")
            if sev in ["ERROR", "CRITICAL", "FATAL"] or "error" in msg.lower() or "exception" in msg.lower():
                events.append({
                    "id": f"event-log-{rec_id or row_num}",
                    "timestamp": ts,
                    "event_type": "log_error",
                    "service": svc,
                    "title": f"Log Error in {svc}",
                    "description": msg[:150] + ("..." if len(msg) > 150 else ""),
                    "severity": "critical",
                    "source_file": file_name,
                    "source_row": row_num,
                    "record_id": rec_id,
                    "trace_id": trace_id
                })
        elif cat == "metrics":
            metric_name = str(r.get("metric_name") or "")
            val = r.get("metric_value")
            try:
                f_val = float(val) if val is not None else 0.0
            except (ValueError, TypeError):
                f_val = 0.0
                
            is_anomaly = False
            title = ""
            if "cpu" in metric_name.lower() and f_val >= 85:
                is_anomaly = True
                title = f"CPU Saturation ({f_val:.1f}%)"
            elif "mem" in metric_name.lower() and f_val >= 85:
                is_anomaly = True
                title = f"High Memory Usage ({f_val:.1f}%)"
            elif "latency" in metric_name.lower() and f_val >= 1000:
                is_anomaly = True
                title = f"Latency Spike ({f_val:.0f}ms)"
            elif "error_rate" in metric_name.lower() and f_val >= 5:
                is_anomaly = True
                title = f"High Error Rate ({f_val:.1f}%)"
                
            if is_anomaly:
                events.append({
                    "id": f"event-met-{rec_id or row_num}",
                    "timestamp": ts,
                    "event_type": "metric_anomaly",
                    "service": svc,
                    "title": f"{title} on {svc}",
                    "description": f"Metric {metric_name} recorded abnormal value {f_val}.",
                    "severity": "warning",
                    "source_file": file_name,
                    "source_row": row_num,
                    "record_id": rec_id
                })
        elif cat == "traces":
            dur = r.get("duration_ms")
            status = str(raw.get("status") or r.get("severity") or "").lower()
            try:
                f_dur = float(dur) if dur is not None else 0.0
            except (ValueError, TypeError):
                f_dur = 0.0
                
            if status in ["error", "500", "502", "503", "504", "failed"] or f_dur > 2000:
                events.append({
                    "id": f"event-trc-{rec_id or row_num}",
                    "timestamp": ts,
                    "event_type": "trace_failure",
                    "service": svc,
                    "title": f"Span Failure/Timeout in {svc}",
                    "description": f"Operation duration: {f_dur:.0f}ms, status: {status}.",
                    "severity": "critical",
                    "source_file": file_name,
                    "source_row": row_num,
                    "record_id": rec_id,
                    "trace_id": trace_id,
                    "duration_ms": f_dur
                })
                
    # Sort events strictly chronologically
    events.sort(key=lambda e: e.get("timestamp") or "")
    return events

def resolve_service_topology(
    dependency_records: List[Dict[str, Any]],
    all_records: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Build directed service dependency graph and calculate health/error status for each node."""
    nodes_map = {}
    edges = []
    has_uploaded = False
    
    # 1. Parse explicit dependency records if uploaded
    for r in dependency_records:
        raw = get_raw_dict(r)
        # JSON structure: {"services": [...], "dependencies": [{"source": ..., "target": ...}]}
        if "dependencies" in raw and isinstance(raw["dependencies"], list):
            has_uploaded = True
            for svc in raw.get("services", []):
                nodes_map[svc] = {"id": svc, "name": svc, "role": "service", "status": "healthy", "error_count": 0, "anomaly_detected": False}
            for dep in raw["dependencies"]:
                src = dep.get("source")
                tgt = dep.get("target")
                if src and tgt:
                    nodes_map[src] = nodes_map.get(src, {"id": src, "name": src, "role": "service", "status": "healthy", "error_count": 0, "anomaly_detected": False})
                    nodes_map[tgt] = nodes_map.get(tgt, {"id": tgt, "name": tgt, "role": "service", "status": "healthy", "error_count": 0, "anomaly_detected": False})
                    edges.append({"source": src, "target": tgt, "relationship": dep.get("relationship", "calls")})
        # CSV structure: source, target columns
        elif "source" in raw and "target" in raw:
            has_uploaded = True
            src = str(raw["source"]).strip()
            tgt = str(raw["target"]).strip()
            if src and tgt:
                nodes_map[src] = nodes_map.get(src, {"id": src, "name": src, "role": "service", "status": "healthy", "error_count": 0, "anomaly_detected": False})
                nodes_map[tgt] = nodes_map.get(tgt, {"id": tgt, "name": tgt, "role": "service", "status": "healthy", "error_count": 0, "anomaly_detected": False})
                edges.append({"source": src, "target": tgt, "relationship": "calls"})
                
    # 2. Discover any additional services mentioned in logs, metrics, or traces
    for r in all_records:
        svc = r.get("service")
        if svc and svc not in nodes_map:
            nodes_map[svc] = {"id": svc, "name": svc, "role": "service", "status": "healthy", "error_count": 0, "anomaly_detected": False}
            
    # 3. Calculate observed errors and anomalies per service
    for r in all_records:
        svc = r.get("service")
        if not svc or svc not in nodes_map:
            continue
        cat = r.get("category", "")
        sev = str(r.get("severity") or r.get("level") or "").upper()
        msg = str(r.get("message") or "")
        if sev in ["ERROR", "CRITICAL", "FATAL"] or "error" in msg.lower():
            nodes_map[svc]["error_count"] += 1
            nodes_map[svc]["status"] = "critical"
        elif cat == "metrics":
            val = r.get("metric_value")
            metric = str(r.get("metric_name") or "")
            try:
                f_val = float(val) if val is not None else 0.0
                if ("cpu" in metric and f_val > 85) or ("latency" in metric and f_val > 1000):
                    nodes_map[svc]["anomaly_detected"] = True
                    if nodes_map[svc]["status"] != "critical":
                        nodes_map[svc]["status"] = "degraded"
            except (ValueError, TypeError):
                pass
                
    return {
        "nodes": list(nodes_map.values()),
        "edges": edges,
        "has_uploaded_graph": has_uploaded
    }
