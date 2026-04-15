# NAMA Production Deployment Tools

This directory contains all configuration and tooling needed to deploy NAMA to production with PostgreSQL + PgBouncer.

## Directory Structure

```
deploy/
├── README.md                    # This file
├── production_checklist.md      # Step-by-step deployment guide (READ FIRST)
├── postgres_setup.sql           # Database initialization script
└── pgbouncer.ini               # PgBouncer connection pooling config
```

## Quick Start (3 Minutes)

### 1. Prerequisites
- PostgreSQL 14+ running and accessible
- PgBouncer to be installed
- Application running with gunicorn

### 2. Setup PostgreSQL
```bash
# Run as superuser on PostgreSQL server
psql -U postgres -f deploy/postgres_setup.sql

# Verify
psql -U nama_user -d nama_db -c "SELECT version();"
```

### 3. Migrate Data
```bash
# From the backend directory
pip install psycopg2-binary

# Dry-run (validation only)
python scripts/migrate_to_postgres.py \
    --sqlite sqlite:////tmp/nama_perf.db \
    --postgres "postgresql://nama_user:password@localhost:5432/nama_db" \
    --dry-run

# Real migration
python scripts/migrate_to_postgres.py \
    --sqlite sqlite:////tmp/nama_perf.db \
    --postgres "postgresql://nama_user:password@localhost:5432/nama_db"
```

### 4. Setup PgBouncer
```bash
# Install
sudo apt-get install -y pgbouncer

# Configure
sudo cp deploy/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini

# Create auth file (change password hash!)
sudo tee /etc/pgbouncer/userlist.txt > /dev/null <<'EOF'
"nama_user" "YOUR_MD5_HASH_HERE"
EOF
sudo chown pgbouncer:pgbouncer /etc/pgbouncer/userlist.txt
sudo chmod 640 /etc/pgbouncer/userlist.txt

# Start
sudo systemctl start pgbouncer
sudo systemctl enable pgbouncer
```

### 5. Start Application
```bash
# Set environment variable
export DATABASE_URL="postgresql://nama_user:password@127.0.0.1:6432/nama_db"

# Start gunicorn
gunicorn app.main:app --config gunicorn.conf.py

# Or with systemd (see production_checklist.md for service file)
```

## Files Reference

### postgres_setup.sql
**Purpose**: Initialize PostgreSQL database for NAMA

**What it does**:
- Creates `nama_user` role with password
- Creates `nama_db` database
- Grants necessary privileges
- Includes commented performance tuning hints

**When to use**:
- First-time PostgreSQL setup
- On each new PostgreSQL instance

**How to use**:
```bash
psql -U postgres -d postgres -f deploy/postgres_setup.sql
```

### pgbouncer.ini
**Purpose**: Configure PgBouncer for transaction-level connection pooling

**Key settings**:
- `listen_port = 6432` — Application connects here
- `pool_mode = transaction` — Reuse connections per transaction
- `default_pool_size = 25` — Connections to keep ready
- `max_client_conn = 10000` — Max concurrent app connections

**When to tune**:
- High connection count errors → increase `default_pool_size`
- Memory usage high → decrease `default_pool_size`
- Connection timeout → check `server_check_query` health

**How to use**:
```bash
# Install PgBouncer
sudo apt-get install pgbouncer

# Copy config (adjust passwords first!)
sudo cp pgbouncer.ini /etc/pgbouncer/pgbouncer.ini

# Create userlist.txt (see Quick Start section)
# Start service
sudo systemctl restart pgbouncer
```

### production_checklist.md
**Purpose**: Complete 25-point production deployment checklist

**Sections**:
1. PostgreSQL setup and tuning
2. Data migration validation
3. PgBouncer installation and testing
4. Environment variables and app configuration
5. Gunicorn configuration
6. Load balancing setup (Nginx example)
7. Monitoring and observability
8. Backup and disaster recovery
9. Security hardening
10. Post-deployment validation

**When to use**:
- Before any production deployment
- As reference during troubleshooting
- To validate production environment

**How to use**:
1. Read the entire checklist once
2. Follow step-by-step during deployment
3. Check off items as completed
4. Re-reference during production operation

---

## Database Migration: SQLite → PostgreSQL

### About the Migration Script
Located at: `backend/scripts/migrate_to_postgres.py`

**Features**:
- Reads from SQLite, writes to PostgreSQL
- Handles all NAMA models in dependency order
- Idempotent (safe to re-run)
- Dry-run mode for validation
- Progress reporting
- Validation of migrated data

**Dependency order** (built into script):
1. tenants (root)
2. users
3. media_assets, destinations, content_blocks, portals
4. vendors, vendor_rates
5. leads, lead_tags
6. itineraries
7. bookings, booking_items
8. payments, webhook_events, ledger_entries
9. corporate_pos, fixed_departures
10. ai_usage, tenant_ai_budgets

**Safety features**:
- `ON CONFLICT DO NOTHING` prevents duplicate key errors
- Dry-run mode (-­­--dry-run) validates without writing
- Row count validation after migration
- Detailed error reporting

### Usage Examples

**Dry-run (recommended first step)**:
```bash
python scripts/migrate_to_postgres.py \
    --sqlite sqlite:////tmp/nama_perf.db \
    --postgres "postgresql://nama_user:password@localhost:5432/nama_db" \
    --dry-run
```

**Full migration**:
```bash
python scripts/migrate_to_postgres.py \
    --sqlite sqlite:////tmp/nama_perf.db \
    --postgres "postgresql://nama_user:password@localhost:5432/nama_db"
```

**Via PgBouncer (production)**:
```bash
python scripts/migrate_to_postgres.py \
    --sqlite sqlite:////tmp/nama_perf.db \
    --postgres "postgresql://nama_user:password@127.0.0.1:6432/nama_db"
```

**Using environment variable**:
```bash
export DATABASE_URL="sqlite:////tmp/nama_perf.db"
python scripts/migrate_to_postgres.py \
    --postgres "postgresql://nama_user:password@localhost:5432/nama_db"
```

---

## Environment Variables

### Required for Production
```bash
DATABASE_URL=postgresql://nama_user:password@127.0.0.1:6432/nama_db
SECRET_KEY=<generate-with-secrets.token_urlsafe(32)>
REDIS_URL=redis://localhost:6379/0  # Optional, falls back to in-process cache
```

### Optional (with defaults)
```bash
LOG_LEVEL=info                    # Default: info
DB_ECHO=false                     # Default: false (set true for debugging)
DB_POOL_SIZE=20                   # Default: 20 (base connections per worker)
DB_MAX_OVERFLOW=40                # Default: 40 (burst above pool_size)
DB_POOL_TIMEOUT=30                # Default: 30 (seconds to wait for free conn)
DB_POOL_RECYCLE=1800              # Default: 1800 (recycle after 30 min)
WEB_CONCURRENCY=4                 # Default: (2 × CPU) + 1
GUNICORN_BIND=0.0.0.0:8000        # Default: 0.0.0.0:8000
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 Application Layer                        │
│  Gunicorn (4 workers × UvicornWorker)                   │
│  FastAPI + SQLAlchemy ORM                               │
│  Connection pool: 20 base + 40 overflow = 60 per worker │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│            Connection Pooling Layer                      │
│  PgBouncer (port 6432)                                  │
│  Transaction-mode pooling                               │
│  Multiplexes 240 app connections → 25 DB connections    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│             PostgreSQL Database Layer                    │
│  PostgreSQL 14+ (port 5432)                             │
│  25 active connections + 5 reserved                      │
│  Tuned for 4-core, 8GB RAM                              │
└─────────────────────────────────────────────────────────┘
```

**Connection flow:**
1. Application requests connection from SQLAlchemy pool (20 base)
2. If unavailable, uses overflow pool (up to 40 more)
3. Connection sent to PgBouncer (port 6432)
4. PgBouncer reuses real PostgreSQL connection to backend (port 5432)
5. After transaction, connection returned to PgBouncer pool
6. PgBouncer keeps connection open for reuse (not back to app pool)

**Why this architecture?**:
- **App pool (60 connections)**: Fast connection requests within process
- **PgBouncer (25 connections)**: Handles burst, protects database from connection limit
- **Database (100 max)**: Supports multiple app instances and monitoring/backups

---

## Monitoring Queries

### Database Health
```sql
-- Connection count
SELECT count(*) as total_connections FROM pg_stat_activity;
SELECT datname, count(*) as connections FROM pg_stat_activity GROUP BY datname;

-- Slow queries
SELECT query, mean_exec_time, calls FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Cache hit ratio (should be 99%+)
SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

### PgBouncer Health
```bash
# Check pool status
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"

# Check client connections
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW CLIENTS;"

# View statistics
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW STATS;"

# Check configuration
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW CONFIG;"
```

### Application Health
```bash
# Health endpoint
curl http://localhost:8000/api/v1/health

# Check if database is reachable
python -c "from app.db.session import engine; print('OK' if engine.connect() else 'FAILED')"
```

---

## Troubleshooting

### "Connection refused" to PgBouncer
```bash
# Check if PgBouncer is running
ps aux | grep pgbouncer
sudo systemctl status pgbouncer

# Test direct PostgreSQL connection
psql -U nama_user -d nama_db -h localhost -p 5432

# Check if PgBouncer is listening
sudo netstat -tlnp | grep 6432
```

### "FATAL: no pg_hba.conf entry for host"
Edit `/etc/postgresql/14/main/pg_hba.conf`:
```
# Allow local connections (PgBouncer on same machine)
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

Then reload:
```bash
sudo pg_ctl reload -D /var/lib/postgresql/14/main
```

### Pool exhaustion (too many connections)
1. Check current usage:
   ```bash
   psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
   ```

2. Increase PgBouncer pool size in `/etc/pgbouncer/pgbouncer.ini`:
   ```ini
   default_pool_size = 30  # was 25
   max_client_conn = 15000 # was 10000
   ```

3. Restart PgBouncer:
   ```bash
   sudo systemctl restart pgbouncer
   ```

### Slow queries after migration
1. Gather statistics:
   ```sql
   ANALYZE;
   ```

2. Check missing indexes:
   ```sql
   SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan ASC;
   ```

3. Add indexes for frequently filtered columns:
   ```sql
   CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status);
   ```

---

## Security Checklist

- [ ] Change default password in `postgres_setup.sql` before running
- [ ] Change PgBouncer password hash in `userlist.txt`
- [ ] Set `SECRET_KEY` to a random value (`python -c "import secrets; print(secrets.token_urlsafe(32))"`)
- [ ] Restrict PostgreSQL network access (firewall)
- [ ] Restrict PgBouncer to localhost only (unless behind VPN)
- [ ] Enable SSL for remote PostgreSQL connections
- [ ] Rotate database passwords regularly
- [ ] Enable PostgreSQL audit logging for sensitive operations
- [ ] Set up automated backups and test restore process

---

## Support Resources

- **PostgreSQL**: https://www.postgresql.org/docs/14/
- **PgBouncer**: https://www.pgbouncer.org/usage.html
- **Gunicorn**: https://docs.gunicorn.org/
- **SQLAlchemy**: https://docs.sqlalchemy.org/

---

**Last Updated**: 2026-04-14
**Version**: 1.0 (Production Ready)
