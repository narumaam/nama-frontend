-- PostgreSQL Setup for NAMA Production
-- =====================================
--
-- Run this script as the PostgreSQL superuser (postgres) to:
--   1. Create the nama_user role with password
--   2. Create the nama_db database owned by nama_user
--   3. Grant necessary privileges
--
-- Usage (after creating PostgreSQL instance):
--   psql -U postgres -d postgres -f deploy/postgres_setup.sql
--
-- For managed PostgreSQL (AWS RDS, Azure Database, Google Cloud SQL):
--   - Skip CREATE USER; your cloud provider handles authentication
--   - Just run: CREATE DATABASE nama_db OWNER <managed_user>;
--   - And: GRANT ALL PRIVILEGES ON DATABASE nama_db TO <managed_user>;

-- ── 1. Create role (user) ────────────────────────────────────────────────────
-- Change 'CHANGE_ME_IN_PRODUCTION' to a strong password!
CREATE USER nama_user WITH
    PASSWORD 'CHANGE_ME_IN_PRODUCTION'
    VALID UNTIL 'infinity'
    CREATEDB
    NOCREATEUSER
    NOREPLICATION
    IN ROLE postgres;

-- ── 2. Create database ───────────────────────────────────────────────────────
CREATE DATABASE nama_db
    OWNER nama_user
    ENCODING 'UTF8'
    TEMPLATE template0
    LC_COLLATE 'C'
    LC_CTYPE 'C';

-- ── 3. Grant privileges ──────────────────────────────────────────────────────
GRANT CONNECT ON DATABASE nama_db TO nama_user;
GRANT ALL PRIVILEGES ON DATABASE nama_db TO nama_user;

-- ── 4. Set connection defaults ───────────────────────────────────────────────
-- (Run these on the target database)
\c nama_db;

GRANT USAGE ON SCHEMA public TO nama_user;
GRANT CREATE ON SCHEMA public TO nama_user;

-- Grant default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nama_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO nama_user;

-- ── 5. Performance settings ──────────────────────────────────────────────────
--
-- These settings should be added to postgresql.conf on the server.
-- For managed services, use the performance settings UI in the cloud console.
--
-- Recommended values (for 4 CPU, 8GB RAM):
--
--   # Memory
--   shared_buffers = 2GB                  # 25% of total RAM for database cache
--   effective_cache_size = 6GB            # 75% of total RAM (estimate)
--   maintenance_work_mem = 512MB          # for VACUUM, CREATE INDEX
--   work_mem = 52MB                       # per sort/hash operation (RAM / max_connections / 4)
--
--   # WAL & Checkpoints (optimize write performance)
--   wal_buffers = 16MB                    # checkpoint buffer
--   default_statistics_target = 100       # stats for query planner
--   min_wal_size = 2GB                    # don't shrink WAL below this
--   max_wal_size = 8GB                    # don't grow WAL above this
--   checkpoint_completion_target = 0.9    # spread checkpoints (reduce I/O spikes)
--
--   # Query Performance
--   random_page_cost = 1.1                # SSD cost (vs 4.0 for HDD)
--   effective_io_concurrency = 200        # parallel I/O threads (SSD)
--   max_wal_senders = 10                  # for replication/streaming
--
--   # Connections (adjust for PgBouncer)
--   max_connections = 200                 # total connections (higher than app layer)
--   superuser_reserved_connections = 10
--
-- After modifying postgresql.conf:
--   sudo systemctl restart postgresql
--
-- Verify settings:
--   SELECT name, setting FROM pg_settings WHERE name IN (
--     'shared_buffers', 'effective_cache_size', 'work_mem', 'wal_buffers'
--   );

-- ── 6. Create essential extensions (if using NAMA extensions) ─────────────────
-- Uncomment as needed:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 7. Verify setup ──────────────────────────────────────────────────────────
-- Run these to verify:
--   \du                              # list roles
--   \l                               # list databases
--   SELECT * FROM pg_stat_database;  # database stats

RESET client_min_messages;
SELECT 'PostgreSQL setup complete: database nama_db created, user nama_user configured.';
