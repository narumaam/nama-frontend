"""
Async Database Session — for non-blocking IO with SQLAlchemy 2.0+

Engines:
  - sqlite+aiosqlite:// (dev/test)
  - postgresql+asyncpg:// (production)

Pool settings tuned for 5K–50K concurrent users.
Backed by aiosqlite (dev) or asyncpg (prod) for truly async DB calls.
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nama.db")

# ── Pool configuration ────────────────────────────────────────────────────────
_POOL_SIZE     = int(os.getenv("DB_POOL_SIZE",     "20"))
_MAX_OVERFLOW  = int(os.getenv("DB_MAX_OVERFLOW",  "40"))
_POOL_TIMEOUT  = int(os.getenv("DB_POOL_TIMEOUT",  "30"))
_POOL_RECYCLE  = int(os.getenv("DB_POOL_RECYCLE",  "1800"))
_ECHO          = os.getenv("DB_ECHO", "false").lower() == "true"


def _make_async_url(url: str) -> str:
    """Convert sync DB URLs to async equivalents."""
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    # Already async or unknown
    return url


ASYNC_DATABASE_URL = _make_async_url(DATABASE_URL)

# ── Engine factory ─────────────────────────────────────────────────────────────
_is_sqlite = ASYNC_DATABASE_URL.startswith("sqlite+aiosqlite")

if _is_sqlite:
    # SQLite async: use NullPool for simplicity, single connection per request
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
        echo=_ECHO,
    )
else:
    # PostgreSQL async: full connection pooling
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        pool_size=_POOL_SIZE,
        max_overflow=_MAX_OVERFLOW,
        pool_timeout=_POOL_TIMEOUT,
        pool_recycle=_POOL_RECYCLE,
        pool_pre_ping=True,
        echo=_ECHO,
    )

# ── Session factory ────────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def get_async_db():
    """
    Async dependency that yields an AsyncSession and ensures it is always closed.
    Use with `async def` endpoints only.

    Example:
        @router.get("/")
        async def my_endpoint(db: AsyncSession = Depends(get_async_db)):
            result = await db.execute(...)
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
