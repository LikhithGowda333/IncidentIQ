import os
import io
import json
import zipfile
import shutil
from pathlib import Path

BASE_DIR = Path(r"C:\Users\DELL\.gemini\antigravity\scratch\IncidentIQ\sample_data")
OUTPUT_DIR = BASE_DIR / "test_scenarios_zip"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def create_zip(filename: str, files_dict: dict):
    target_path = OUTPUT_DIR / filename
    with zipfile.ZipFile(target_path, "w", zipfile.ZIP_DEFLATED) as z:
        for fname, content in files_dict.items():
            if isinstance(content, str):
                z.writestr(fname, content.encode("utf-8"))
            elif isinstance(content, bytes):
                z.writestr(fname, content)
            elif isinstance(content, (dict, list)):
                z.writestr(fname, json.dumps(content, indent=2).encode("utf-8"))
    # Also copy to BASE_DIR for quick access
    shutil.copy2(target_path, BASE_DIR / filename)
    print(f"Created: {filename} ({target_path.stat().st_size / 1024:.1f} KB)")

# ==============================================================================
# Scenario 1: Checkout Deployment Regression
# ==============================================================================
s1_files = {
    "deployments.csv": """timestamp,service,version,change_type,description,actor
2026-10-28T14:15:00Z,checkout-service,v2.4.1,deployment,Deploy connection pool tuning and checkout retry logic,alex.dev@incidentiq.local
""",
    "logs.csv": """timestamp,service,level,message,trace_id
2026-10-28T14:15:45Z,checkout-service,INFO,Warmup complete traffic routed to v2.4.1,tr-9013
2026-10-28T14:16:10Z,checkout-service,ERROR,Database connection pool exhausted acquire timeout,tr-9014
2026-10-28T14:16:22Z,api-gateway,ERROR,Upstream checkout-service returned HTTP 504 Gateway Timeout,tr-9015
2026-10-28T14:16:40Z,checkout-service,CRITICAL,Deadlock detected during batch payment reservation,tr-9016
2026-10-28T14:17:05Z,frontend-web,ERROR,Failed to submit checkout order 504 gateway timeout,tr-9017
""",
    "metrics.json": [
        {"timestamp": "2026-10-28T14:15:00Z", "service": "checkout-service", "metric_name": "cpu_utilization", "value": 31.8},
        {"timestamp": "2026-10-28T14:16:00Z", "service": "checkout-service", "metric_name": "cpu_utilization", "value": 94.2},
        {"timestamp": "2026-10-28T14:16:00Z", "service": "checkout-service", "metric_name": "latency_p95_ms", "value": 4600.0},
        {"timestamp": "2026-10-28T14:16:00Z", "service": "database", "metric_name": "cpu_utilization", "value": 15.0},
        {"timestamp": "2026-10-28T14:17:00Z", "service": "api-gateway", "metric_name": "error_rate", "value": 24.5}
    ],
    "traces.json": [
        {"trace_id": "tr-9014", "span_id": "sp-101", "service": "api-gateway", "operation": "POST /checkout", "duration_ms": 4820, "status": "504"},
        {"trace_id": "tr-9014", "span_id": "sp-102", "parent_span_id": "sp-101", "service": "checkout-service", "operation": "reserve_payment", "duration_ms": 4800, "status": "error"},
        {"trace_id": "tr-9015", "span_id": "sp-103", "service": "api-gateway", "operation": "POST /checkout", "duration_ms": 5010, "status": "504"}
    ],
    "service_dependencies.json": {
        "services": ["frontend-web", "api-gateway", "checkout-service", "database"],
        "dependencies": [
            {"source": "frontend-web", "target": "api-gateway"},
            {"source": "api-gateway", "target": "checkout-service"},
            {"source": "checkout-service", "target": "database"}
        ]
    }
}
create_zip("01_checkout_deployment_regression.zip", s1_files)

# ==============================================================================
# Scenario 2: Database Connection Pool Exhaustion & Deadlock
# ==============================================================================
s2_files = {
    "logs.log": """[2026-10-28T16:00:10Z] [INFO] [order-service] Received batch checkout events (count=150)
[2026-10-28T16:01:25Z] [WARN] [billing-service] HikariPool-1 - Connection pool usage exceeded 85% threshold
[2026-10-28T16:02:11Z] [ERROR] [billing-service] HikariPool-1 - Connection is not available, request timed out after 30005ms
[2026-10-28T16:02:35Z] [ERROR] [billing-service] Deadlock detected on table 'invoices' waiting for transaction lock
[2026-10-28T16:03:00Z] [CRITICAL] [order-service] Aborted order checkout due to billing database acquisition failure
""",
    "metrics.csv": """timestamp,service,metric_name,value
2026-10-28T16:00:00Z,billing-service,active_db_connections,22
2026-10-28T16:01:00Z,billing-service,active_db_connections,74
2026-10-28T16:02:00Z,billing-service,active_db_connections,100
2026-10-28T16:02:00Z,postgres-primary,cpu_utilization,26.5
2026-10-28T16:03:00Z,billing-service,pool_pending_threads,85
""",
    "traces.json": [
        {"trace_id": "tr-db-001", "span_id": "sp-d1", "service": "order-service", "operation": "create_order", "duration_ms": 30500, "status": "failed"},
        {"trace_id": "tr-db-001", "span_id": "sp-d2", "parent_span_id": "sp-d1", "service": "billing-service", "operation": "sql.acquire_connection", "duration_ms": 30005, "status": "timeout"}
    ],
    "service_dependencies.json": {
        "services": ["order-service", "billing-service", "postgres-primary"],
        "dependencies": [
            {"source": "order-service", "target": "billing-service"},
            {"source": "billing-service", "target": "postgres-primary"}
        ]
    }
}
create_zip("02_database_pool_exhaustion_deadlock.zip", s2_files)

# ==============================================================================
# Scenario 3: Downstream Third-Party Payment Gateway Latency Cascade
# ==============================================================================
s3_files = {
    "logs.csv": """timestamp,service,level,message,trace_id
2026-10-28T17:30:15Z,payment-processor,INFO,Outbound webhook dispatched to external bank partner,tr-stripe-1001
2026-10-28T17:31:02Z,payment-processor,ERROR,Client timeout calling downstream service: bank-auth-api timed out after 10000ms,tr-stripe-1002
2026-10-28T17:31:15Z,api-gateway,ERROR,Downstream payment-processor returned HTTP 504 Gateway Timeout,tr-stripe-1003
2026-10-28T17:32:00Z,payment-processor,ERROR,Circuit breaker opened for partner 'stripe-external-api' consecutive failures=50,tr-stripe-1004
2026-10-28T17:32:30Z,edge-router,CRITICAL,High 5xx error rate detected on /api/v1/payments (42%),tr-stripe-1005
""",
    "metrics.json": [
        {"timestamp": "2026-10-28T17:30:00Z", "service": "payment-processor", "metric_name": "latency_p99_ms", "value": 320.0},
        {"timestamp": "2026-10-28T17:31:00Z", "service": "payment-processor", "metric_name": "latency_p99_ms", "value": 11400.0},
        {"timestamp": "2026-10-28T17:32:00Z", "service": "api-gateway", "metric_name": "error_rate", "value": 38.6},
        {"timestamp": "2026-10-28T17:32:00Z", "service": "edge-router", "metric_name": "error_rate", "value": 42.1}
    ],
    "traces.json": [
        {"trace_id": "tr-stripe-1002", "span_id": "sp-201", "service": "api-gateway", "operation": "POST /charge", "duration_ms": 10250, "status": "504"},
        {"trace_id": "tr-stripe-1002", "span_id": "sp-202", "parent_span_id": "sp-201", "service": "payment-processor", "operation": "partner_authorize", "duration_ms": 10005, "status": "error"}
    ],
    "service_dependencies.json": {
        "services": ["edge-router", "api-gateway", "payment-processor", "stripe-external-api"],
        "dependencies": [
            {"source": "edge-router", "target": "api-gateway"},
            {"source": "api-gateway", "target": "payment-processor"},
            {"source": "payment-processor", "target": "stripe-external-api"}
        ]
    }
}
create_zip("03_downstream_third_party_gateway_timeout.zip", s3_files)

# ==============================================================================
# Scenario 4: Memory Leak & CPU Saturation OOM Crash
# ==============================================================================
s4_files = {
    "metrics.csv": """timestamp,service,metric_name,value
2026-10-28T19:00:00Z,search-indexer,memory_utilization,55.0
2026-10-28T19:10:00Z,search-indexer,memory_utilization,72.4
2026-10-28T19:18:00Z,search-indexer,memory_utilization,89.1
2026-10-28T19:21:00Z,search-indexer,memory_utilization,98.6
2026-10-28T19:21:00Z,search-indexer,cpu_utilization,96.8
2026-10-28T19:22:00Z,search-indexer,jvm_gc_pause_time_ms,5400.0
""",
    "logs.log": """[2026-10-28T19:15:10Z] [WARN] [search-indexer] Heap usage reached 85% of max allocated limits (6800MB/8000MB)
[2026-10-28T19:20:45Z] [ERROR] [search-indexer] Full GC cycle invocation failed to reclaim unreferenced search index shards
[2026-10-28T19:21:50Z] [ERROR] [search-indexer] java.lang.OutOfMemoryError: Java heap space
[2026-10-28T19:22:15Z] [CRITICAL] [search-indexer] Kernel invoked OOM-killer: oom_score_adj 1000, pid 41902 killed
[2026-10-28T19:22:20Z] [ERROR] [api-gateway] Upstream search-indexer connection refused broken pipe
""",
    "traces.json": [
        {"trace_id": "tr-oom-301", "span_id": "sp-o1", "service": "api-gateway", "operation": "GET /search", "duration_ms": 6200, "status": "503"},
        {"trace_id": "tr-oom-301", "span_id": "sp-o2", "parent_span_id": "sp-o1", "service": "search-indexer", "operation": "lucene_query", "duration_ms": 6150, "status": "failed"}
    ],
    "service_dependencies.json": {
        "services": ["frontend-web", "api-gateway", "search-indexer", "kafka-cluster"],
        "dependencies": [
            {"source": "frontend-web", "target": "api-gateway"},
            {"source": "api-gateway", "target": "search-indexer"},
            {"source": "search-indexer", "target": "kafka-cluster"}
        ]
    }
}
create_zip("04_memory_leak_oom_crash.zip", s4_files)

# ==============================================================================
# Scenario 5: Microservice Distributed RPC Latency & Redis Cache Saturation
# ==============================================================================
s5_files = {
    "traces.json": [
        {"trace_id": "tr-rpc-701", "span_id": "sp-r1", "service": "web-portal", "operation": "GET /account/dashboard", "duration_ms": 3200, "status": "504"},
        {"trace_id": "tr-rpc-701", "span_id": "sp-r2", "parent_span_id": "sp-r1", "service": "api-bff", "operation": "fetch_user_summary", "duration_ms": 3150, "status": "timeout"},
        {"trace_id": "tr-rpc-701", "span_id": "sp-r3", "parent_span_id": "sp-r2", "service": "auth-service", "operation": "validate_session_token", "duration_ms": 2800, "status": "error"},
        {"trace_id": "tr-rpc-701", "span_id": "sp-r4", "parent_span_id": "sp-r3", "service": "redis-cache", "operation": "redis.get", "duration_ms": 2650, "status": "timeout"}
    ],
    "logs.csv": """timestamp,service,level,message,trace_id
2026-10-28T20:10:05Z,auth-service,INFO,Session validation requested for user 88392,tr-rpc-701
2026-10-28T20:10:15Z,auth-service,ERROR,Redis connection timeout calling downstream cluster on 10.0.4.12:6379,tr-rpc-701
2026-10-28T20:10:20Z,api-bff,ERROR,Client timeout calling downstream auth-service deadline exceeded (2500ms),tr-rpc-701
2026-10-28T20:10:30Z,web-portal,ERROR,Dashboard rendering failed: upstream session gateway 504 timeout,tr-rpc-701
""",
    "metrics.json": [
        {"timestamp": "2026-10-28T20:09:00Z", "service": "redis-cache", "metric_name": "latency_p99_ms", "value": 2.4},
        {"timestamp": "2026-10-28T20:10:00Z", "service": "redis-cache", "metric_name": "latency_p99_ms", "value": 2650.0},
        {"timestamp": "2026-10-28T20:10:00Z", "service": "auth-service", "metric_name": "latency_p95_ms", "value": 2900.0},
        {"timestamp": "2026-10-28T20:10:00Z", "service": "redis-cache", "metric_name": "cpu_utilization", "value": 98.4}
    ],
    "service_dependencies.json": {
        "services": ["web-portal", "api-bff", "auth-service", "redis-cache"],
        "dependencies": [
            {"source": "web-portal", "target": "api-bff"},
            {"source": "api-bff", "target": "auth-service"},
            {"source": "auth-service", "target": "redis-cache"}
        ]
    }
}
create_zip("05_microservice_rpc_bottleneck_latency.zip", s5_files)

# ==============================================================================
# Scenario 6: Multi-Region Network Partition & TLS Handshake Outage
# ==============================================================================
s6_files = {
    "logs.log": """[2026-10-28T21:40:02Z] [INFO] [ingress-us-east] Healthy connection pool established with eu-west-1 cross-region proxy
[2026-10-28T21:42:15Z] [ERROR] [ingress-us-east] TLS handshake failed with upstream sync-service-eu-west: broken pipe
[2026-10-28T21:42:30Z] [ERROR] [edge-proxy] Connection reset by peer while proxying to 10.240.12.8:443
[2026-10-28T21:43:00Z] [ERROR] [sync-service-eu-west] Network socket timeout on cross-region data replication channel
[2026-10-28T21:43:45Z] [CRITICAL] [ingress-us-east] Dropped 380 incoming customer sync requests due to upstream broker unreachable
""",
    "metrics.csv": """timestamp,service,metric_name,value
2026-10-28T21:40:00Z,ingress-us-east,packet_loss_pct,0.1
2026-10-28T21:42:00Z,ingress-us-east,packet_loss_pct,18.4
2026-10-28T21:42:00Z,edge-proxy,tcp_retransmit_rate,24.2
2026-10-28T21:43:00Z,ingress-us-east,error_rate,39.5
2026-10-28T21:43:00Z,sync-service-eu-west,latency_p99_ms,5200.0
""",
    "traces.json": [
        {"trace_id": "tr-net-901", "span_id": "sp-n1", "service": "ingress-us-east", "operation": "sync_customer_data", "duration_ms": 5100, "status": "504"},
        {"trace_id": "tr-net-901", "span_id": "sp-n2", "parent_span_id": "sp-n1", "service": "sync-service-eu-west", "operation": "cross_region_handshake", "duration_ms": 5050, "status": "timeout"}
    ],
    "service_dependencies.json": {
        "services": ["ingress-us-east", "edge-proxy", "sync-service-eu-west", "vault-cluster"],
        "dependencies": [
            {"source": "ingress-us-east", "target": "edge-proxy"},
            {"source": "edge-proxy", "target": "sync-service-eu-west"},
            {"source": "sync-service-eu-west", "target": "vault-cluster"}
        ]
    }
}
create_zip("06_multi_region_network_partition.zip", s6_files)

# ==============================================================================
# Scenario 7: Insufficient Telemetry & Engine Abstention Test
# ==============================================================================
s7_files = {
    "logs.csv": """timestamp,service,level,message
2026-10-28T22:00:00Z,edge-proxy,INFO,TLS handshake completed successfully client cipher ECDHE-RSA-AES128-GCM-SHA256
2026-10-28T22:00:15Z,edge-proxy,INFO,HTTP 200 GET /healthz 2ms
2026-10-28T22:00:30Z,edge-proxy,INFO,HTTP 200 GET /static/logo.png 4ms
2026-10-28T22:00:45Z,edge-proxy,INFO,Periodic worker routine completed without alerts
""",
    "metrics.json": [
        {"timestamp": "2026-10-28T22:00:00Z", "service": "edge-proxy", "metric_name": "cpu_utilization", "value": 14.2},
        {"timestamp": "2026-10-28T22:00:15Z", "service": "edge-proxy", "metric_name": "memory_utilization", "value": 32.0},
        {"timestamp": "2026-10-28T22:00:30Z", "service": "edge-proxy", "metric_name": "latency_p95_ms", "value": 8.5}
    ],
    "service_dependencies.json": {
        "services": ["edge-proxy", "static-cdn"],
        "dependencies": [
            {"source": "edge-proxy", "target": "static-cdn"}
        ]
    }
}
create_zip("07_insufficient_evidence_engine_abstention.zip", s7_files)

print("\nSuccessfully created all 7 scenario ZIP archives!")
