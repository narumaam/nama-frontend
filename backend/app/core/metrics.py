"""
Prometheus Metrics for NAMA Platform
=====================================
Exposes key business and technical metrics at GET /api/v1/metrics
Requires R2_ORG_ADMIN or higher role.

Metrics tracked:
  - http_requests_total         (counter, by method/endpoint/status/tenant)
  - http_request_duration_seconds (histogram, by method/endpoint)
  - active_leads_total          (gauge, by tenant)
  - db_query_duration_seconds   (histogram, by operation)
  - cache_hits_total            (counter, hit/miss)
  - ai_requests_total           (counter, by agent/status)
"""

from prometheus_client import (
    Counter, Histogram, Gauge, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST
)
import time

# Use a custom registry to avoid conflicts with default global registry
REGISTRY = CollectorRegistry()

# ── HTTP Metrics ───────────────────────────────────────────────────────────────
http_requests_total = Counter(
    "nama_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code", "tenant_id"],
    registry=REGISTRY,
)

http_request_duration = Histogram(
    "nama_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
    registry=REGISTRY,
)

# ── Business Metrics ───────────────────────────────────────────────────────────
active_leads = Gauge(
    "nama_active_leads_total",
    "Number of active leads per tenant",
    ["tenant_id"],
    registry=REGISTRY,
)

# ── Cache Metrics ──────────────────────────────────────────────────────────────
cache_operations = Counter(
    "nama_cache_operations_total",
    "Cache hits and misses",
    ["operation", "result"],  # operation: get/set, result: hit/miss/ok/error
    registry=REGISTRY,
)

# ── AI Metrics ─────────────────────────────────────────────────────────────────
ai_requests = Counter(
    "nama_ai_requests_total",
    "AI agent requests",
    ["agent", "status"],  # status: success/failure/circuit_open
    registry=REGISTRY,
)

# ── DB Metrics ─────────────────────────────────────────────────────────────────
db_query_duration = Histogram(
    "nama_db_query_duration_seconds",
    "Database query duration",
    ["operation"],  # select/insert/update/delete
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0],
    registry=REGISTRY,
)

# ── Helper functions ───────────────────────────────────────────────────────────

def record_request(method: str, endpoint: str, status_code: int, tenant_id: str, duration_seconds: float):
    """Record a completed HTTP request."""
    http_requests_total.labels(
        method=method,
        endpoint=endpoint,
        status_code=str(status_code),
        tenant_id=str(tenant_id),
    ).inc()
    http_request_duration.labels(method=method, endpoint=endpoint).observe(duration_seconds)

def record_cache_hit(operation: str = "get"):
    cache_operations.labels(operation=operation, result="hit").inc()

def record_cache_miss(operation: str = "get"):
    cache_operations.labels(operation=operation, result="miss").inc()

def record_ai_request(agent: str, success: bool):
    ai_requests.labels(agent=agent, status="success" if success else "failure").inc()

def get_metrics_output() -> tuple[bytes, str]:
    """Generate Prometheus text format output."""
    return generate_latest(REGISTRY), CONTENT_TYPE_LATEST
