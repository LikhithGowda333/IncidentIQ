# 08 — Demo and Presentation Guide: IncidentIQ

## 1. 5-Minute Hackathon Demo Script

### Minute 1: The Hook & Problem Statement
- **Speaker:** *“Good afternoon, judges! How many times have you heard an SRE say: **‘The incident is resolved; nobody knows why’**? When a critical P1 outage hits, responders scramble to roll back or restart containers. Once traffic recovers, everyone moves on, leaving the true root cause undiscovered until it strikes again next week.”*
- **Action:** Open browser to `http://localhost:5173`. Show the dark navy login page with the theme banner. Click the **"1-Click Autofill"** button (`demo@incidentiq.local`) and click **Sign In**.

---

### Minute 2: Observability Posture & Real Stored Telemetry
- **Speaker:** *“Welcome to IncidentIQ. Unlike static mockups, every card, chart, and table you see here is computed live from stored telemetry in our local SQLite database. We have an area chart tracking incident volume, severity donut breakdowns, and a real backend health panel verifying database WAL mode.”*
- **Action:** Hover over the Recharts volume trend. Point out the live **Backend Health** pill in the top header.

---

### Minute 3: 5-Step Guided Investigation & ZIP Ingestion
- **Speaker:** *“Let’s investigate a new incident. I’ll click ‘New Investigation’. Notice how Step 1 allows an engineer to enter symptoms without needing to know the root cause in advance. Start time can even be marked as ‘Unknown’.”*
- **Action:** Click **"New Investigation"**. Show Step 2’s large *“What should I upload?”* guide.
- **Speaker:** *“In Step 2, IncidentIQ provides clear documentation for logs, metrics, traces, and code releases. For this demo, let’s click **‘Load Scenario A: Checkout Deployment Outage’**.”*
- **Action:** Click **"Load Scenario A"**. The platform uploads logs, metrics, traces, deployments, and dependency graphs. It advances to Step 4, previewing parsed schema records with exact row numbers. Click **"Validation Summary & Analyze"** &rarr; Click **"Analyze Incident & Discover Root Causes"**.

---

### Minute 4: Explainable RCA, Grounded Citations & Abstention
- **Speaker:** *“In seconds, our transparent RCA engine evaluated the records and generated ranked hypotheses. Notice our top hypothesis: **‘Recent deployment of checkout-service (v2.4.1) introduced a regression’** with an 88% evidence score.”*
- **Action:** Expand Hypothesis #1.
- **Speaker:** *“Crucially, we do not output black-box predictions. Look at the mathematical formula breakdown. And look at the supporting evidence: each citation links directly to the source file—like `checkout_logs.csv` row #12. Clicking a citation opens the provenance record.”*
- **Action:** Click an evidence citation to open the provenance drawer. Then switch to the **Incident Timeline** tab to show the chronological sequence from rollout to error spike.

---

### Minute 5: Contradiction Detection, Abstention & Report Export
- **Speaker:** *“What happens when evidence is insufficient or contradicts the hypothesis? IncidentIQ actively checks for counter-signals—like showing that database CPU stayed at 15%, proving the failure was client-pool bounded rather than a database crash. Furthermore, in Scenario B, the engine explicitly **abstains** with ‘Insufficient evidence’ rather than inventing a hallucinated answer.”*
- **Action:** Switch to the **Reports** tab and click **Export JSON** and **Export CSV**.
- **Speaker:** *“With one click, SREs export audit-ready post-mortem reports. IncidentIQ is 100% functional locally without any paid APIs. Thank you, and we’re excited to answer your questions!”*

---

## 2. Anticipated Judge Questions & Suggested Answers

### Q1: *"Is this using a paid OpenAI or cloud LLM behind the scenes?"*
> **Answer:** No. IncidentIQ was intentionally engineered to have **zero paid API dependencies**. The baseline RCA engine uses a deterministic, rule-based correlation pipeline combining temporal proximity scoring, topological graph traversal, anomaly thresholds, and regex-based error pattern matching. It runs entirely offline on local hardware.

### Q2: *"How do you prevent correlation from being mistaken for causation?"*
> **Answer:** We address this in three ways: First, our scoring formula is explicitly labeled as a bounded **heuristic evidence score**, never an uncalibrated probability. Second, we feature a dedicated **Contradicting Evidence Panel** that penalizes hypotheses if errors started before an event or if counter-signals exist. Third, if telemetry density is low, the engine **abstains** completely.

### Q3: *"How does the system ensure data provenance?"*
> **Answer:** When files are parsed during Step 3, our ingestion pipeline attaches the original file name and 1-based source row number to every normalized record. When the analysis engine generates citations or timeline events, it carries this metadata through, allowing responders to inspect the exact line in raw logs.

### Q4: *"Can this handle messy or malformed data?"*
> **Answer:** Yes. Our normalizer supports common timestamp formats, unix epochs, and date formats, falling back to UTC ISO 8601. Malformed rows are logged to a rejection list without aborting the entire file, and column aliases (`@timestamp`, `msg`, `app`) are detected automatically.
