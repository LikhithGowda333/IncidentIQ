# 03 — Data Formats & Upload Guide: IncidentIQ

## 1. Supported Telemetry Categories

IncidentIQ supports five distinct evidence categories. Upload whatever files you have; not every category is required for an investigation to proceed.

---

### A. Application and Infrastructure Logs
- **Accepted Formats:** `.csv`, `.json`, `.jsonl`, `.log`
- **Purpose:** Identifies exceptions, error bursts, timeouts, connection drops, and service panics.
- **Recognized Columns / Aliases:**
  - Timestamp: `timestamp`, `@timestamp`, `time`, `datetime`, `ts`, `date`
  - Service: `service`, `service_name`, `app`, `component`
  - Level: `level`, `severity`, `log_level`, `type`
  - Message: `message`, `msg`, `error`, `log`, `details`
  - Correlation: `trace_id`, `request_id`, `host`

#### Sample CSV:
```csv
timestamp,service,level,message,trace_id
2026-10-28T14:16:10Z,checkout-service,ERROR,Database connection pool exhausted timeout,tr-9014
2026-10-28T14:16:40Z,checkout-service,CRITICAL,Deadlock detected during checkout transaction,tr-9016
```

---

### B. Time-Series Metrics
- **Accepted Formats:** `.csv`, `.json`
- **Purpose:** Demonstrates when system resources (CPU, RAM) or performance metrics (latency, error rate) departed from baseline.
- **Recognized Columns / Aliases:**
  - Timestamp: `timestamp`, `time`
  - Service: `service`, `app`
  - Metric Name: `metric_name`, `metric`, `name`
  - Value: `value`, `val`, `metric_value`
  - Unit: `unit` (optional)

#### Sample JSON:
```json
[
  {"timestamp": "2026-10-28T14:15:00Z", "service": "checkout-service", "metric_name": "cpu_utilization", "value": 31.8, "unit": "percent"},
  {"timestamp": "2026-10-28T14:16:00Z", "service": "checkout-service", "metric_name": "cpu_utilization", "value": 94.2, "unit": "percent"}
]
```

---

### C. Distributed Traces & Spans
- **Accepted Formats:** `.csv`, `.json`, `.jsonl`
- **Purpose:** Reconstructs the end-to-end request path to pinpoint which downstream service call timed out or failed.
- **Recognized Columns / Aliases:**
  - `trace_id`, `span_id`, `parent_span_id`
  - `service`, `operation`
  - `start_time` / `timestamp`
  - `duration_ms` / `duration`
  - `status` (e.g., `504`, `error`, `ok`)

#### Sample JSON:
```json
[
  {
    "trace_id": "tr-9015",
    "span_id": "sp-101",
    "parent_span_id": null,
    "service": "api-gateway",
    "operation": "POST /api/checkout",
    "duration_ms": 4200.0,
    "status": "504"
  }
]
```

---

### D. Deployments & Configuration Changes
- **Accepted Formats:** `.csv`, `.json`
- **Purpose:** Correlates software releases, container restarts, or configuration edits with the exact failure onset time.
- **Recognized Columns / Aliases:**
  - `timestamp`, `service`, `version`, `change_type`, `description`, `actor`

#### Sample CSV:
```csv
timestamp,service,version,change_type,description,actor
2026-10-28T14:15:00Z,checkout-service,v2.4.1,deployment,Update connection pool settings,alex.dev@incidentiq.local
```

---

### E. Service Dependency Graph
- **Accepted Formats:** `.json`, `.csv`
- **Purpose:** Understand upstream caller dependencies and downstream databases/gateways.

#### Sample JSON Structure:
```json
{
  "services": ["frontend-web", "api-gateway", "checkout-service", "database"],
  "dependencies": [
    {"source": "frontend-web", "target": "api-gateway"},
    {"source": "api-gateway", "target": "checkout-service"},
    {"source": "checkout-service", "target": "database"}
  ]
}
```

---

## 2. ZIP Archive Support & Safety Protections

IncidentIQ accepts single `.zip` archives containing any combination of supported `.csv`, `.json`, `.log` files.

### Security Controls Enforced:
1. **Directory Traversal Guard:** Any path containing `..` or absolute paths (`/etc/`, `C:\`) is blocked immediately.
2. **ZIP Bomb Mitigation:**
   - Uncompressed size limit: Max 100MB per archive.
   - Max file limit: Max 25 files per archive.
   - Compression ratio check: Any file with a ratio > 100:1 is rejected.
3. **Execution Guard:** Files are strictly parsed into memory; no code or shell scripts inside uploaded ZIP archives can be executed.
