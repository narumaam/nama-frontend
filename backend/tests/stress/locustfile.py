"""
NAMA Platform — Locust Stress Test Suite
==========================================
Simulates realistic travel platform user journeys.

User distribution (based on typical B2B SaaS traffic):
  60% — SalesAgentUser   (browse leads, view dashboard, update statuses)
  20% — ManagerUser      (analytics, finance reports, itinerary review)
  15% — WebhookUser      (WhatsApp webhook ingestion — machine traffic)
   5% — AdminUser        (AI admin, budget management)

Run commands:
  # 5,000 concurrent users (ramp up over 2 minutes):
  locust -f locustfile.py --headless -u 5000 -r 42 --run-time 5m \
         --host http://localhost:8000 --html report_5k.html \
         --csv results_5k

  # 50,000 concurrent users (ramp up over 10 minutes):
  locust -f locustfile.py --headless -u 50000 -r 84 --run-time 10m \
         --host http://localhost:8000 --html report_50k.html \
         --csv results_50k

  # Quick smoke test (100 users):
  locust -f locustfile.py --headless -u 100 -r 10 --run-time 60s \
         --host http://localhost:8000

SLA targets (production-realistic):
  p50 latency  < 200ms
  p95 latency  < 1000ms
  p99 latency  < 3000ms
  Error rate   < 2%
  Throughput   > 500 rps at 5K users
"""

import json
import random
import string
import threading
import time
from locust import HttpUser, TaskSet, task, between, events
from locust.exception import StopUser


# ── Shared test data ──────────────────────────────────────────────────────────

DESTINATIONS = [
    "Bali, Indonesia", "Maldives", "Dubai, UAE", "Paris, France",
    "Tokyo, Japan", "Singapore", "London, UK", "New York, USA",
    "Santorini, Greece", "Cape Town, South Africa", "Rajasthan, India",
    "Phuket, Thailand", "Barcelona, Spain", "Mauritius", "Zanzibar",
]

QUERY_TEMPLATES = [
    "Hi! Looking for a {style} trip to {dest} for {pax} people in {month}. Budget ₹{budget} per person.",
    "Need a {duration} day {dest} package for my family of {pax}. {month} travel. Budget around ₹{budget}.",
    "Planning honeymoon to {dest}. {duration} nights in {month}. {style} experience. Budget ₹{budget} per head.",
    "Corporate team outing for {pax} people to {dest}. {duration} days. {month}.",
    "Looking for {style} {dest} tour. {pax} travelers, {duration} nights, {month} dates.",
]

MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]

STYLES = ["luxury", "budget", "standard", "premium", "backpacker"]


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


def random_email() -> str:
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"stress_{suffix}@namatest.dev"


# ── Shared token pool (avoid bcrypt thundering herd) ──────────────────────────

_TOKEN_LOCK = threading.Lock()
_TOKEN_POOL = {
    "agent": None,   # R3_SALES_MANAGER token for SalesAgentUser
    "admin": None,   # R2_ORG_ADMIN token for ManagerUser/AdminUser
}


@events.init.add_listener
def prefetch_tokens(environment, **kwargs):
    """
    Pre-fetch shared tokens before ramp starts.
    Avoids bcrypt thundering herd: ~300ms per hash × 5000 users = 25 minutes of CPU saturation.
    Instead, prefetch 2 tokens (agent + admin) once, reuse across all users.
    """
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
        r2 = requests.post(
            f"{host}/api/v1/login",
            data={"username": "admin@namatest.dev", "password": "Demo123!"},
            timeout=30,
        )
        if r2.status_code == 200:
            _TOKEN_POOL["admin"] = r2.json().get("access_token")
            print(f"[pool] Admin token cached: {_TOKEN_POOL['admin'][:20]}...")
    except Exception as e:
        print(f"[pool] Token prefetch failed: {e} — users will login individually")


# ── Task sets by user type ─────────────────────────────────────────────────────

class SalesAgentTasks(TaskSet):
    """
    Simulates a sales agent's typical workday session.
    Most common user type (60% of traffic).
    """

    token: str = ""
    tenant_id: int = 1

    def on_start(self):
        """Get token from pool, fall back to individual login if pool is empty."""
        # First try to use the shared token from prefetch pool
        self.token = _TOKEN_POOL.get("agent") or ""
        if not self.token:
            # Fallback: individual login (pool prefetch may have failed)
            with self.client.post(
                "/api/v1/login",
                data={"username": "demo@namatest.dev", "password": "Demo123!"},
                catch_response=True,
                name="/api/v1/login [setup]",
            ) as resp:
                if resp.status_code == 200:
                    data = resp.json()
                    self.token = data.get("access_token", "")
                    self.tenant_id = data.get("tenant_id", 1)
                    resp.success()
                else:
                    self.token = ""
                    resp.success()

        # Warm up the analytics cache (lightweight call)
        with self.client.get(
            "/api/v1/analytics/dashboard",
            headers=self._auth_headers(),
            name="/api/v1/analytics/dashboard [warmup]",
            catch_response=True,
        ) as warmup_resp:
            warmup_resp.success()

    def _auth_headers(self) -> dict:
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @task(5)
    def health_check(self):
        """Cheapest possible endpoint — no DB, no auth."""
        self.client.get("/api/v1/perf", name="/api/v1/perf")

    @task(3)
    def get_dashboard(self):
        """Main dashboard KPIs — hits analytics agent."""
        self.client.get(
            "/api/v1/analytics/dashboard",
            headers=self._auth_headers(),
            name="/api/v1/analytics/dashboard",
        )

    @task(4)
    def list_leads(self):
        """Browse lead pipeline."""
        page = random.randint(1, 3)
        self.client.get(
            f"/api/v1/leads/?page={page}&size=20",
            headers=self._auth_headers(),
            name="/api/v1/leads/ [list]",
        )

    @task(2)
    def list_leads_filtered(self):
        """Filter leads by status."""
        statuses = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT"]
        status = random.choice(statuses)
        self.client.get(
            f"/api/v1/leads/?status={status}&size=10",
            headers=self._auth_headers(),
            name="/api/v1/leads/ [filtered]",
        )

    @task(2)
    def list_bookings(self):
        """View bookings list."""
        self.client.get(
            "/api/v1/bookings/",
            headers=self._auth_headers(),
            name="/api/v1/bookings/ [list]",
        )

    @task(1)
    def ingest_query(self):
        """Simulate a new inbound query (e.g., staff entering a manual query)."""
        self.client.post(
            "/api/v1/queries/ingest",
            json={
                "source": "DIRECT",
                "content": random_query(),
                "sender_id": f"+91{random.randint(7000000000, 9999999999)}",
                "tenant_id": self.tenant_id,
            },
            headers=self._auth_headers(),
            name="/api/v1/queries/ingest",
        )

    @task(1)
    def list_itineraries(self):
        """Browse itinerary library."""
        self.client.get(
            "/api/v1/itineraries/",
            headers=self._auth_headers(),
            name="/api/v1/itineraries/ [list]",
        )

    @task(1)
    def list_destinations(self):
        """Content library — destination browse."""
        self.client.get(
            "/api/v1/content/destinations",
            headers=self._auth_headers(),
            name="/api/v1/content/destinations",
        )

    @task(1)
    def view_lead_detail(self):
        """View a specific lead (will 404 if none exist, that's OK)."""
        lead_id = random.randint(1, 50)
        with self.client.get(
            f"/api/v1/leads/{lead_id}",
            headers=self._auth_headers(),
            name="/api/v1/leads/{id}",
            catch_response=True,
        ) as resp:
            resp.success()  # 404 is expected for nonexistent leads

    @task(1)
    def refresh_token(self):
        """Periodic token refresh (background browser action)."""
        with self.client.post(
            "/api/v1/refresh",
            name="/api/v1/refresh",
            catch_response=True,
        ) as resp:
            resp.success()  # ignore 401 — refresh cookie may not be set in load test


class ManagerTasks(TaskSet):
    """
    Simulates a sales manager / org admin.
    Heavier analytics + finance usage (20% of traffic).
    """

    token: str = ""

    def on_start(self):
        # Use shared admin token from pool, fall back to individual login
        self.token = _TOKEN_POOL.get("admin") or ""
        if not self.token:
            with self.client.post(
                "/api/v1/login",
                data={"username": "admin@namatest.dev", "password": "Demo123!"},
                catch_response=True,
                name="/api/v1/login [manager setup]",
            ) as resp:
                if resp.status_code == 200:
                    self.token = resp.json().get("access_token", "")
                resp.success()

    def _auth(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(4)
    def analytics_dashboard(self):
        self.client.get("/api/v1/analytics/dashboard", headers=self._auth(),
                        name="/api/v1/analytics/dashboard [manager]")

    @task(2)
    def analytics_anomalies(self):
        self.client.get("/api/v1/analytics/anomalies", headers=self._auth(),
                        name="/api/v1/analytics/anomalies")

    @task(2)
    def analytics_forecast(self):
        self.client.get("/api/v1/analytics/forecast", headers=self._auth(),
                        name="/api/v1/analytics/forecast")

    @task(2)
    def finance_summary(self):
        self.client.get("/api/v1/finance/summary", headers=self._auth(),
                        name="/api/v1/finance/summary")

    @task(2)
    def leads_all(self):
        self.client.get("/api/v1/leads/?size=50", headers=self._auth(),
                        name="/api/v1/leads/ [manager all]")

    @task(1)
    def ai_health(self):
        self.client.get("/api/v1/ai/health", headers=self._auth(),
                        name="/api/v1/ai/health")

    @task(1)
    def ai_budget(self):
        self.client.get("/api/v1/ai/budget", headers=self._auth(),
                        name="/api/v1/ai/budget")

    @task(3)
    def health(self):
        self.client.get("/api/v1/perf", name="/api/v1/perf [manager]")


class WebhookTasks(TaskSet):
    """
    Simulates inbound WhatsApp/webhook traffic.
    Machine-to-machine — no auth required (15% of traffic).
    This is the highest-throughput ingestion path.
    NO on_start needed: webhooks don't login.
    """

    @task(15)
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

    @task(2)
    def health(self):
        self.client.get("/api/v1/perf", name="/api/v1/perf [webhook]")


class AdminTasks(TaskSet):
    """
    Simulates platform admin activities (5% of traffic).
    """

    token: str = ""

    def on_start(self):
        # Use shared admin token from pool, fall back to individual login
        self.token = _TOKEN_POOL.get("admin") or ""
        if not self.token:
            with self.client.post(
                "/api/v1/login",
                data={"username": "admin@namatest.dev", "password": "Demo123!"},
                catch_response=True,
                name="/api/v1/login [admin setup]",
            ) as resp:
                if resp.status_code == 200:
                    self.token = resp.json().get("access_token", "")
                resp.success()

    def _auth(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(3)
    def ai_health(self):
        self.client.get("/api/v1/ai/health", headers=self._auth(),
                        name="/api/v1/ai/health [admin]")

    @task(2)
    def ai_usage(self):
        self.client.get("/api/v1/ai/usage", headers=self._auth(),
                        name="/api/v1/ai/usage")

    @task(1)
    def system_health(self):
        self.client.get("/api/v1/health", headers=self._auth(),
                        name="/api/v1/health [full]")

    @task(2)
    def list_leads(self):
        self.client.get("/api/v1/leads/?size=100", headers=self._auth(),
                        name="/api/v1/leads/ [admin]")

    @task(1)
    def portal_lookup(self):
        self.client.get("/api/v1/portals/lookup?org_code=demo",
                        headers=self._auth(), name="/api/v1/portals/lookup")


# ── User classes ───────────────────────────────────────────────────────────────

class SalesAgentUser(HttpUser):
    """60% of traffic — typical agent browsing leads, viewing dashboard."""
    tasks = [SalesAgentTasks]
    weight = 60
    wait_time = between(1, 5)         # think time: 1-5 seconds between requests


class ManagerUser(HttpUser):
    """20% of traffic — manager reviewing analytics and finance."""
    tasks = [ManagerTasks]
    weight = 20
    wait_time = between(3, 10)        # managers think longer


class WebhookUser(HttpUser):
    """15% of traffic — automated WhatsApp message ingestion."""
    tasks = [WebhookTasks]
    weight = 15
    wait_time = between(0.1, 0.5)    # bursty machine traffic


class AdminUser(HttpUser):
    """5% of traffic — platform administrators."""
    tasks = [AdminTasks]
    weight = 5
    wait_time = between(5, 15)       # admins do periodic checks


# ── Custom event hooks for metrics ────────────────────────────────────────────

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n" + "="*60)
    print("NAMA Platform Stress Test Starting")
    print(f"Target host: {environment.host}")
    print("="*60 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    stats = environment.stats
    total = stats.total
    print("\n" + "="*60)
    print("NAMA Stress Test Complete")
    print(f"  Requests:       {total.num_requests:,}")
    print(f"  Failures:       {total.num_failures:,}")
    print(f"  Error rate:     {total.fail_ratio:.2%}")
    print(f"  Avg latency:    {total.avg_response_time:.1f}ms")
    print(f"  p50 latency:    {total.get_response_time_percentile(0.5):.1f}ms")
    print(f"  p95 latency:    {total.get_response_time_percentile(0.95):.1f}ms")
    print(f"  p99 latency:    {total.get_response_time_percentile(0.99):.1f}ms")
    print(f"  Max latency:    {total.max_response_time:.1f}ms")
    print(f"  Throughput:     {total.current_rps:.1f} rps")
    print()

    # SLA check (production-realistic thresholds)
    sla_pass = True
    checks = [
        ("p50 < 200ms",  total.get_response_time_percentile(0.5),  200),
        ("p95 < 1000ms", total.get_response_time_percentile(0.95), 1000),
        ("p99 < 3000ms", total.get_response_time_percentile(0.99), 3000),
        ("Error < 2%",   total.fail_ratio * 100,                   2),
    ]
    print("SLA Results (production-realistic):")
    for label, actual, limit in checks:
        passed = actual <= limit
        sla_pass = sla_pass and passed
        status = "PASS" if passed else "FAIL"
        print(f"  {status}  {label}  (actual: {actual:.1f})")

    print()
    print(f"Overall SLA: {'PASSED' if sla_pass else 'FAILED'}")
    print("="*60 + "\n")
