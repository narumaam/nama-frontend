# NAMA Production Deployment Checklist

## Pre-Deployment: PostgreSQL Setup

### 1. Provision PostgreSQL Instance
- [ ] PostgreSQL 14+ installed and running
- [ ] Accessible from application servers (check firewall rules)
- [ ] Regular automated backups configured (daily minimum)
- [ ] WAL archiving enabled for point-in-time recovery
- [ ] Monitoring/alerting in place (disk space, connections, slow queries)

### 2. Run Database Setup Script
```bash
# On the PostgreSQL server (as superuser)
psql -U postgres -d postgres -f deploy/postgres_setup.sql

# Verify
psql -U nama_user -d nama_db -c "SELECT version();"
```

### 3. Apply Performance Configuration
Edit `/etc/postgresql/14/main/postgresql.conf` (or cloud console for managed DB):

**For 4 CPU, 8GB RAM:**
```ini
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 52MB
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
max_connections = 200
min_wal_size = 2GB
max_wal_size = 8GB
checkpoint_completion_target = 0.9
```

Then restart PostgreSQL:
```bash
sudo systemctl restart postgresql
# or: SELECT pg_reload_conf(); (non-destructive)
```

---

## Migration: SQLite → PostgreSQL

### 4. Migrate Data
```bash
cd /path/to/backend

# Dry-run (validation only, no data written)
python scripts/migrate_to_postgres.py \
    --sqlite sqlite:////tmp/nama_perf.db \
    --postgres "postgresql://nama_user:password@localhost:5432/nama_db" \
    --dry-run

# Real migration
python scripts/migrate_to_postgres.py \
    --sqlite sqlite:////tmp/nama_perf.db \
    --postgres "postgresql://nama_user:password@localhost:5432/nama_db"
```

### 5. Verify Migration
- [ ] Row counts match between SQLite and PostgreSQL
- [ ] Spot-check data integrity (SELECT count(*) FROM each table)
- [ ] FK constraints satisfied (no orphaned records)
- [ ] Indexes created successfully

```bash
# Connect to new database and verify
psql -U nama_user -d nama_db

# In psql:
SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public';
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*) FROM users;
```

---

## PgBouncer: Connection Pooling

### 6. Install and Configure PgBouncer
```bash
# Install
sudo apt-get update && sudo apt-get install -y pgbouncer

# Copy config (Ubuntu/Debian)
sudo cp deploy/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
sudo chown pgbouncer:pgbouncer /etc/pgbouncer/pgbouncer.ini
sudo chmod 640 /etc/pgbouncer/pgbouncer.ini
```

### 7. Create PgBouncer User List
```bash
# Generate md5 hash for pgbouncer user
# md5('password' || 'username')

# For username='nama_user', password='CHANGE_ME_IN_PRODUCTION':
# In Python: import hashlib; hashlib.md5(b'CHANGE_ME_IN_PRODUCTIONnama_user').hexdigest()

sudo tee /etc/pgbouncer/userlist.txt > /dev/null <<EOF
"nama_user" "8f7dd3b7b5e6c9a2f1e8d4c3b2a1f0e9"
"pgbouncer" "pgbouncer_password_hash"
EOF

sudo chown pgbouncer:pgbouncer /etc/pgbouncer/userlist.txt
sudo chmod 640 /etc/pgbouncer/userlist.txt
```

### 8. Start PgBouncer
```bash
sudo systemctl start pgbouncer
sudo systemctl enable pgbouncer  # auto-start on reboot

# Verify it's running
sudo systemctl status pgbouncer
ps aux | grep pgbouncer
```

### 9. Test PgBouncer Connection
```bash
# Direct PostgreSQL
psql -h localhost -p 5432 -U nama_user -d nama_db -c "SELECT 1;"

# Via PgBouncer
psql -h 127.0.0.1 -p 6432 -U nama_user -d nama_db -c "SELECT 1;"

# Check stats
psql -h 127.0.0.1 -p 6432 -U pgbouncer -d pgbouncer -c "SHOW stats;"
```

---

## Application: Environment & Configuration

### 10. Set Environment Variables
Create `.env.production` or set in deployment system (systemd, Docker, K8s):

**Critical variables:**
```bash
# Database (via PgBouncer)
DATABASE_URL=postgresql://nama_user:CHANGE_ME_IN_PRODUCTION@127.0.0.1:6432/nama_db
# Or for direct PostgreSQL (without PgBouncer):
# DATABASE_URL=postgresql://nama_user:CHANGE_ME_IN_PRODUCTION@localhost:5432/nama_db

# Cache (Redis optional; falls back to in-process cache)
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=<generate-strong-random-key>  # python -c "import secrets; print(secrets.token_urlsafe(32))"

# Logging
LOG_LEVEL=info
DB_ECHO=false  # Don't log all SQL in production

# Connection pooling (tune based on load)
DB_POOL_SIZE=20           # Base connections per worker
DB_MAX_OVERFLOW=40        # Burst connections
DB_POOL_TIMEOUT=30        # Wait time for free connection
DB_POOL_RECYCLE=1800      # Recycle connections after 30 min

# Gunicorn
WEB_CONCURRENCY=4         # (2 × CPU cores) + 1
GUNICORN_BIND=0.0.0.0:8000
```

### 11. Update Application Code (if needed)
The app already detects PostgreSQL via `DATABASE_URL` prefix:

```python
# app/db/session.py (already handles this)
_is_sqlite = DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    # SQLite config
else:
    # PostgreSQL config with connection pooling
```

No code changes needed if using the provided setup!

---

## Gunicorn: Production Web Server

### 12. Configure Gunicorn
The project includes `gunicorn.conf.py`. Update for production:

**gunicorn.conf.py (summary):**
```python
# Workers (2 × CPU + 1)
workers = 4  # for 4-core machine

# For PostgreSQL production:
raw_env = [
    "DATABASE_URL=postgresql://nama_user:password@127.0.0.1:6432/nama_db",
    "REDIS_URL=redis://localhost:6379/0",
    "SECRET_KEY=<your-key>",
    "LOG_LEVEL=info",
]

# Timeouts
timeout = 60
graceful_timeout = 30
```

### 13. Start Gunicorn
```bash
# Using gunicorn config
gunicorn app.main:app --config gunicorn.conf.py

# Or with systemd (recommended)
sudo tee /etc/systemd/system/nama.service > /dev/null <<'EOF'
[Unit]
Description=NAMA FastAPI Application
After=network.target postgresql.service pgbouncer.service

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/nama/backend
Environment="DATABASE_URL=postgresql://..."
ExecStart=/usr/bin/gunicorn app.main:app --config gunicorn.conf.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start nama
sudo systemctl enable nama
```

### 14. Verify Application Health
```bash
# Health check endpoint
curl http://localhost:8000/api/v1/health

# Should return:
# {"status": "healthy", "database": "connected", "cache": "available"}
```

---

## Load Balancing & Reverse Proxy

### 15. Configure Nginx (or similar)
```nginx
upstream nama_backend {
    least_conn;
    server 127.0.0.1:8000 max_fails=3 fail_timeout=30s;
    # Add more backends if scaling horizontally
}

server {
    listen 80;
    server_name nama.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nama.example.com;

    ssl_certificate /etc/ssl/certs/nama.crt;
    ssl_certificate_key /etc/ssl/private/nama.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req zone=api_limit burst=200 nodelay;

    # Proxy settings
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;

    location / {
        proxy_pass http://nama_backend;
    }

    # Health check (for load balancer)
    location /api/v1/health {
        proxy_pass http://nama_backend;
        access_log off;
    }
}
```

Reload nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Monitoring & Observability

### 16. Set Up Monitoring

**PostgreSQL health:**
```sql
-- Slow queries (enable slow_query_log)
SELECT query, calls, mean_exec_time FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;

-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Disk usage
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**PgBouncer stats:**
```bash
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW STATS;"
```

**Application metrics:**
- [ ] Gunicorn worker status (restart rate, queue length)
- [ ] Request latency (response time, p50/p95/p99)
- [ ] Error rate (5xx responses)
- [ ] API endpoint performance

### 17. Logging Setup

**Application logs (FastAPI):**
```bash
# To file
gunicorn app.main:app --config gunicorn.conf.py --access-logfile /var/log/nama/access.log --error-logfile /var/log/nama/error.log

# Rotate logs (logrotate)
sudo tee /etc/logrotate.d/nama > /dev/null <<'EOF'
/var/log/nama/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
EOF
```

**Database logs (PostgreSQL):**
In `postgresql.conf`:
```ini
log_statement = 'mod'     # Log DDL + SELECT (filter as needed)
log_duration = on
log_min_duration_statement = 1000  # Log queries taking >1s
log_directory = 'pg_log'
```

---

## Backup & Disaster Recovery

### 18. Database Backups
```bash
# Automated daily backup (cron)
0 2 * * * /usr/bin/pg_dump -U nama_user -d nama_db -Fc > /backups/nama_$(date +\%Y\%m\%d).dump

# Weekly full backup to S3
0 3 * * 0 /usr/bin/pg_dump -U nama_user -d nama_db -Fc | gzip | aws s3 cp - s3://nama-backups/full_$(date +\%Y\%m\%d).dump.gz

# Restore from backup
pg_restore -U nama_user -d nama_db /backups/nama_20260414.dump
```

### 19. Point-in-Time Recovery (PITR)
Ensure WAL archiving is enabled:
```ini
# In postgresql.conf
archive_mode = on
archive_command = 'cp %p /wal_archives/%f'
wal_level = replica
max_wal_senders = 10
```

---

## Security Checklist

### 20. Access Control
- [ ] PostgreSQL firewall rules (restrict to application servers only)
- [ ] PgBouncer running on localhost only (or behind firewall)
- [ ] Strong passwords for nama_user (rotate regularly)
- [ ] Disable superuser access from app
- [ ] Enable SSL for PostgreSQL connections (if remote)

### 21. Data Protection
- [ ] Encryption at rest (disk level or PostgreSQL native)
- [ ] Encryption in transit (HTTPS + TLS for PostgreSQL)
- [ ] Secrets management (use systemd secrets, Docker secrets, K8s, or Vault)
- [ ] SQL injection prevention (use parameterized queries - already done by SQLAlchemy)
- [ ] Rate limiting on public APIs (see Nginx config above)

### 22. Compliance
- [ ] GDPR data retention policies (if EU users)
- [ ] Audit logging for sensitive operations
- [ ] User consent tracking for cookies/analytics
- [ ] Privacy policy published

---

## Health Checks & Diagnostics

### 23. Verification Commands
```bash
# Database connectivity
python -c "from app.db.session import engine; engine.connect()"

# Health endpoint
curl -s http://localhost:8000/api/v1/health | jq .

# PgBouncer pool status
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;" | grep nama_db

# Check table row counts
psql -U nama_user -d nama_db -c "SELECT tablename, to_char(count, '9,999,999') AS rows FROM (
    SELECT schemaname, tablename, n_live_tup as count FROM pg_stat_user_tables
) t ORDER BY count DESC;"

# Slow queries (if enabled)
psql -U nama_user -d nama_db -c "SELECT mean_exec_time::int, calls, query FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;"
```

---

## Post-Deployment Validation

### 24. Final Checks
- [ ] All tables created and indexed
- [ ] Data migrated and verified (row counts match)
- [ ] Application starts without errors
- [ ] Health endpoint returns OK
- [ ] Database queries execute normally
- [ ] PgBouncer connections pooling correctly
- [ ] Load test passes (verify throughput and latency)
- [ ] Backups running and verified restorable
- [ ] Monitoring alerts firing and routed correctly

---

## Performance Tuning (Iterative)

### 25. Monitor and Adjust
After 1-2 weeks in production:

1. **Review slow queries:**
   ```sql
   SELECT query, mean_exec_time, calls FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC LIMIT 20;
   ```
   Add indexes if needed.

2. **Check connection pool utilization:**
   ```bash
   psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW CLIENTS;" | wc -l
   ```
   Adjust `default_pool_size` if consistently at 80%+ of max.

3. **Monitor cache hit rate:**
   ```sql
   SELECT sum(heap_blks_read) as heap_read, sum(heap_blks_hit) as heap_hit,
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
   FROM pg_statio_user_tables;
   ```
   Target: 99%+. If lower, increase `shared_buffers`.

4. **Review error rates:**
   - Application error log
   - Database error log
   - Slowlog threshold tuning

---

## Rollback Plan

If production PostgreSQL deployment fails:

1. Revert `DATABASE_URL` to SQLite (already in gunicorn.conf.py as default)
2. Restart Gunicorn: `sudo systemctl restart nama`
3. Investigate PostgreSQL issue while running on SQLite
4. Retry migration after fixing the problem

---

## Support & Escalation

- **Database**: PostgreSQL docs, PgBouncer docs
- **Monitoring**: DataDog, New Relic, Prometheus + Grafana
- **Incident response**: On-call rotation, automated alerting

---

**Last Updated**: 2026-04-14
**Version**: 1.0 (Production Ready)
