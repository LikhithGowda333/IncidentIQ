<<<<<<< HEAD
# IncidentIQ — AI-Powered Incident Investigation & Root Cause Analysis Platform

> **Project Theme:** *“The incident is resolved; nobody knows why.”*

IncidentIQ is a production-grade, explainable incident investigation platform designed for SREs, DevOps engineers, and backend developers. It ingests multi-modal observability telemetry—including application logs, time-series metrics, distributed traces, deployment changes, and service dependency topologies—to systematically identify the root cause of complex outages.

Every candidate hypothesis is tied to **real source file and row citations**, evaluated for **contradictory counter-evidence**, and backed by an **explainable scoring breakdown**. If telemetry is insufficient, the engine **explicitly abstains** rather than hallucinating false certainty.

---

## 1. Key Capabilities

- **Multi-Format Telemetry Ingestion:** Upload `.csv`, `.json`, `.jsonl`, `.log`, and `.zip` archives with automatic schema detection and timestamp normalization to UTC.
- **Explainable Heuristic Root-Cause Engine:** Computes bounded evidence support scores (0.05 – 0.96) combining temporal match, error burst density, and topological dependency hops.
- **Full Evidence Provenance:** Citations link directly back to the exact source file and 1-based row number.
- **Contradiction Detection & Falsification:** Actively flags counter-signals (e.g. database CPU remaining low or errors beginning before a code release).
- **Engine Abstention:** Refuses to produce false conclusions when signals are sparse; generates actionable missing telemetry checklists.
- **Interactive Chronological Timeline:** Color-coded event sequence highlighting onset, deployments, log errors, and trace timeouts.
- **Service Dependency Topology:** Directional visualization of upstream callers and downstream dependencies with real-time health states.
- **Post-Incident Report Export:** One-click exports to audit-grade JSON and CSV files.
- **100% Offline & Local:** Runs completely on your machine without requiring GitHub or paid cloud AI APIs.

---

## 2. Technology Stack

- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS, Lucide icons, Recharts.
- **Backend:** Python 3.11+ / 3.13, FastAPI, Pydantic v2, Pandas.
- **Storage:** SQLite 3 in Write-Ahead Logging (WAL) mode.
- **Security:** Bcrypt password hashing (`rounds=10`), PyJWT tokens, parameterized SQL queries.
- **Testing:** Pytest (18 automated tests passing).

---

## 3. Local Setup Guide (Windows PowerShell in VS Code)

Follow these exact steps in **Windows PowerShell**:

### Step 1: Open the Project in VS Code
Open VS Code and set your workspace to:
```powershell
Set-Location "C:\Users\DELL\.gemini\antigravity\scratch\IncidentIQ"
```

---

### Step 2: Configure Environment Variables
Copy the example environment configuration:
```powershell
Copy-Item .env.example .env
```

---

### Step 3: Set Up and Start the Python Backend

Open a PowerShell terminal in VS Code:
```powershell
# 1. Navigate to backend
cd backend

# 2. (Optional) Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install backend dependencies
pip install -r requirements.txt

# 4. Initialize database schema & seed local demo account
python -c "from app.db.database import init_db; init_db()"

# 5. Start the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The backend API will be live at `http://127.0.0.1:8000`. Swagger documentation is available at `http://127.0.0.1:8000/docs`.*

---

### Step 4: Set Up and Start the React Frontend

Open a **second** PowerShell terminal in VS Code:
```powershell
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
*The frontend development server will launch at `http://localhost:5173`.*

---

## 4. Demo Walkthrough & Evaluation Workflow

1. Open your browser to **`http://localhost:5173`**.
2. **Sign In:**
   - Click the **"1-Click Autofill"** button to load the local demo account:
     - **Email:** `demo@incidentiq.local`
     - **Password:** `Demo1234!`
   - Click **Sign In**.
3. **Explore Observability Dashboard:**
   - Inspect the KPI summary cards, incident timeline volume area chart, severity breakdown donut, and service impact bar chart.
   - Observe the live **"FastAPI 8000: Ready"** health indicator pill in the header.
4. **Trigger a Guided Investigation:**
   - Click **"New Investigation"** in the sidebar.
   - Enter an incident title (e.g. *"Checkout Service 504 Gateway Outage"*).
   - In Step 2, review the upload guidance or click **"Load Scenario A (Checkout Deployment Outage)"**.
   - Notice the schema preview in Step 4 showing exact row numbers and parsed columns.
   - Click **"Analyze Incident & Discover Root Causes"**.
5. **Inspect RCA Results:**
   - View the top-ranked hypothesis: *"Recent deployment of 'checkout-service' (v2.4.1) introduced a regression"*.
   - Review the mathematical formula breakdown and supporting evidence citations.
   - Click any citation to open the exact provenance record.
   - Switch to the **Incident Timeline**, **Metrics Time Series**, and **Service Topology** tabs.
   - Click **Export JSON** or **Export CSV** to download the post-incident audit report.
6. **Test Engine Abstention (Scenario B):**
   - Click **"New Investigation"** &rarr; click **"Load Scenario B (Insufficient Telemetry)"** &rarr; click **Analyze**.
   - Observe how the engine refrains from inventing conclusions and outputs: *“Insufficient evidence to rank a root cause reliably”* accompanied by a missing data checklist.

---

## 5. Running Automated Tests

Run the Pytest suite in PowerShell:
```powershell
cd backend
python -m pytest app/tests -v
```
**Result:** 18/18 tests pass in ~1.4 seconds covering authentication, file validation, ZIP safety, timeline ordering, evidence traceability, hypothesis scoring, and report generation.

---

## 6. Project Directory Tree

```
IncidentIQ/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
├── backend/
│   ├── incidentiq.db
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── api/
│       │   ├── auth.py
│       │   ├── incidents.py
│       │   └── overview.py
│       ├── auth/
│       │   └── security.py
│       ├── core/
│       │   └── config.py
│       ├── db/
│       │   └── database.py
│       ├── schemas/
│       │   └── schemas.py
│       ├── analysis/
│       │   ├── engine.py
│       │   ├── normalizer.py
│       │   ├── patterns.py
│       │   ├── correlator.py
│       │   └── scorer.py
│       └── tests/
│           ├── test_auth.py
│           ├── test_uploads.py
│           ├── test_analysis.py
│           └── test_incidents.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── types/
│       │   └── index.ts
│       ├── services/
│       │   └── api.ts
│       ├── components/
│       │   ├── Header.tsx
│       │   └── Sidebar.tsx
│       └── pages/
│           ├── Login.tsx
│           ├── Register.tsx
│           ├── Overview.tsx
│           ├── NewInvestigation.tsx
│           ├── InvestigationResult.tsx
│           ├── IncidentHistory.tsx
│           ├── EvidenceExplorerPage.tsx
│           ├── ServiceMapPage.tsx
│           ├── ReportsPage.tsx
│           ├── ProjectGuidePage.tsx
│           └── SettingsPage.tsx
├── sample_data/
│   ├── sample_incident_bundle.zip
│   ├── scenario_a_checkout_deployment/
│   │   ├── deployments.csv
│   │   ├── logs.csv
│   │   ├── metrics.json
│   │   ├── traces.json
│   │   └── service_dependencies.json
│   └── scenario_b_insufficient_evidence/
│       ├── logs.csv
│       ├── metrics.json
│       └── service_dependencies.json
└── project_explanation/
    ├── README.md
    ├── 01_Project_Overview.md
    ├── 02_System_Architecture.md
    ├── 03_Data_Formats_and_Upload_Guide.md
    ├── 04_Root_Cause_Analysis_Method.md
    ├── 05_UI_and_Visualizations.md
    ├── 06_API_Documentation.md
    ├── 07_Testing_and_Evaluation.md
    ├── 08_Demo_and_Presentation_Guide.md
    ├── 09_Limitations_and_Future_Work.md
    └── 10_Troubleshooting.md
```

---

## 7. Security & Provenance Guarantee

- **Password Safety:** Stored exclusively as one-way Bcrypt hashes (`rounds=10`).
- **Input Sanitization:** Uploaded filenames are sanitized with path-traversal prevention.
- **ZIP Bomb Mitigations:** Decompression size is capped at 100MB; suspicious compression ratios are blocked.
- **Zero API Keys Required:** All algorithms are executed on-device using deterministic, reproducible rule sets.
=======
# IncidentIQ
IncidentIQ is an AI-powered incident investigation platform that analyzes logs, metrics, and traces to build incident timelines, rank potential root causes, and provide evidence-backed explanations with recommended next steps. Built with Python, FastAPI, and Streamlit for the HACKMITTEN 3.0 AI Ops Challenge.
>>>>>>> 
