# 09 — Limitations and Future Work: IncidentIQ

## 1. Documented Technical Limitations

IncidentIQ is honest about its current implementation boundaries:

### A. Heuristic Scoring vs. Calibrated Probability
- **Current State:** The baseline engine uses an explainable weighted linear formula bounded between $0.05$ and $0.96$.
- **Boundary:** Scores reflect relative heuristic evidence support based on documented signals, not a statistically calibrated probability distribution (e.g. Bayesian posterior probability).

### B. Batch Post-Mortem Scope
- **Current State:** Designed for post-incident investigation where telemetry files or ZIP archives are uploaded in batches.
- **Boundary:** It does not currently function as an active real-time streaming ingestion pipeline (such as Kafka/Flink stream processors).

### C. In-Memory Processing per Batch
- **Current State:** File upload limits are set to 50MB per file and up to 25,000 records per file.
- **Boundary:** While suitable for targeted incident time windows (15–60 minutes), investigating multi-gigabyte raw log dumps requires pre-filtering with grep/logrotate prior to ingestion.

---

## 2. Privacy & Secret Redaction Guidance

Production application logs often contain sensitive data (API keys, authorization tokens, PII, session cookies). 

### Security Recommendations:
1. **Pre-Ingestion Redaction:** Responders should sanitize raw logs using automated redaction tools (e.g. `sed`, `ripgrep`, or OpenTelemetry redaction processors) before uploading.
2. **Local Storage Guarantee:** IncidentIQ stores all evidence strictly within local SQLite files (`incidentiq.db`). No telemetry is transmitted to third-party endpoints or cloud services.

---

## 3. Future Roadmap & Enhancements

```
Phase 1 (Completed)      Phase 2 (Near-Term)         Phase 3 (Enterprise)
┌─────────────────┐      ┌────────────────────┐      ┌─────────────────────────┐
│ • Local SQLite  │      │ • OpenTelemetry OTLP│      │ • Bayesian Calibration  │
│ • Deterministic │ ───> │   Live Collector   │ ───> │ • Automated Canary Run  │
│   RCA Engine    │      │ • DoWhy Causal Graph│      │ • Multi-cluster SSO     │
│ • Recharts UI   │      │ • ClickHouse Store │      │ • Slack/PagerDuty Sync  │
└─────────────────┘      └────────────────────┘      └─────────────────────────┘
```

1. **Direct OpenTelemetry Protocol (OTLP) Collector:** Add an in-app gRPC receiver to stream OTLP spans and metrics directly from services without manual file exports.
2. **Causal Graph Inference:** Integrate statistical causal inference libraries (e.g. Microsoft DoWhy or Granger causality) to distinguish confounding factors from direct causal drivers.
3. **High-Performance Analytical Storage:** Swap the SQLite storage backend with an embedded analytical columnar store (such as DuckDB or ClickHouse local) to process tens of millions of records within seconds.
4. **Automated Redaction Engine:** Integrate client-side WebAssembly regex scrubbers to automatically mask credit cards, bearer tokens, and emails before files are parsed into records.
