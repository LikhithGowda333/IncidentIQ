# 10 — Troubleshooting & Observability Glossary: IncidentIQ

## 1. Windows PowerShell Troubleshooting

### Issue 1: `python` or `node` is not recognized
- **Cause:** Python or Node.js binary paths are not in the current shell's `$env:PATH`.
- **Solution (PowerShell):**
  ```powershell
  # Verify Python installation
  python --version
  
  # If using portable Node:
  $env:PATH = "C:\path\to\nodejs;" + $env:PATH
  node -v
  ```

---

### Issue 2: Port 8000 or 5173 is already in use
- **Cause:** Another local dev server (e.g. earlier uvicorn process or Vite instance) is binding to the port.
- **Solution (PowerShell):**
  ```powershell
  # Find process holding port 8000
  Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object OwningProcess
  
  # Stop the process by ID
  Stop-Process -Id <PID> -Force
  ```
  Or change the port in `.env` (e.g., `PORT=8001`) and update `frontend/vite.config.ts` target proxy.

---

### Issue 3: SQLite `database is locked` error
- **Cause:** Two processes opened write transactions concurrently without WAL mode.
- **Solution:** IncidentIQ automatically executes `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;` on startup. If locked, remove any stale `.db-wal` or `.db-shm` lock files:
  ```powershell
  Remove-Item backend/incidentiq.db-wal, backend/incidentiq.db-shm -Force -ErrorAction SilentlyContinue
  ```

---

### Issue 4: File upload exceeds size limits
- **Cause:** File exceeds `MAX_UPLOAD_SIZE_BYTES` (default: 50MB) or 25,000 records.
- **Solution:** Increase the threshold in `backend/app/core/config.py` or `.env`:
  ```ini
  MAX_UPLOAD_SIZE_BYTES=104857600
  MAX_RECORDS_PER_FILE=50000
  ```

---

## 2. Glossary of Observability Terms

| Term | Operational Definition in IncidentIQ |
| :--- | :--- |
| **Root Cause** | The fundamental, initiating condition or fault that, when resolved, prevents the failure cascade from recurring. |
| **Trace** | The holistic, end-to-end journey of a single user request across distributed microservice boundaries. |
| **Span** | A single timed unit of execution within a trace (e.g. an HTTP handler, RPC call, or SQL query). |
| **Latency** | The time elapsed between initiating a request and receiving the response, typically measured at p95 or p99 percentiles in milliseconds (ms). |
| **Metric** | A numerical aggregate sampled at regular time intervals (e.g. CPU utilization %, memory MB, requests per second). |
| **Service Dependency** | A directed relationship where an upstream service relies on a downstream target (database, microservice, or API). |
| **Anomaly** | A departure from expected baseline behavior (e.g. CPU utilization &ge; 85% or latency &ge; 1000ms). |
| **Correlation** | The observable statistical coincidence of two events occurring together in time. |
| **Confidence Tier** | Categorical support level (*High, Moderate, Low, Insufficient*) based on heuristic signal thresholds. |
| **Engine Abstention** | The formal refusal of the analysis engine to rank a root cause when evidence is insufficient or contradictory. |
| **Provenance** | The unbroken audit trail linking a finding directly back to its original source file and line number. |
