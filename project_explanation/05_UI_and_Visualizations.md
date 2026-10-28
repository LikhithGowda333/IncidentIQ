# 05 — UI and Visualizations: IncidentIQ

## 1. Design System & Aesthetics

IncidentIQ features a professional, dark-first observability interface designed for deep cognitive focus:
- **Base Background:** Deep space navy (`#080c14` / `#090d16`).
- **Panels & Cards:** Slate (`#0f172a` / `#1e293b`).
- **Borders:** Subtle structural borders (`#334155` / `#1e293b`).
- **Semantic Accents:**
  - Red / Rose (`#ef4444` / `#f43f5e`): Critical tier, log errors, span timeouts.
  - Amber (`#f59e0b`): Warnings, deployments, degraded state.
  - Cyan / Blue (`#06b6d4` / `#3b82f6`): Primary brand, metrics, normal telemetry.
  - Emerald (`#10b981`): Healthy status, passing tests, resolved state.
- **Typography:** JetBrains Mono for timestamps, trace IDs, and code records; Plus Jakarta Sans for UI elements and headers.

---

## 2. Walkthrough of Major Views

### A. Authentication (Login & Registration)
- **Login Page:** Product logo, subtle radial gradient, email/password inputs with show/hide password control, remember-me checkbox, and a **1-Click Autofill** button for the demo account (`demo@incidentiq.local`).
- **Registration Page:** Full name, email, password, and confirm-password with client-side matching validation. Passwords are encrypted on the backend with Bcrypt before persistence.

---

### B. Observability Overview Dashboard
- **KPI Summary Cards:** Total incidents, incidents analyzed, critical severity tier, incidents needing more evidence, and most frequently implicated service.
- **Incident Timeline Volume (Area Chart):** Chronological distribution of incidents over time powered by Recharts.
- **Severity Breakdown (Donut Chart):** Proportional distribution of critical, high, medium, and low severity events.
- **Service Impact Distribution (Bar Chart):** Relative incident frequency across services.
- **Recent Incidents & Investigations Tables:** Stored incidents with live status badges and quick-action links.
- **System Health Panel:** Live health telemetry reflecting SQLite WAL mode status, API response state, and analysis engine availability.

---

### C. 5-Step Guided Investigation Wizard
1. **Step 1 — Incident Details:** Title, custom or auto-generated ID (`INC-XXXX`), severity, environment, affected services, description, symptoms, ticket reference, and an option to mark time as "Unknown".
2. **Step 2 — What Should I Upload? Visual Guide:** Expandable reference cards for logs, metrics, traces, deployments, and dependency graphs. Includes **1-Click Load Scenario A** (Checkout Deployment Outage) and **Scenario B** (Insufficient Evidence) buttons.
3. **Step 3 — Drag-and-Drop Upload Zone:** Multi-file drag-and-drop supporting `.csv`, `.json`, `.jsonl`, `.log`, and `.zip` archives. Displays file size, recognized extensions, and removal buttons.
4. **Step 4 — Schema Preview & Column Mapping:** Interactive table previewing the first 5 rows of each uploaded file, detected target mappings (timestamp, service, message, metric), and 1-based source row numbers.
5. **Step 5 — Pre-Flight Validation Summary:** Aggregates total files, records, discovered services, recognized categories, and missing category warnings before enabling the "Analyze Incident" button.

---

### D. Investigation Workspace
- **Top Summary Banner:** Incident code, title, severity, status, and time range. Shows clear engine abstention alerts when evidence density is low.
- **Ranked Root-Cause Hypotheses:** Expandable hypothesis cards showing rank, percentage score, confidence tier badge, detailed reasoning, mathematical formula breakdown, supporting evidence records, and contradicting signals.
- **Interactive Chronological Timeline:** Color-coded vertical timeline with distinct markers for onset, deployments, log errors, trace failures, and metric anomalies. Clicking an event opens the full provenance drawer.
- **Metrics Time Series:** Recharts line chart plotting observed metric values across time with interactive tooltips.
- **Service Dependency Graph:** Directional node-and-edge visualization displaying caller-to-callee relationships with real-time health coloring (critical, degraded, healthy).
- **Evidence Explorer:** Filterable table by category, service, severity, and search term. Clicking "View" opens a detailed provenance drawer showing raw JSON and exact source row numbers.
- **Recommended Next Checks:** Prioritized checklist grounded directly in observed anomalies and missing data gaps.
- **Report Export:** Instant export to formatted JSON and audit-grade CSV.
