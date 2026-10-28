# 06 — API Documentation: IncidentIQ

## 1. Authentication & Security Architecture

All protected endpoints require a valid JSON Web Token (JWT) supplied in the `Authorization` header:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

Tokens are signed using `HS256` with a configurable secret key (`SECRET_KEY`) and expire after 24 hours (`ACCESS_TOKEN_EXPIRE_MINUTES=1440`). All incident routes strictly enforce user ownership.

---

## 2. API Endpoints

### Health Check

#### `GET /api/health`
Returns runtime health status, database type, and active capabilities.
- **Auth Required:** No
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "app": "IncidentIQ",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-10-28T14:30:00Z",
  "database": "sqlite",
  "capabilities": ["log_parsing", "metric_anomaly_detection", "trace_bottleneck_analysis", "deployment_correlation", "causal_hypothesis_ranking", "evidence_provenance"]
}
```

---

### Authentication Routes

#### `POST /api/auth/register`
Registers a new local SRE user.
- **Request Body:**
```json
{
  "full_name": "Alex Rivera",
  "email": "alex@incidentiq.local",
  "password": "StrongPassword123!"
}
```
- **Response `200 OK`:** Returns `TokenResponse` containing `access_token` and user profile.
- **Error `400 Bad Request`:** Emitted if an account with this email already exists.

#### `POST /api/auth/login`
Authenticates a user and returns a signed JWT.
- **Request Body:**
```json
{
  "email": "demo@incidentiq.local",
  "password": "Demo1234!"
}
```
- **Response `200 OK`:** Returns `TokenResponse`.
- **Error `401 Unauthorized`:** Emitted for invalid credentials.

#### `GET /api/auth/me`
Retrieves current authenticated user profile.
- **Auth Required:** Yes

---

### Incident & Evidence Routes

#### `GET /api/incidents`
Lists all incidents owned by the authenticated user.
- **Query Parameters:** `severity`, `status`, `service`, `search`.
- **Auth Required:** Yes

#### `POST /api/incidents`
Creates a new incident record.
- **Request Body:**
```json
{
  "title": "Checkout Latency Outage",
  "incident_id_code": "INC-8492",
  "description": "P99 latency elevated following rollout.",
  "start_time": "2026-10-28T14:15:00Z",
  "severity": "critical",
  "affected_services": ["checkout-service", "database"],
  "environment": "production"
}
```

#### `POST /api/incidents/{incident_id}/uploads`
Multipart upload endpoint accepting one or more files or ZIP archives.
- **Content-Type:** `multipart/form-data`
- **Form Key:** `files` (array of file streams)
- **Response `200 OK`:** Array of `EvidenceFileSummary` objects containing detected categories, record counts, and schema mappings.

#### `GET /api/incidents/{incident_id}/validation`
Returns pre-analysis data coverage summary.
- **Response `200 OK`:**
```json
{
  "total_files": 4,
  "total_records": 128,
  "total_rejected": 0,
  "time_coverage": {"earliest": "2026-10-28T14:10:00Z", "latest": "2026-10-28T14:25:00Z"},
  "services_discovered": ["checkout-service", "api-gateway", "database"],
  "categories_detected": ["logs", "metrics", "traces", "deployments"],
  "missing_categories": ["dependencies"],
  "can_analyze": true
}
```

#### `POST /api/incidents/{incident_id}/analyze`
Triggers the transparent root-cause analysis engine.
- **Response `200 OK`:** Full `AnalysisResultResponse` with ranked hypotheses, timeline, service map, and recommendations.

#### `GET /api/incidents/{incident_id}/analysis`
Retrieves the latest completed analysis result.

#### `GET /api/incidents/{incident_id}/records`
Queries parsed evidence records with pagination and filtering.
- **Query Parameters:** `service`, `category`, `severity`, `search`, `limit`, `offset`.

#### `GET /api/incidents/{incident_id}/report`
Exports investigation report in JSON or CSV.
- **Query Parameter:** `format` (`json` or `csv`).
- **Response:** JSON payload or CSV file attachment.

---

### Overview Dashboard Routes

#### `GET /api/overview/stats`
Aggregates total incidents, analyzed count, critical count, severity distribution, service impact frequencies, and system health checks.
