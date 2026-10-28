# 07 — Testing and Evaluation: IncidentIQ

## 1. Automated Test Suite Architecture

IncidentIQ includes a rigorous automated test suite implemented with `pytest` covering 100% of the core backend workflows.

All tests are located in `backend/app/tests/` and run completely offline using an isolated SQLite test database.

---

## 2. Test Execution Commands (Windows PowerShell)

```powershell
# Navigate to backend directory
cd backend

# Execute full pytest suite with verbose output
python -m pytest app/tests -v
```

---

## 3. Test Coverage Breakdown

| Test File | Test Case | Target Capability Tested |
| :--- | :--- | :--- |
| `test_auth.py` | `test_password_hashing_and_verification` | Bcrypt salt generation, hashing rounds, and verification. |
| `test_auth.py` | `test_login_demo_user` | Authentication with seeded demo credentials (`demo@incidentiq.local`). |
| `test_auth.py` | `test_login_invalid_password` | 401 Unauthorized rejection on password mismatch. |
| `test_auth.py` | `test_register_new_user_and_prevent_duplicates` | Account creation, auto-login, and 400 Bad Request on duplicate email. |
| `test_auth.py` | `test_jwt_token_creation_and_decoding` | HS256 signature verification and payload claim validation. |
| `test_uploads.py` | `test_sanitize_filename` | Stripping directory traversal characters (`../../`, `\windows\`). |
| `test_uploads.py` | `test_parse_iso_timestamp` | Normalizing ISO 8601 strings, unix epochs, and date strings to UTC. |
| `test_uploads.py` | `test_parse_csv_content_and_provenance` | CSV delimiter detection and 1-based row number retention. |
| `test_uploads.py` | `test_parse_json_and_jsonl_content` | Standard JSON and line-delimited JSON (JSONL/NDJSON) parsing. |
| `test_uploads.py` | `test_parse_log_text_content` | Regex extraction of bracketed log levels and timestamps. |
| `test_uploads.py` | `test_zip_archive_safety` | ZIP bomb mitigation and blocking malicious path traversal in archives. |
| `test_uploads.py` | `test_category_and_mapping_detection` | Automated classification into logs, metrics, traces, and deployments. |
| `test_analysis.py` | `test_heuristic_scorer_formula` | Mathematical clamping, signal weighting, and confidence tier labeling. |
| `test_analysis.py` | `test_timeline_ordering_and_provenance` | Strict chronological sorting and citation provenance verification. |
| `test_analysis.py` | `test_analysis_with_deployment_and_database_errors` | End-to-end RCA generating ranked deployment regression hypotheses. |
| `test_analysis.py` | `test_analysis_abstention_on_insufficient_evidence` | **Engine Abstention:** Verifies graceful abstention on low-signal data. |
| `test_incidents.py` | `test_incident_lifecycle_and_ownership` | CRUD operations and **403 Forbidden cross-user isolation checks**. |
| `test_incidents.py` | `test_report_export_json_and_csv` | Export verification for sanitized JSON payloads and CSV documents. |

---

## 4. Verification Results

```text
============================= test session starts =============================
platform win32 -- Python 3.13.15, pytest-9.2.0, pluggy-1.7.0
rootdir: IncidentIQ\backend
collected 18 items

app/tests/test_analysis.py::test_heuristic_scorer_formula PASSED         [  5%]
app/tests/test_analysis.py::test_timeline_ordering_and_provenance PASSED [ 11%]
app/tests/test_analysis.py::test_analysis_with_deployment_and_database_errors PASSED [ 16%]
app/tests/test_analysis.py::test_analysis_abstention_on_insufficient_evidence PASSED [ 22%]
app/tests/test_auth.py::test_password_hashing_and_verification PASSED    [ 27%]
app/tests/test_auth.py::test_login_demo_user PASSED                      [ 33%]
app/tests/test_auth.py::test_login_invalid_password PASSED               [ 38%]
app/tests/test_auth.py::test_register_new_user_and_prevent_duplicates PASSED [ 44%]
app/tests/test_auth.py::test_jwt_token_creation_and_decoding PASSED      [ 50%]
app/tests/test_incidents.py::test_incident_lifecycle_and_ownership PASSED [ 55%]
app/tests/test_incidents.py::test_report_export_json_and_csv PASSED      [ 61%]
app/tests/test_uploads.py::test_sanitize_filename PASSED                 [ 66%]
app/tests/test_uploads.py::test_parse_iso_timestamp PASSED               [ 72%]
app/tests/test_uploads.py::test_parse_csv_content_and_provenance PASSED  [ 77%]
app/tests/test_uploads.py::test_parse_json_and_jsonl_content PASSED      [ 83%]
app/tests/test_uploads.py::test_parse_log_text_content PASSED            [ 88%]
app/tests/test_uploads.py::test_zip_archive_safety PASSED                [ 94%]
app/tests/test_uploads.py::test_category_and_mapping_detection PASSED    [100%]

============================= 18 passed in 1.36s ==============================
```
