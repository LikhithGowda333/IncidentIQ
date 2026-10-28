import re
from typing import List, Dict, Any, Optional

TIMEOUT_REGEX = re.compile(r'(timeout|timed out|deadline exceeded|connection reset|connection refused|pool exhausted|broken pipe|handshake failed)', re.IGNORECASE)
DB_REGEX = re.compile(r'(database|postgres|mysql|sqlite|redis|sql|connection pool|deadlock|pool size|acquire connection|lock wait)', re.IGNORECASE)
DEPLOYMENT_REGEX = re.compile(r'(deploy|release|rolled back|version|migration|v\d+\.\d+|commit)', re.IGNORECASE)
RESOURCE_REGEX = re.compile(r'(cpu|memory|oom|out of memory|disk full|saturation|thread pool|throttled)', re.IGNORECASE)

def detect_log_patterns(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Detect error spikes, timeout patterns, and database errors across log records."""
    total_logs = len(records)
    error_logs = []
    timeout_logs = []
    db_logs = []
    service_error_counts = {}
    
    for r in records:
        msg = str(r.get("message") or "")
        sev = str(r.get("severity") or r.get("level") or "").upper()
        svc = r.get("service") or "unknown"
        
        is_error = sev in ["ERROR", "CRITICAL", "FATAL", "PANIC", "ERR"] or "error" in msg.lower() or "exception" in msg.lower()
        if is_error:
            error_logs.append(r)
            service_error_counts[svc] = service_error_counts.get(svc, 0) + 1
            
        if TIMEOUT_REGEX.search(msg):
            timeout_logs.append(r)
            
        if DB_REGEX.search(msg):
            db_logs.append(r)
            
    return {
        "total_logs": total_logs,
        "error_count": len(error_logs),
        "error_ratio": len(error_logs) / max(total_logs, 1),
        "service_error_counts": service_error_counts,
        "timeout_count": len(timeout_logs),
        "db_error_count": len(db_logs),
        "sample_errors": error_logs[:10],
        "sample_timeouts": timeout_logs[:10],
        "sample_db_errors": db_logs[:10]
    }

def detect_metric_anomalies(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Detect high CPU, memory saturation, elevated latency, and error rate surges in metrics."""
    anomalies = []
    cpu_spikes = []
    memory_spikes = []
    latency_spikes = []
    service_metric_stats = {}
    
    for r in records:
        metric = str(r.get("metric_name") or "").lower()
        svc = r.get("service") or "unknown"
        try:
            val = float(r.get("metric_value") if r.get("metric_value") is not None else r.get("value", 0))
        except (ValueError, TypeError):
            continue
            
        if svc not in service_metric_stats:
            service_metric_stats[svc] = {"metrics": {}}
        if metric not in service_metric_stats[svc]["metrics"]:
            service_metric_stats[svc]["metrics"][metric] = []
        service_metric_stats[svc]["metrics"][metric].append(val)
        
        # Check standard thresholds
        if "cpu" in metric and val >= 85.0:
            cpu_spikes.append(r)
            anomalies.append({
                "type": "cpu_saturation",
                "service": svc,
                "value": val,
                "record": r,
                "description": f"CPU utilization reached critical saturation ({val:.1f}%)"
            })
        elif "mem" in metric and val >= 85.0:
            memory_spikes.append(r)
            anomalies.append({
                "type": "memory_saturation",
                "service": svc,
                "value": val,
                "record": r,
                "description": f"Memory utilization exceeded safety threshold ({val:.1f}%)"
            })
        elif any(k in metric for k in ["latency", "duration", "response_time", "p95", "p99"]) and val >= 1000.0:
            latency_spikes.append(r)
            anomalies.append({
                "type": "high_latency",
                "service": svc,
                "value": val,
                "record": r,
                "description": f"Elevated latency observed ({val:.1f} ms)"
            })
        elif any(k in metric for k in ["error_rate", "5xx", "failure_rate"]) and val >= 5.0:
            anomalies.append({
                "type": "error_rate_surge",
                "service": svc,
                "value": val,
                "record": r,
                "description": f"Error rate surged to {val:.1f}%"
            })
            
    return {
        "anomalies": anomalies,
        "cpu_spikes": cpu_spikes,
        "memory_spikes": memory_spikes,
        "latency_spikes": latency_spikes,
        "service_metric_stats": service_metric_stats
    }

def detect_trace_bottlenecks(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Identify failing spans, high latency operations, and root trace paths."""
    slow_spans = []
    failed_spans = []
    trace_groups = {}
    
    for r in records:
        t_id = r.get("trace_id")
        dur = r.get("duration_ms")
        status = str(r.get("status") or r.get("severity") or "").lower()
        
        try:
            dur_val = float(dur) if dur is not None else 0.0
        except (ValueError, TypeError):
            dur_val = 0.0
            
        if t_id:
            if t_id not in trace_groups:
                trace_groups[t_id] = []
            trace_groups[t_id].append(r)
            
        if status in ["error", "500", "502", "503", "504", "failed", "critical"]:
            failed_spans.append(r)
        elif dur_val > 1500.0:
            slow_spans.append(r)
            
    return {
        "failed_spans": failed_spans,
        "slow_spans": slow_spans,
        "total_traces": len(trace_groups),
        "trace_sample": list(trace_groups.keys())[:5]
    }
