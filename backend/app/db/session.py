"""
Database Session — Production-hardened for high concurrency.

Connection pool settings tuned for:
  - PostgreSQL production:   pool_size=20, max_overflow=40 → max 60 connections
  - SQLite dev/test:         StaticPool with check_same_thread=False

For 5,000–50,000 concurrent users, the application layer connection pool should
be backed by PgBouncer (transaction-level pooling) in front of PostgreSQL.
This module handles the SQLAlchemy layer; PgBouncer handles the transport layer.

Environment variables:
  DATABASE_URL          — connection string (required in production)
  DB_POOL_SIZE          — base connections per process (default 20)
  DB_MAX_OVERFLOW       — burst connections above pool_size (default 40)
  DB_POOL_TIMEOUT       — seconds to wait for a free connection (default 30)
  DB_POOL_RECYCLE       — recycle connections after N seconds (default 1800)
  DB_ECHO               — log all SQL statements (default False)
"""

import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool, NullPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nama.db")

# ── Pool configuration ────────────────────────────────────────────────────────
_POOL_SIZE     = int(os.getenv("DB_POOL_SIZE",     "20"))
_MAX_OVERFLOW  = int(os.getenv("DB_MAX_OVERFLOW",  "40"))
_POOL_TIMEOUT  = int(os.getenv("DB_POOL_TIMEOUT",  "30"))
_POOL_RECYCLE  = int(os.getenv("DB_POOL_RECYCLE",  "1800"))
_ECHO          = os.getenv("DB_ECHO", "false").lower() == "true"

# ── Engine factory — different settings for SQLite vs PostgreSQL ──────────────
_is_sqlite = DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    # SQLite: StaticPool so the in-memory DB survives across threads (tests/dev)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=_ECHO,
    )
    # Enable WAL mode for better concurrent read performance in SQLite
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(conn, _):
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-64000")   # 64 MB page cache
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()
else:
    # PostgreSQL: full connection pooling for production concurrency
    engine = create_engine(
        DATABASE_URL,
        pool_size=_POOL_SIZE,
        max_overflow=_MAX_OVERFLOW,
        pool_timeout=_POOL_TIMEOUT,
        pool_recycle=_POOL_RECYCLE,
        pool_pre_ping=True,           # detect stale connections before use
        echo=_ECHO,
    )

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# ── Performance Indexes ───────────────────────────────────────────────────────
# Create composite indexes on startup to fix 87-94% error rate under high load
def init_performance_indexes():
    """
    Initialize all performance indexes after tables are created.

    Call this AFTER Base.metadata.create_all(bind=engine) in main.py.
    This ensures all tables exist before we try to create indexes on them.
    """
    try:
        from app.db.indexes import create_all_indexes
        create_all_indexes(engine)
    except ImportError:
        # indexes.py may not exist in older deployments
        pass
    except Exception as e:
        print(f"Warning: Failed to initialize performance indexes: {e}")


# ── FastAPI dependency ────────────────────────────────────────────────────────
def get_db():
    """
    Dependency that yields a DB session and ensures it is always closed.

    Uses context-manager pattern so exceptions during the request still
    trigger session.close() and return the connection to the pool.

    Tier 10D — RLS plumbing:
      If the request has a known tenant_id (set by RequestLoggingMiddleware
      from the JWT), execute `SET LOCAL app.tenant_id = N` so any RLS
      policies keyed off `current_setting('app.tenant_id', true)` evaluate
      cleanly. SET LOCAL only lasts for the current transaction, so the
      session is safe to return to the pool after request completion.

      Currently a no-op until RLS policies are enabled on tables (see
      migration `t7u8v9w0x1y2_add_tenant_rls_policies.py`). Adding it now
      makes the eventual enforcement flip a one-line change.
    """
    db = SessionLocal()
    try:
        if not _is_sqlite:
            try:
                from app.core.structured_log import get_tenant_id
                tid = get_tenant_id()
                if tid is not None:
                    # SET LOCAL must run inside a transaction. SQLAlchemy 2.x
                    # auto-begins on first execute; SET LOCAL itself counts.
                    db.execute(text("SET LOCAL app.tenant_id = :tid"), {"tid": int(tid)})
            except Exception:
                # Never let RLS plumbing fail a request — fall through silently.
                pass
        yield db
    finally:
        db.close()
