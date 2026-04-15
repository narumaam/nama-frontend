#!/usr/bin/env python3
"""
NAMA SQLite → PostgreSQL Migration Script
==========================================

Migrates all NAMA data from SQLite (dev) to PostgreSQL (production) with:
  - Correct dependency order (tenants → users → leads → bookings → payments)
  - Idempotent execution (safe to re-run)
  - Progress reporting
  - Dry-run mode for validation

Usage:
    python scripts/migrate_to_postgres.py \\
        --sqlite sqlite:////tmp/nama_perf.db \\
        --postgres postgresql://nama_user:password@localhost:5432/nama_db

For PgBouncer:
    python scripts/migrate_to_postgres.py \\
        --sqlite sqlite:////tmp/nama_perf.db \\
        --postgres postgresql://nama_user:password@127.0.0.1:6432/nama_db

Requirements:
    pip install psycopg2-binary sqlalchemy

Environment variables (optional):
    DATABASE_URL  — if not using --sqlite flag
    DB_ECHO       — set to 'true' to log all SQL statements
"""

import argparse
import sys
import os
from typing import List, Dict, Any
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Import Base to register all models
from app.db.session import Base
# Import all models to ensure they're registered with Base.metadata
from app.models.auth import Tenant, User  # Parent tables
from app.models.leads import Lead, LeadTag
from app.models.itineraries import Itinerary
from app.models.bookings import Booking, BookingItem
from app.models.payments import Payment, WebhookEvent, LedgerEntry
from app.models.vendors import Vendor, VendorRate
from app.models.corporate import CorporatePO, FixedDeparture
from app.models.ai_usage import AIUsage, TenantAIBudget
from app.models.content import MediaAsset, Destination, ContentBlock
from app.models.portals import Portal


# Table migration order (dependencies: parents before children)
MIGRATION_ORDER = [
    # Root tables (no foreign keys)
    "tenants",

    # User hierarchy
    "users",

    # Content & configuration
    "media_assets",
    "destinations",
    "content_blocks",
    "portals",

    # Vendor management
    "vendors",
    "vendor_rates",

    # Lead lifecycle
    "leads",
    "lead_tags",

    # Itineraries
    "itineraries",

    # Bookings
    "bookings",
    "booking_items",

    # Payments & Finance
    "payments",
    "webhook_events",
    "ledger_entries",

    # Corporate/B2B
    "corporate_pos",
    "fixed_departures",

    # AI usage tracking
    "ai_usage",
    "tenant_ai_budgets",
]


class PostgresMigrator:
    def __init__(self, sqlite_url: str, postgres_url: str, dry_run: bool = False):
        self.sqlite_url = sqlite_url
        self.postgres_url = postgres_url
        self.dry_run = dry_run
        self.sqlite_engine = None
        self.pg_engine = None
        self.total_rows_migrated = 0
        self.migration_stats = {}

    def connect(self):
        """Establish connections to both databases."""
        try:
            # SQLite connection
            self.sqlite_engine = create_engine(
                self.sqlite_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
                echo=False,
            )

            # PostgreSQL connection
            self.pg_engine = create_engine(
                self.postgres_url,
                pool_size=10,
                max_overflow=5,
                echo=False,
            )

            # Test connections
            with self.sqlite_engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            if not self.dry_run:
                with self.pg_engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                print("✓ Connected to PostgreSQL target")
            else:
                print("✓ [DRY-RUN] Skipping PostgreSQL connection check")

            print("✓ Connected to SQLite source")
            return True

        except Exception as e:
            print(f"✗ Connection failed: {e}", file=sys.stderr)
            return False

    def create_schema(self):
        """Create all tables in PostgreSQL."""
        if self.dry_run:
            print("\n[DRY-RUN] Would create schema in PostgreSQL")
            return True

        try:
            print("\n>>> Creating schema in PostgreSQL...")
            Base.metadata.create_all(self.pg_engine)
            print("✓ Schema created")
            return True
        except Exception as e:
            print(f"✗ Schema creation failed: {e}", file=sys.stderr)
            return False

    def get_column_names(self, table_name: str) -> List[str]:
        """Get column names for a table from SQLite."""
        inspector = inspect(self.sqlite_engine)
        columns = inspector.get_columns(table_name)
        return [c["name"] for c in columns]

    def migrate_table(self, table_name: str) -> int:
        """Migrate a single table from SQLite to PostgreSQL."""
        try:
            # Read from SQLite
            with self.sqlite_engine.connect() as src:
                result = src.execute(text(f"SELECT * FROM {table_name}"))
                rows = result.fetchall()
                col_names = self.get_column_names(table_name)

            row_count = len(rows)

            if row_count == 0:
                self.migration_stats[table_name] = {"rows": 0, "status": "skipped"}
                return 0

            # Convert SQLite Row objects to dicts
            data_dicts = []
            for row in rows:
                row_dict = dict(zip(col_names, row))
                data_dicts.append(row_dict)

            # Write to PostgreSQL
            if not self.dry_run:
                with self.pg_engine.begin() as dst:
                    for row_dict in data_dicts:
                        # Build INSERT statement with ON CONFLICT DO NOTHING
                        # to handle potential duplicate key issues
                        col_list = ", ".join(col_names)
                        placeholders = ", ".join([f":{col}" for col in col_names])

                        insert_stmt = text(
                            f"INSERT INTO {table_name} ({col_list}) "
                            f"VALUES ({placeholders}) "
                            f"ON CONFLICT DO NOTHING"
                        )

                        dst.execute(insert_stmt, row_dict)

            self.migration_stats[table_name] = {"rows": row_count, "status": "migrated"}
            return row_count

        except Exception as e:
            self.migration_stats[table_name] = {
                "rows": 0,
                "status": "failed",
                "error": str(e)
            }
            print(f"✗ Error migrating {table_name}: {e}", file=sys.stderr)
            return 0

    def migrate_all(self) -> bool:
        """Migrate all tables in dependency order."""
        print("\n>>> Migrating data from SQLite to PostgreSQL...\n")

        # Get tables actually present in SQLite
        inspector = inspect(self.sqlite_engine)
        sqlite_tables = set(inspector.get_table_names())

        # Filter migration order to only tables that exist
        tables_to_migrate = [t for t in MIGRATION_ORDER if t in sqlite_tables]

        for table_name in tables_to_migrate:
            row_count = self.migrate_table(table_name)
            status_icon = "✓" if row_count >= 0 else "✗"

            if row_count > 0:
                print(f"{status_icon} {table_name:.<40} {row_count:>6} rows")
                self.total_rows_migrated += row_count
            elif self.migration_stats[table_name].get("status") != "failed":
                print(f"  {table_name:.<40} (empty)")

        return True

    def validate_migration(self) -> bool:
        """Validate migration by comparing row counts."""
        if self.dry_run:
            print("\n>>> Validation report: [DRY-RUN] Skipping — no PostgreSQL target\n")
            inspector_src = inspect(self.sqlite_engine)
            for table in sorted(inspector_src.get_table_names()):
                if table.startswith("sqlite_"):
                    continue
                with self.sqlite_engine.connect() as conn:
                    count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                print(f"  {table:.<40} {count:>6} rows (SQLite source)")
            return True

        print("\n>>> Validation report:\n")

        inspector_src = inspect(self.sqlite_engine)
        inspector_dst = inspect(self.pg_engine)

        src_tables = set(inspector_src.get_table_names())
        dst_tables = set(inspector_dst.get_table_names())

        all_match = True
        for table in sorted(src_tables):
            # Skip internal SQLite tables
            if table.startswith("sqlite_"):
                continue

            try:
                with self.sqlite_engine.connect() as conn:
                    src_count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()

                with self.pg_engine.connect() as conn:
                    dst_count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()

                match = "✓" if src_count == dst_count else "✗"
                print(f"{match} {table:.<40} {src_count:>6} → {dst_count:>6}")

                if src_count != dst_count:
                    all_match = False
            except Exception as e:
                print(f"✗ {table:.<40} (validation error: {e})")
                all_match = False

        return all_match

    def print_summary(self):
        """Print migration summary."""
        mode = "[DRY-RUN]" if self.dry_run else ""
        print(f"\n{'='*60}")
        print(f"Migration Summary {mode}")
        print(f"{'='*60}")
        print(f"Source:     {self.sqlite_url}")
        print(f"Target:     {self.postgres_url}")
        print(f"Timestamp:  {datetime.now().isoformat()}")
        print(f"Total rows: {self.total_rows_migrated}")
        print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Migrate NAMA from SQLite to PostgreSQL",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        "--sqlite",
        default=os.getenv("DATABASE_URL", "sqlite:///./nama.db"),
        help="SQLite connection string (default: DATABASE_URL env var or sqlite:///./nama.db)"
    )
    parser.add_argument(
        "--postgres",
        required=True,
        help="PostgreSQL connection string (required, e.g., postgresql://user:pass@localhost:5432/db)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate migration without writing data"
    )

    args = parser.parse_args()

    # Validate URLs
    if not args.sqlite.startswith("sqlite"):
        print("ERROR: --sqlite must be a SQLite connection string", file=sys.stderr)
        sys.exit(1)

    if not args.postgres.startswith("postgresql://"):
        print("ERROR: --postgres must be a PostgreSQL connection string", file=sys.stderr)
        sys.exit(1)

    # Run migration
    migrator = PostgresMigrator(args.sqlite, args.postgres, dry_run=args.dry_run)

    if not migrator.connect():
        sys.exit(1)

    if not migrator.create_schema():
        sys.exit(1)

    if not migrator.migrate_all():
        sys.exit(1)

    if not migrator.validate_migration():
        print("\nWARNING: Validation found discrepancies", file=sys.stderr)

    migrator.print_summary()

    if args.dry_run:
        print("(no data was written in dry-run mode)")


if __name__ == "__main__":
    main()
