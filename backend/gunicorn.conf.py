"""
Gunicorn configuration for NAMA production deployment.

Tuned for 5,000–50,000 concurrent users:

  Architecture:
    Gunicorn (process manager)
      └── N × Uvicorn workers (async ASGI)
            └── FastAPI app (connection pool: 20+40 per worker)

  With 4 CPU cores and 4 workers:
    Max DB connections = 4 workers × 60 connections = 240
    Use PgBouncer (transaction mode) in front of Postgres to multiplex
    these into 30–50 actual DB connections.

  Scaling formula:
    Workers = (2 × CPU cores) + 1
    Max concurrent requests = workers × async tasks per worker
    At 1ms avg latency: 4 workers × 1000 rps/worker = ~4,000 rps throughput
"""

import os
import multiprocessing

# ── Binding ────────────────────────────────────────────────────────────────────
bind = os.getenv("GUNICORN_BIND", f"0.0.0.0:{os.getenv('PORT', '8000')}")
backlog = 2048

# ── Workers ────────────────────────────────────────────────────────────────────
# Use uvicorn worker class for ASGI (async support)
worker_class   = "uvicorn.workers.UvicornWorker"
workers        = int(os.getenv("WEB_CONCURRENCY", min((2 * multiprocessing.cpu_count()) + 1, 4)))
worker_connections = 1000    # concurrent connections per worker
max_requests   = 10_000      # restart worker after N requests (memory leak protection)
max_requests_jitter = 500    # randomize restart to avoid thundering herd

# ── Timeouts ───────────────────────────────────────────────────────────────────
timeout        = 60          # kill worker if request takes >60s
graceful_timeout = 30        # allow 30s for in-flight requests to finish on SIGTERM
keepalive      = 5           # keep HTTP keep-alive connections open for 5s

# ── Logging ────────────────────────────────────────────────────────────────────
accesslog      = "-"         # stdout
errorlog       = "-"         # stderr
loglevel       = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)sμs'

# ── Process naming ─────────────────────────────────────────────────────────────
proc_name      = "nama-os"

# ── Environment variables ─────────────────────────────────────────────────────
# For production PostgreSQL deployment:
#
#   Via PgBouncer (RECOMMENDED for high concurrency):
#   DATABASE_URL=postgresql://nama_user:password@127.0.0.1:6432/nama_db
#
#   Direct to PostgreSQL (no pooling):
#   DATABASE_URL=postgresql://nama_user:password@localhost:5432/nama_db
#
#   For local development with SQLite (default):
#   DATABASE_URL=sqlite:////tmp/nama_perf.db
#
# Override with environment variables instead of modifying this file:
#   export DATABASE_URL="postgresql://..."
#   gunicorn app.main:app --config gunicorn.conf.py

# raw_env intentionally removed — DO NOT add DATABASE_URL or REDIS_URL here.
# raw_env entries unconditionally overwrite host-injected env vars (Railway, Render, etc.),
# silently replacing the real Neon PostgreSQL URL with SQLite at gunicorn boot time.
# Set all secrets/URLs in Railway Dashboard → Variables instead.

# ── Pre-fork hooks ─────────────────────────────────────────────────────────────
def pre_fork(server, worker):
    """Called just before a worker is forked."""
    server.log.info("Worker being forked: pid=%s", worker.pid)

def worker_exit(server, worker):
    """Called just after a worker exits."""
    server.log.info("Worker exited: pid=%s", worker.pid)
