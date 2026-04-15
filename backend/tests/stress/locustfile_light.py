"""
NAMA Platform — Locust Light Smoke Test
========================================
Quick CI smoke test for PR checks and pre-deployment validation.
- 200 concurrent users, 20s ramp, 60s run
- Simplified task set: perf, leads, dashboard, whatsapp webhook
- Same token pool pattern as main locustfile
- Faster feedback loop for CI pipelines

Run command:
  locust -f locustfile_light.py --headless -u 200 -r 20 --run-time 60s \
         --host http://localhost:8000
"""

import random
import string
import threading
import time
from locust import HttpUser, TaskSet, task, between, events


# ── Shared test data ──────────────────────────────────────────────────────────

DESTINATIONS = [
    "Bali, Indonesia", "Maldives", "Dubai, UAE", "Paris, France",
    "Tokyo, Japan", "Singapore", "London, UK", "New York, USA",
    "Santorini, Greece", "Cape Town, South Africa",
]

QUERY_TEMPLATES = [
    "Hi! Looking for a {style} trip to {dest} for {pax} people in {month}. Budget ₹{budget}.",
    "Need a {duration} day {dest} package for my family of {pax}.",
    "Planning honeymoon to {dest}. {duration} nights in {month}.",
]

MONTHS = ["January", "February", "March", "April", "May", "June"]
STYLES = ["luxury", "budget", "standard"]


def random_query() -> str:
    template = random.choice(QUERY_TEMPLATES)
    return template.format(
        dest=random.choice(DESTINATIONS),
        style=random.choice(STYLES),
        pax=random.randint(1, 8),
        month=random.choice(MONTHS),
        duration=random.randint(3, 14),
        budget=random.randint(25000, 500000),
    )


# ── Shared token pool ─────────────────────────────────────────────────────────

_TOKEN_LOCK = threading.Lock()
_TOKEN_POOL = {
    "agent": None,   # R3_SALES_MANAGER token
}


@events.init.add_listener
def prefetch_tokens(environment, **kwargs):
    """Pre-fetch token before ramp starts."""
    import requests
    host = environment.host or "http://localhost:8000"
    try:
        r = requests.post(
            f"{host}/api/v1/login",
            data={"username": "demo@namatest.dev", "password": "Demo123!"},
            timeout=30,
        )
        if r.status_code == 200:
            _TOKEN_POOL["agent"] = r.json().get("access_token")
            print(f"[pool] Agent token cached: {_TOKEN_POOL['agent'][:20]}...")
    except Exception as e:
        print(f"[pool] Token prefetch failed: {e}")


# ── Task sets ─────────────────────────────────────────────────────────────────

class LightSalesAgentTasks(TaskSet):
    """Simplified sales agent workload for quick smoke tests."""

    token: str = ""

    def on_start(self):
        """Get token from pool or fall back to login."""
        self.token = _TOKEN_POOL.get("agent") or ""
        if not self.token:
            with self.client.post(
                "/api/v1/login",
                data={"username": "demo@namatest.dev", "password": "Demo123!"},
                catch_response=True,
                name="/api/v1/login [setup]",
            ) as resp:
                if resp.status_code == 200:
                    self.token = resp.json().get("access_token", "")
                resp.success()

    def _auth_headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(5)
    def health_check(self):
        """Baseline health check."""
        self.client.get("/api/v1/perf", name="/api/v1/perf")

    @task(3)
    def get_dashboard(self):
        """Dashboard access."""
        self.client.get(
            "/api/v1/analytics/dashboard",
            headers=self._auth_headers(),
            name="/api/v1/analytics/dashboard",
        )

    @task(4)
    def list_leads(self):
        """Browse leads."""
        page = random.randint(1, 3)
        self.client.get(
            f"/api/v1/leads/?page={page}&size=20",
            headers=self._auth_headers(),
            name="/api/v1/leads/ [list]",
        )


class LightWebhookTasks(TaskSet):
    """Lightweight webhook ingestion."""

    @task(10)
    def whatsapp_webhook(self):
        """High-frequency webhook ingestion."""
        self.client.post(
            "/api/v1/queries/whatsapp-webhook",
            json={
                "Body": random_query(),
                "From": f"whatsapp:+91{random.randint(7000000000, 9999999999)}",
                "To": "whatsapp:+14155238886",
            },
            name="/api/v1/queries/whatsapp-webhook",
        )

    @task(1)
    def health(self):
        self.client.get("/api/v1/perf", name="/api/v1/perf [webhook]")


# ── User classes ──────────────────────────────────────────────────────────────

class LightSalesAgentUser(HttpUser):
    """70% of traffic — sales agent in smoke test."""
    tasks = [LightSalesAgentTasks]
    weight = 70
    wait_time = between(1, 3)


class LightWebhookUser(HttpUser):
    """30% of traffic — webhook ingestion in smoke test."""
    tasks = [LightWebhookTasks]
    weight = 30
    wait_time = between(0.1, 0.5)


# ── Test lifecycle events ─────────────────────────────────────────────────────

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n" + "="*60)
    print("NAMA Light Smoke Test Starting")
    print(f"Target host: {environment.host}")
    print("="*60 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    stats = environment.stats
    total = stats.total
    print("\n" + "="*60)
    print("NAMA Light Smoke Test Complete")
    print(f"  Requests:       {total.num_requests:,}")
    print(f"  Failures:       {total.num_failures:,}")
    print(f"  Error rate:     {total.fail_ratio:.2%}")
    print(f"  Avg latency:    {total.avg_response_time:.1f}ms")
    print(f"  p50 latency:    {total.get_response_time_percentile(0.5):.1f}ms")
    print(f"  p95 latency:    {total.get_response_time_percentile(0.95):.1f}ms")
    print(f"  p99 latency:    {total.get_response_time_percentile(0.99):.1f}ms")
    print(f"  Throughput:     {total.current_rps:.1f} rps")
    print()

    # Quick SLA check
    checks = [
        ("p50 < 200ms",  total.get_response_time_percentile(0.5),  200),
        ("Error < 5%",   total.fail_ratio * 100,                   5),
    ]
    print("Smoke Test Results:")
    for label, actual, limit in checks:
        passed = actual <= limit
        status = "PASS" if passed else "FAIL"
        print(f"  {status}  {label}  (actual: {actual:.1f})")

    print("="*60 + "\n")
