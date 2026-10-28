"""
seed_25_incidents.py
--------------------
Seeds the IncidentIQ SQLite database with 25 realistic production incidents
for the demo account (demo@incidentiq.local).

Run from the project root:
    python sample_data/seed_25_incidents.py
"""

import sqlite3
import json
import uuid
import sys
import os
from datetime import datetime, timedelta, timezone
import random

# ── path resolution ──────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(PROJECT_ROOT, "backend", "incidentiq.db")
DEMO_EMAIL = "demo@incidentiq.local"

# ── helpers ───────────────────────────────────────────────────────────────────
def ts(days_ago: int, hour: int = 9, minute: int = 0) -> str:
    """Return an ISO-8601 UTC timestamp N days ago at the given hour."""
    t = datetime.now(timezone.utc) - timedelta(days=days_ago)
    t = t.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return t.isoformat()

def dur(hours: float) -> str:
    """Duration label."""
    if hours < 1:
        return f"{int(hours * 60)}m"
    return f"{hours:.1f}h"

# ── 25 incident definitions ───────────────────────────────────────────────────
INCIDENTS = [
    # 1
    dict(
        incident_id="INC-1001",
        title="Checkout Service 500 Errors — Payment Gateway Timeout",
        description=(
            "Users reported complete inability to complete purchases. "
            "Checkout service was returning HTTP 500 after a 30-second wait. "
            "Payment gateway downstream latency spiked from 120 ms to 38 s. "
            "Affected approximately 4 200 transactions over 47 minutes."
        ),
        severity="critical",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["checkout", "payment-gateway", "order-service"]),
        start_time=ts(2, 14, 22),
        end_time=ts(2, 15, 9),
        symptoms="HTTP 500 on /checkout/confirm, payment gateway latency >30 s, order queue backing up",
        ticket_ref="JIRA-4421",
        notes="Post-mortem complete. Root cause: payment gateway TLS certificate renewal caused 47-minute outage.",
    ),
    # 2
    dict(
        incident_id="INC-1002",
        title="Database Connection Pool Exhaustion — API Latency Spike",
        description=(
            "All API endpoints became extremely slow (p99 > 12 s). "
            "Database connection pool hit its limit of 100 connections. "
            "Root cause traced to a missing index on the `events` table after a schema migration. "
            "Full table scans held connections open for seconds each."
        ),
        severity="high",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["api-gateway", "postgres-primary", "user-service"]),
        start_time=ts(5, 3, 15),
        end_time=ts(5, 5, 44),
        symptoms="p99 API latency >12 s, connection pool at 100/100, slow query log flooded",
        ticket_ref="JIRA-4398",
        notes="Added composite index on events(user_id, created_at). Connection pool healthy immediately.",
    ),
    # 3
    dict(
        incident_id="INC-1003",
        title="Redis Cache Eviction Storm — Search Degraded",
        description=(
            "Search results began returning stale or empty data. "
            "Redis memory usage hit 99% and LRU eviction began dropping search index keys. "
            "Cache miss rate jumped from 3% to 91% causing the search service to overload Elasticsearch."
        ),
        severity="high",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["search-service", "redis-cache", "elasticsearch"]),
        start_time=ts(8, 11, 0),
        end_time=ts(8, 12, 30),
        symptoms="Search returning empty results, Redis eviction counter spiking, Elasticsearch CPU at 98%",
        ticket_ref="JIRA-4370",
        notes="Increased Redis maxmemory to 16 GB and added eviction policy guard alert.",
    ),
    # 4
    dict(
        incident_id="INC-1004",
        title="Kubernetes Node OOM Kill — Recommendation Engine Down",
        description=(
            "Recommendation engine pods were OOM-killed repeatedly. "
            "A model update shipped without updated memory limits. "
            "New model required 6 GB; pods were limited to 2 GB. "
            "Node-level memory pressure caused cascading evictions of co-located pods."
        ),
        severity="critical",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["recommendation-engine", "k8s-node-03", "product-service"]),
        start_time=ts(11, 8, 45),
        end_time=ts(11, 10, 0),
        symptoms="Pod OOMKilled, node memory pressure True, recommendation API returning 503",
        ticket_ref="JIRA-4352",
        notes="Updated resource limits to requests: 4Gi / limits: 8Gi. Node recovered.",
    ),
    # 5
    dict(
        incident_id="INC-1005",
        title="CDN Misconfiguration — Static Assets Returning 403",
        description=(
            "Front-end application failed to load CSS and JavaScript bundles. "
            "A CloudFront origin access policy update incorrectly restricted the S3 bucket policy. "
            "Users saw a broken white page with console errors."
        ),
        severity="high",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["cdn", "s3-assets", "frontend"]),
        start_time=ts(14, 16, 5),
        end_time=ts(14, 16, 38),
        symptoms="Browser console: 403 Forbidden on .js and .css, S3 bucket policy changed 20 min before incident",
        ticket_ref="JIRA-4330",
        notes="Reverted S3 bucket policy. Root cause: Terraform PR merged without peer review.",
    ),
    # 6
    dict(
        incident_id="INC-1006",
        title="Message Queue Consumer Lag — Order Fulfillment Delayed",
        description=(
            "Order fulfillment notifications were delayed by up to 4 hours. "
            "Kafka consumer group `fulfillment-workers` fell behind by 2.3 million messages. "
            "A bad deployment of the worker service introduced an infinite retry loop on malformed messages."
        ),
        severity="high",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["kafka", "fulfillment-workers", "notification-service"]),
        start_time=ts(17, 9, 30),
        end_time=ts(17, 22, 0),
        symptoms="Kafka consumer lag > 2M msgs, fulfillment worker CPU 100%, order emails delayed 4+ hours",
        ticket_ref="JIRA-4311",
        notes="Added dead-letter queue and deployed hotfix. Lag drained in 2.5 hours.",
    ),
    # 7
    dict(
        incident_id="INC-1007",
        title="Auth Service JWT Secret Rotation — Mass Logout",
        description=(
            "All logged-in users were signed out simultaneously. "
            "The secret used to sign JWTs was rotated in Vault but the auth service pods were not restarted "
            "to pick up the new secret. Old tokens passed validation for 10 minutes then all failed together."
        ),
        severity="critical",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["auth-service", "vault", "api-gateway"]),
        start_time=ts(20, 13, 0),
        end_time=ts(20, 13, 25),
        symptoms="401 Unauthorized for all authenticated requests, login spike 10× normal, support tickets flooded",
        ticket_ref="JIRA-4290",
        notes="Implemented rolling JWT secret rotation with overlap window. All pods restarted in order.",
    ),
    # 8
    dict(
        incident_id="INC-1008",
        title="Elasticsearch Index Corruption — Product Search Unavailable",
        description=(
            "Product search returned HTTP 503 for all queries. "
            "Primary shard for the `products-v7` index became corrupted after an unclean node shutdown "
            "during a cluster rolling upgrade. Replica was promoted but had a 4-minute gap."
        ),
        severity="high",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["elasticsearch", "search-service", "product-catalog"]),
        start_time=ts(23, 2, 10),
        end_time=ts(23, 3, 50),
        symptoms="ES cluster status RED, shard unassigned, search-service returning 503, reindex job failed",
        ticket_ref="JIRA-4265",
        notes="Restored shard from snapshot. Added pre-upgrade shard health check to upgrade runbook.",
    ),
    # 9
    dict(
        incident_id="INC-1009",
        title="gRPC Deadline Exceeded — Cart Service Cascade",
        description=(
            "Cart service began failing with `DEADLINE_EXCEEDED` errors. "
            "Inventory service had a slow SQL query introduced in the morning release. "
            "Cart calls inventory synchronously; gRPC default deadline of 2 s was consistently exceeded."
        ),
        severity="medium",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["cart-service", "inventory-service", "postgres-inventory"]),
        start_time=ts(26, 10, 45),
        end_time=ts(26, 11, 30),
        symptoms="gRPC DEADLINE_EXCEEDED in cart logs, inventory query p95 > 3 s, deployment at 10:30",
        ticket_ref="JIRA-4247",
        notes="Optimized inventory query with covering index. Deadline extended to 5 s as interim measure.",
    ),
    # 10
    dict(
        incident_id="INC-1010",
        title="Disk Full — Log Aggregator Service Crash",
        description=(
            "The centralized log aggregator (Fluentd) crashed when `/var/log` partition reached 100%. "
            "Log rotation was misconfigured after OS upgrade. "
            "All downstream dashboards and alerting relying on log streams went dark."
        ),
        severity="high",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["fluentd", "log-storage", "alerting"]),
        start_time=ts(29, 6, 0),
        end_time=ts(29, 7, 15),
        symptoms="Fluentd pod CrashLoopBackOff, disk usage 100% on log node, Grafana panels showing no data",
        ticket_ref="JIRA-4230",
        notes="Cleared old logs, fixed logrotate config, added disk-usage alert at 80%.",
    ),
    # 11
    dict(
        incident_id="INC-1011",
        title="Network Partition — Cross-AZ Service Communication Failure",
        description=(
            "Services in us-east-1a could not reach services in us-east-1b for 18 minutes. "
            "AWS reported a partial networking issue affecting Transit Gateway routes. "
            "Impact: payment, notifications, and reporting pipelines disrupted."
        ),
        severity="critical",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["transit-gateway", "payment-service", "notification-service", "reporting"]),
        start_time=ts(32, 14, 30),
        end_time=ts(32, 14, 48),
        symptoms="Cross-AZ TCP timeouts, AWS Health Dashboard event, payment 503s, reporting pipeline stalled",
        ticket_ref="JIRA-4215",
        notes="AWS resolved routing issue. Implemented AZ-local fallback for payment processing.",
    ),
    # 12
    dict(
        incident_id="INC-1012",
        title="Feature Flag Service Outage — Dark Launch Gone Wrong",
        description=(
            "A misconfigured feature flag was evaluated for every request, triggering a database read "
            "on a deprecated config table that no longer had an index. "
            "The flag service became the latency bottleneck for 100% of API traffic."
        ),
        severity="high",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["feature-flags", "config-db", "api-gateway"]),
        start_time=ts(35, 15, 20),
        end_time=ts(35, 16, 10),
        symptoms="API p99 latency 8 s, flag service CPU 100%, config DB slow queries, new flag deployed at 15:15",
        ticket_ref="JIRA-4198",
        notes="Disabled bad flag. Re-added index. Added per-flag latency tracking.",
    ),
    # 13
    dict(
        incident_id="INC-1013",
        title="TLS Certificate Expiry — Internal mTLS Auth Broken",
        description=(
            "Internal service-to-service mTLS calls began failing at 00:00 UTC when the internal CA "
            "intermediate certificate expired. Certificate renewal automation had a cron job pointing "
            "to the wrong environment's Vault path."
        ),
        severity="critical",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["vault", "cert-manager", "api-gateway", "auth-service"]),
        start_time=ts(38, 0, 0),
        end_time=ts(38, 1, 45),
        symptoms="mTLS handshake failures across all service mesh calls, certificate expiry in logs, midnight timing",
        ticket_ref="JIRA-4180",
        notes="Renewed cert manually. Fixed cron Vault path. Added 30-day cert expiry alerting.",
    ),
    # 14
    dict(
        incident_id="INC-1014",
        title="Rate Limiter Misconfiguration — Legitimate Users Blocked",
        description=(
            "The API rate limiter began rejecting requests from legitimate high-volume business accounts. "
            "A config change lowered the per-IP limit without excluding the known enterprise IP ranges. "
            "Affected clients received HTTP 429 for 2 hours."
        ),
        severity="medium",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["rate-limiter", "api-gateway", "enterprise-accounts"]),
        start_time=ts(41, 9, 0),
        end_time=ts(41, 11, 0),
        symptoms="HTTP 429 for enterprise IPs, rate limiter config change at 08:55, support ticket spike",
        ticket_ref="JIRA-4162",
        notes="Reverted rate limit config. Added enterprise IP allowlist to rate limiter policy.",
    ),
    # 15
    dict(
        incident_id="INC-1015",
        title="Ingress Controller OOMKilled — All Services Unreachable",
        description=(
            "The NGINX ingress controller pod was OOMKilled after a WebSocket connection leak. "
            "A new WebSocket feature deployed that morning did not close connections on client disconnect. "
            "After 6 hours, ingress memory exceeded limits and crashed, taking down all HTTP routing."
        ),
        severity="critical",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["nginx-ingress", "websocket-service", "k8s-ingress"]),
        start_time=ts(44, 16, 30),
        end_time=ts(44, 17, 5),
        symptoms="All services returning connection refused, ingress OOMKilled, WebSocket connection count growing since 10:00",
        ticket_ref="JIRA-4145",
        notes="Restarted ingress, patched WS close handler, added connection-count metric and alert.",
    ),
    # 16
    dict(
        incident_id="INC-1016",
        title="Slow Rollout Miscommunication — Version Skew Bug",
        description=(
            "During a rolling deployment, 40% of pods ran v2.3.1 and 60% ran v2.3.0 simultaneously. "
            "A breaking API schema change in v2.3.1 caused v2.3.0 services to reject responses. "
            "Approximately 35% of requests failed during the 22-minute deployment window."
        ),
        severity="high",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["order-service", "api-gateway", "frontend"]),
        start_time=ts(47, 11, 0),
        end_time=ts(47, 11, 22),
        symptoms="35% request error rate, mixed version pods, API schema incompatibility in logs",
        ticket_ref="JIRA-4128",
        notes="Rolled back to v2.3.0. Added API versioning strategy and canary deployment gate.",
    ),
    # 17
    dict(
        incident_id="INC-1017",
        title="S3 Bucket Policy Change — Backup Pipeline Silently Failing",
        description=(
            "Nightly database backups silently failed for 6 days. "
            "An S3 bucket policy update removed write permissions for the backup IAM role. "
            "Backups appeared to succeed (exit 0) but wrote zero bytes to S3. "
            "Discovered during a restore drill."
        ),
        severity="high",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["backup-service", "s3-backups", "postgres-primary"]),
        start_time=ts(50, 2, 0),
        end_time=ts(44, 2, 0),
        symptoms="S3 objects zero bytes, backup job exit 0 but no data, IAM policy change 6 days prior",
        ticket_ref="JIRA-4110",
        notes="Fixed IAM role policy. Added backup integrity check (non-zero size + restore probe).",
    ),
    # 18
    dict(
        incident_id="INC-1018",
        title="Prometheus Scrape Failure — Alerting Blind Spot",
        description=(
            "Prometheus stopped scraping metrics from the payments cluster for 3 hours. "
            "A network policy update blocked port 9090 between the monitoring namespace and payments namespace. "
            "All payment alerts were silently suppressed during this window."
        ),
        severity="medium",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["prometheus", "payments-cluster", "alertmanager"]),
        start_time=ts(53, 5, 0),
        end_time=ts(53, 8, 0),
        symptoms="Prometheus target payments/* DOWN, no payment alerts firing, network policy changed at 04:55",
        ticket_ref="JIRA-4095",
        notes="Updated NetworkPolicy to allow Prometheus scrape traffic. Added scrape-target health alert.",
    ),
    # 19
    dict(
        incident_id="INC-1019",
        title="Third-Party Geocoding API Deprecation — Address Validation Down",
        description=(
            "Address validation at checkout stopped working. "
            "The geocoding provider deprecated the v2 API endpoint used by the address service. "
            "No prior notice was acted on. The service began returning 410 Gone."
        ),
        severity="medium",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["address-service", "geocoding-api", "checkout"]),
        start_time=ts(56, 0, 0),
        end_time=ts(55, 14, 0),
        symptoms="410 Gone from geocoding provider, address validation 100% failure, deprecation email sent 30 days prior",
        ticket_ref="JIRA-4079",
        notes="Migrated to geocoding v3 API. Added third-party API deprecation tracking to runbook.",
    ),
    # 20
    dict(
        incident_id="INC-1020",
        title="Cascading Retry Storm — Auth Service DDoS by Own Services",
        description=(
            "Auth service became overwhelmed by retry traffic from upstream services. "
            "A 2-second auth service blip caused 14 dependent services to retry simultaneously "
            "with exponential backoff starting at 100 ms. The auth service could not recover under load."
        ),
        severity="critical",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["auth-service", "api-gateway", "user-service", "session-store"]),
        start_time=ts(59, 18, 5),
        end_time=ts(59, 18, 52),
        symptoms="Auth service CPU 100%, retry rate 50× normal, downstream services 503, retry storm pattern in traces",
        ticket_ref="JIRA-4061",
        notes="Added jitter to retry backoff. Implemented circuit breakers on all auth clients.",
    ),
    # 21
    dict(
        incident_id="INC-1021",
        title="Canary Deployment Bad Config — 10% Users Hit Broken Endpoint",
        description=(
            "A canary deployment of the user-profile service contained a misconfigured environment variable "
            "pointing to the staging database instead of production. "
            "10% of users (those hitting canary pods) received stale or incorrect profile data."
        ),
        severity="medium",
        status="open",
        environment="production",
        affected_services=json.dumps(["user-profile-service", "postgres-staging", "api-gateway"]),
        start_time=ts(3, 10, 0),
        end_time=None,
        symptoms="10% of profile reads returning stale data, canary pods pointing to staging DB, env var mismatch in config",
        ticket_ref="JIRA-4442",
        notes="Canary rolled back. Root cause investigation ongoing.",
    ),
    # 22
    dict(
        incident_id="INC-1022",
        title="Elasticsearch JVM Heap Pressure — Indexing Lag",
        description=(
            "Product indexing pipeline fell behind by 45 minutes. "
            "Elasticsearch JVM old-gen heap reached 95% triggering frequent GC pauses. "
            "Pause durations of 8–15 seconds blocked indexing throughput."
        ),
        severity="medium",
        status="open",
        environment="production",
        affected_services=json.dumps(["elasticsearch", "product-indexer", "product-catalog"]),
        start_time=ts(1, 7, 30),
        end_time=None,
        symptoms="Indexing lag 45 min, ES JVM old-gen heap 95%, GC pause 8-15 s, product updates delayed",
        ticket_ref="JIRA-4450",
        notes="Increased heap to 16 GB. Investigating field mapping bloat as contributing factor.",
    ),
    # 23
    dict(
        incident_id="INC-1023",
        title="Secrets Leaked in Container Logs — Security Incident",
        description=(
            "A debug logging statement added during a hotfix inadvertently logged the database "
            "connection string (including password) at INFO level. "
            "Logs were ingested into the centralized log platform accessible to all engineers. "
            "Credentials rotated immediately on discovery."
        ),
        severity="critical",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["payment-processor", "log-aggregator", "postgres-payments"]),
        start_time=ts(62, 14, 0),
        end_time=ts(62, 14, 35),
        symptoms="Database connection string with password in Fluentd logs, hotfix deployed at 13:55",
        ticket_ref="JIRA-4044",
        notes="Credentials rotated. Static analysis rule added to block secret patterns in logs. Security audit scheduled.",
    ),
    # 24
    dict(
        incident_id="INC-1024",
        title="Schema Migration Locking — Orders Table Unavailable",
        description=(
            "An ALTER TABLE migration on the `orders` table acquired an exclusive lock for 11 minutes. "
            "The migration added a NOT NULL column without a default, requiring a full table rewrite on 28M rows. "
            "All order writes returned 504 during the lock."
        ),
        severity="high",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["postgres-primary", "order-service", "api-gateway"]),
        start_time=ts(65, 3, 30),
        end_time=ts(65, 3, 41),
        symptoms="ORDER writes timing out, exclusive lock on orders table, migration script running, 504 from order API",
        ticket_ref="JIRA-4028",
        notes="Migration aborted. Rewrote using online schema change tool (pt-online-schema-change). Added migration review gate.",
    ),
    # 25
    dict(
        incident_id="INC-1025",
        title="Load Balancer Health Check Misconfiguration — Healthy Pods Drained",
        description=(
            "The ALB health check path was changed from `/health` to `/healthz` in a Terraform update. "
            "However, the application still served `/health`. All pods failed the new health check "
            "and were deregistered from the target group, taking the service completely offline."
        ),
        severity="critical",
        status="analyzed",
        environment="production",
        affected_services=json.dumps(["alb", "api-gateway", "k8s-pods"]),
        start_time=ts(68, 11, 45),
        end_time=ts(68, 12, 10),
        symptoms="ALB target group: 0 healthy targets, all pods deregistered, Terraform apply at 11:40, service 503",
        ticket_ref="JIRA-4012",
        notes="Reverted health check path. Added health endpoint smoke test to CD pipeline.",
    ),
]

# ── analyses (for analyzed incidents) ─────────────────────────────────────────
def make_analysis(incident_db_id: str, incident_id_code: str, severity: str, user_id: str) -> dict:
    confidence = {"critical": 0.87, "high": 0.79, "medium": 0.71}.get(severity, 0.65)
    hypotheses = [
        {
            "id": f"H-{incident_id_code}-1",
            "title": "Primary Root Cause",
            "description": "The highest-confidence hypothesis identified from correlated evidence.",
            "score": confidence,
            "confidence_label": "High" if confidence > 0.80 else "Medium",
            "evidence_refs": [
                {"file": "logs.csv", "row": 42, "field": "message", "value": "error detected"},
                {"file": "deployments.csv", "row": 3, "field": "change_type", "value": "deployment"},
            ],
            "next_steps": [
                "Verify fix by monitoring error rate for 30 minutes post-change.",
                "Update runbook with detection and remediation steps.",
                "Schedule a post-mortem within 48 hours.",
            ],
        },
        {
            "id": f"H-{incident_id_code}-2",
            "title": "Contributing Factor",
            "description": "A secondary condition that amplified impact.",
            "score": round(confidence - 0.18, 2),
            "confidence_label": "Medium",
            "evidence_refs": [
                {"file": "metrics.json", "row": 11, "field": "value", "value": "high"},
            ],
            "next_steps": [
                "Review alerting thresholds for early warning.",
            ],
        },
    ]
    timeline_events = [
        {"timestamp": ts(2, 14, 0),  "event": "Baseline — normal operations",          "source": "metrics",  "severity": "info"},
        {"timestamp": ts(2, 14, 15), "event": "First anomaly detected in logs",         "source": "logs",     "severity": "warning"},
        {"timestamp": ts(2, 14, 22), "event": "Incident window begins",                 "source": "incident", "severity": "critical"},
        {"timestamp": ts(2, 14, 35), "event": "Error rate exceeds 50%",                 "source": "metrics",  "severity": "critical"},
        {"timestamp": ts(2, 15, 0),  "event": "On-call engineer paged",                 "source": "incident", "severity": "info"},
        {"timestamp": ts(2, 15, 9),  "event": "Remediation applied — incident resolved","source": "incident", "severity": "info"},
    ]
    summary = (
        f"Analysis completed for {incident_id_code}. "
        "Primary root cause identified with correlated evidence from logs, metrics, and deployment records. "
        "Confidence is based on temporal correlation and error density. "
        "Recommend reviewing the flagged deployment and validating the proposed fix in staging before re-deploying."
    )
    return {
        "id": str(uuid.uuid4()),
        "incident_id": incident_db_id,
        "user_id": user_id,
        "status": "completed",
        "summary": summary,
        "ranked_hypotheses": json.dumps(hypotheses),
        "timeline_events": json.dumps(timeline_events),
        "service_dependencies": json.dumps({
            "services": ["api-gateway", "postgres-primary", "redis-cache"],
            "dependencies": [
                {"source": "api-gateway", "target": "postgres-primary"},
                {"source": "api-gateway", "target": "redis-cache"},
            ],
        }),
        "metrics_summary": json.dumps({
            "cpu_peak": 94,
            "memory_peak": 88,
            "error_rate_peak": 67,
            "latency_p99_peak_ms": 12400,
        }),
        "limitations": json.dumps([
            "No distributed traces uploaded — trace correlation not possible.",
            "Metrics coverage ends 5 minutes before incident start.",
        ]),
        "next_checks": json.dumps([
            "Collect traces for the affected request paths.",
            "Review deployment diff for the version shipped 30 minutes before the incident.",
            "Confirm with the database team whether connection pool limits were changed.",
        ]),
        "data_quality_warnings": json.dumps([
            "Timestamp gaps detected in log file.",
        ]),
        "created_at": ts(2, 16, 0),
    }


# ── main seeding logic ────────────────────────────────────────────────────────
def seed():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database not found at: {DB_PATH}")
        print("  Make sure you have started the backend at least once so the DB is initialized.")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row

    # find the demo user
    user_row = conn.execute(
        "SELECT id FROM users WHERE email = ?", (DEMO_EMAIL,)
    ).fetchone()
    if user_row is None:
        print(f"[ERROR] Demo user '{DEMO_EMAIL}' not found.")
        print("  Start the backend once so it seeds the demo account, then run this script.")
        conn.close()
        sys.exit(1)

    demo_user_id = user_row["id"]
    print(f"[INFO] Demo user ID: {demo_user_id}")

    inserted = 0
    skipped = 0
    analysis_inserted = 0

    for inc in INCIDENTS:
        # skip if incident_id already exists for this user
        existing = conn.execute(
            "SELECT id FROM incidents WHERE incident_id = ? AND user_id = ?",
            (inc["incident_id"], demo_user_id),
        ).fetchone()
        if existing:
            print(f"  [SKIP] {inc['incident_id']} already exists.")
            skipped += 1
            continue

        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO incidents
                (user_id, incident_id, title, description, severity, status,
                 environment, affected_services, start_time, end_time,
                 symptoms, ticket_ref, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                demo_user_id,
                inc["incident_id"],
                inc["title"],
                inc["description"],
                inc["severity"],
                inc["status"],
                inc["environment"],
                inc["affected_services"],
                inc["start_time"],
                inc.get("end_time"),
                inc.get("symptoms"),
                inc.get("ticket_ref"),
                inc.get("notes"),
                now,
                now,
            ),
        )
        conn.commit()

        # get the inserted row id
        incident_db_id = conn.execute(
            "SELECT id FROM incidents WHERE incident_id = ? AND user_id = ?",
            (inc["incident_id"], demo_user_id),
        ).fetchone()["id"]

        print(f"  [OK]   {inc['incident_id']} — {inc['title'][:60]}")
        inserted += 1

        # insert a synthetic analysis for analyzed incidents
        if inc["status"] == "analyzed":
            an = make_analysis(incident_db_id, inc["incident_id"], inc["severity"])
            conn.execute(
                """
                INSERT INTO analyses
                    (incident_id, status, hypotheses, timeline, summary,
                     services_implicated, evidence_gaps, next_investigation_steps,
                     created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    incident_db_id,
                    an["status"],
                    an["hypotheses"],
                    an["timeline"],
                    an["summary"],
                    an["services_implicated"],
                    an["evidence_gaps"],
                    an["next_investigation_steps"],
                    an["created_at"],
                    an["updated_at"],
                ),
            )
            conn.commit()
            analysis_inserted += 1

    conn.close()

    print()
    print("=" * 60)
    print(f"  Incidents inserted : {inserted}")
    print(f"  Analyses inserted  : {analysis_inserted}")
    print(f"  Already existed    : {skipped}")
    print("=" * 60)
    print()
    print("Done! Open http://localhost:5173 and go to Incident History.")


if __name__ == "__main__":
    seed()
