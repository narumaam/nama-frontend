"""Alembic environment configuration for NAMA travel platform.

This module handles database migration setup for both SQLite (development)
and PostgreSQL (production). It discovers all models automatically via the
app's Base metadata object and supports autogenerate migrations.
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool, inspect

from alembic import context

# Add the project root to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the Base and all models so Alembic knows about the schema
from app.db.session import Base, DATABASE_URL

config = context.config

# Configure logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate support
target_metadata = Base.metadata


def get_database_url() -> str:
    """
    Get the database URL, preferring DATABASE_URL env var, then config file.

    For SQLite and async drivers, we need to strip async prefixes for Alembic
    since it uses synchronous connections.
    """
    db_url = os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url")

    if not db_url:
        db_url = DATABASE_URL

    # Strip async driver prefixes — Alembic needs sync drivers
    db_url = db_url.replace("+aiosqlite", "").replace("+asyncpg", "")

    return db_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine.
    Useful for generating migration scripts without connecting to the database.
    """
    url = get_database_url()

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Creates an Engine and runs migrations with a live database connection.
    Proper for development and production deployment.
    """
    url = get_database_url()

    # Configure engine creation
    config.set_main_option("sqlalchemy.url", url)

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,  # Detect column type changes
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
