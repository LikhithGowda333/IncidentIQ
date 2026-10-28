# 01 — Project Overview: IncidentIQ

## 1. Problem Statement & Motivation

> **Project Theme:** *“The incident is resolved; nobody knows why.”*

When high-severity production outages strike modern cloud applications, the immediate priority of Site Reliability Engineers (SREs) and DevOps responders is **mitigation**: restart crashing containers, trigger rollbacks, scale replica counts, or flush caches. Once alerts return to green, the team faces a daunting challenge:

1. **Telemetry Overload:** Terabytes of unstructured application logs, system metrics, and distributed traces scattered across disparate monitoring silos.
2. **Missing Causal Links:** Raw metrics show *symptoms* (e.g., elevated p99 latency), but fail to pinpoint the *initiating catalyst* (e.g., an unindexed database query introduced in a recent deployment).
3. **Correlation False Positives:** Incidents are frequently misattributed to unrelated co-occurring background events (e.g., attributing an outage to an unrelated deployment that completed hours earlier).
4. **Lack of Provenance:** Automated RCA tools often output black-box predictions without citing the exact log lines or trace IDs that justify the conclusion.

**IncidentIQ** was engineered to solve this post-incident knowledge void. It operates as an explainable, deterministic investigation platform that correlates multi-modal telemetry, ranks candidate root causes, points directly to source record provenance, exposes contradictory data, and explicitly abstains when evidence is insufficient.

---

## 2. Core Objectives

- **Grounded Evidence Citations:** Every root-cause hypothesis is explicitly supported by citations linking back to the exact source file and 1-based row number.
- **Explainable Scoring:** Clear heuristic evidence weights rather than uncalibrated "black-box" probabilities.
- **Contradiction Detection:** Active evaluation of signals that weaken or disprove a hypothesis.
- **Engine Abstention:** Built-in ability to state: *"Insufficient evidence to rank a root cause reliably"* when telemetry lacks error signals or coverage.
- **Zero Paid Dependencies:** 100% locally runnable in VS Code on Windows without requiring GitHub, cloud credentials, or paid AI APIs.

---

## 3. Target Personas

| Persona | Primary Goals | How IncidentIQ Helps |
| :--- | :--- | :--- |
| **Site Reliability Engineers (SREs)** | Conduct blameless post-mortems and identify root causes across service boundaries. | Provides unified incident timelines, topology impact maps, and auto-generated next checks. |
| **Backend & DevOps Engineers** | Verify whether their recent code release or configuration edit introduced a regression. | Correlates code releases directly with error rate surges and database contention. |
| **Engineering Managers / Tech Leads** | Export standardized audit reports for leadership and post-incident review meetings. | One-click JSON and CSV audit reports with sanitized records and zero secret leakage. |

---

## 4. Project Scope & Boundaries

### In Scope
- Multi-format ingestion: `.csv`, `.json`, `.jsonl`, `.log`, and `.zip` archives.
- Automated column mapping and timestamp normalization to UTC.
- Correlation across logs, metrics, distributed traces, deployments, and dependency graphs.
- Heuristic scoring pipeline with clear mathematical formula breakdowns.
- Interactive web UI featuring timeline visualizations, Recharts time series, and service maps.
- Exportable post-incident reports.
- Comprehensive automated Pytest suite.

### Out of Scope
- Real-time continuous stream ingestion (focused specifically on post-incident investigation batches).
- Auto-remediation / automated rollback execution (platform recommends checks; does not alter production infrastructure).
