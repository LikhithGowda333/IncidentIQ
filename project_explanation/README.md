# IncidentIQ — Comprehensive Documentation Index

Welcome to the internal architectural and operational documentation repository for **IncidentIQ — AI-Powered Incident Investigation & Root Cause Analysis Platform**.

This documentation suite is organized into 10 structured chapters detailing every layer of the system:

| Chapter | Document | Scope & Focus |
| :--- | :--- | :--- |
| **01** | [`01_Project_Overview.md`](./01_Project_Overview.md) | Problem statement, core theme, motivation, target personas, and project scope. |
| **02** | [`02_System_Architecture.md`](./02_System_Architecture.md) | System components, Mermaid architecture diagrams, data pipelines, and design rationale. |
| **03** | [`03_Data_Formats_and_Upload_Guide.md`](./03_Data_Formats_and_Upload_Guide.md) | Formats (.csv, .json, .log, .zip), column schemas, validation rules, and ZIP safety. |
| **04** | [`04_Root_Cause_Analysis_Method.md`](./04_Root_Cause_Analysis_Method.md) | Correlation pipeline, pattern detection, heuristic scoring formula, and engine abstention. |
| **05** | [`05_UI_and_Visualizations.md`](./05_UI_and_Visualizations.md) | Walkthrough of all 8 application pages, interactive timeline, Recharts, and dependency map. |
| **06** | [`06_API_Documentation.md`](./06_API_Documentation.md) | Complete OpenAPI endpoint documentation, Pydantic request/response schemas, and auth. |
| **07** | [`07_Testing_and_Evaluation.md`](./07_Testing_and_Evaluation.md) | Test suite breakdown, Pytest execution, coverage of edge cases, and provenance validation. |
| **08** | [`08_Demo_and_Presentation_Guide.md`](./08_Demo_and_Presentation_Guide.md) | 5-minute hackathon pitch script, live demo walkthrough, and judge Q&A preparation. |
| **09** | [`09_Limitations_and_Future_Work.md`](./09_Limitations_and_Future_Work.md) | Honest boundaries, heuristic vs causal limits, OpenTelemetry vision, and enterprise roadmap. |
| **10** | [`10_Troubleshooting.md`](./10_Troubleshooting.md) | PowerShell setup, port resolution, virtualenv fixes, common errors, and observability glossary. |

---

### Quick Launch Summary (Windows PowerShell)

```powershell
# 1. Start Backend (Terminal 1)
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 2. Start Frontend (Terminal 2)
cd frontend
npm run dev
```

- **Frontend URL:** `http://localhost:5173`
- **Backend API Docs:** `http://127.0.0.1:8000/docs`
- **Local Demo Account:** `demo@incidentiq.local` / `Demo1234!`
