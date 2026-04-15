#!/bin/bash
# Automated PostgreSQL deployment script for NAMA
# Performs migration, validation, and health checks
#
# Usage:
#   ./scripts/deploy_to_postgres.sh \
#       --pg-url postgresql://nama_user:password@localhost:5432/nama_db \
#       --pgbouncer-url postgresql://nama_user:password@127.0.0.1:6432/nama_db \
#       [--no-backup] [--skip-validation]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PG_URL=""
PGBOUNCER_URL=""
SKIP_VALIDATION=false
SKIP_BACKUP=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# ── Helper functions ──────────────────────────────────────────────────────────
print_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  NAMA PostgreSQL Deployment Script                        ║"
    echo "║  Production-ready migration with validation               ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "\n${BLUE}>>> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}" >&2
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
    --pg-url URL              PostgreSQL connection URL (required)
                              E.g., postgresql://user:pass@localhost:5432/nama_db

    --pgbouncer-url URL       PgBouncer connection URL (optional, for testing)
                              E.g., postgresql://user:pass@127.0.0.1:6432/nama_db

    --skip-validation         Skip row count validation after migration
    --skip-backup            Skip backup prompt (not recommended!)
    --help                    Show this message

EXAMPLE:
    ./scripts/deploy_to_postgres.sh \\
        --pg-url postgresql://nama_user:password@localhost:5432/nama_db \\
        --pgbouncer-url postgresql://nama_user:password@127.0.0.1:6432/nama_db

EOF
}

# ── Argument parsing ──────────────────────────────────────────────────────────
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --pg-url)
                PG_URL="$2"
                shift 2
                ;;
            --pgbouncer-url)
                PGBOUNCER_URL="$2"
                shift 2
                ;;
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# ── Validation ────────────────────────────────────────────────────────────────
validate_requirements() {
    print_step "Checking requirements..."

    local missing=0

    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 not found"
        missing=1
    else
        print_success "Python 3 found: $(python3 --version)"
    fi

    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        print_warning "psql (PostgreSQL client) not found - skipping direct DB checks"
    else
        print_success "psql found"
    fi

    # Check Python dependencies
    if ! python3 -c "import sqlalchemy" 2>/dev/null; then
        print_warning "SQLAlchemy not installed - installing..."
        pip install -q -r "$BACKEND_DIR/deploy/requirements-migration.txt"
    else
        print_success "SQLAlchemy installed"
    fi

    # Check database URL format
    if [[ ! "$PG_URL" =~ ^postgresql:// ]]; then
        print_error "Invalid PostgreSQL URL format"
        show_usage
        exit 1
    fi

    print_success "All requirements satisfied"
}

# ── Pre-flight checks ─────────────────────────────────────────────────────────
preflight_checks() {
    print_step "Running pre-flight checks..."

    # Test PostgreSQL connection
    if ! python3 << 'EOF'
import sys
try:
    from sqlalchemy import create_engine, text
    engine = create_engine("${PG_URL}")
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("✓ PostgreSQL connection successful")
except Exception as e:
    print(f"✗ PostgreSQL connection failed: {e}", file=sys.stderr)
    sys.exit(1)
EOF
    then
        print_error "Cannot connect to PostgreSQL"
        exit 1
    fi

    # Test SQLite source database
    if ! python3 << 'EOF'
import sys, os
db_url = os.getenv("DATABASE_URL", "sqlite:///./nama.db")
if not db_url.startswith("sqlite"):
    print(f"Using alternate DATABASE_URL: {db_url[:50]}...")
else:
    print(f"SQLite database: {db_url}")
EOF
    then
        print_error "Invalid SOURCE DATABASE_URL"
        exit 1
    fi

    print_success "Pre-flight checks complete"
}

# ── Backup prompt ─────────────────────────────────────────────────────────────
backup_warning() {
    if [ "$SKIP_BACKUP" = true ]; then
        print_warning "Skipping backup (use --skip-backup)"
        return 0
    fi

    print_warning "BACKUP REMINDER"
    echo "It is STRONGLY RECOMMENDED to backup PostgreSQL before migration:"
    echo "  pg_dump -U nama_user -d nama_db -Fc > /backups/nama_before_migration.dump"
    echo ""
    read -p "Have you backed up PostgreSQL? (yes/no) " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Aborting migration without backup confirmation"
        exit 1
    fi
}

# ── Dry-run ───────────────────────────────────────────────────────────────────
dry_run() {
    print_step "Running migration DRY-RUN (validation only)..."

    cd "$BACKEND_DIR"
    if python3 scripts/migrate_to_postgres.py \
        --postgres "$PG_URL" \
        --dry-run
    then
        print_success "Dry-run completed successfully"
    else
        print_error "Dry-run failed - check errors above"
        exit 1
    fi
}

# ── Migration ─────────────────────────────────────────────────────────────────
migrate() {
    print_step "Starting data migration (this may take a few minutes)..."

    cd "$BACKEND_DIR"
    if python3 scripts/migrate_to_postgres.py \
        --postgres "$PG_URL"
    then
        print_success "Migration completed successfully"
    else
        print_error "Migration failed - check errors above"
        exit 1
    fi
}

# ── Validation ────────────────────────────────────────────────────────────────
validate_migration() {
    if [ "$SKIP_VALIDATION" = true ]; then
        print_warning "Skipping validation (use --skip-validation)"
        return 0
    fi

    print_step "Validating migrated data..."

    # Extract database name from URL
    DB_NAME=$(echo "$PG_URL" | sed 's|.*\/\([^?]*\).*|\1|')

    if command -v psql &> /dev/null; then
        # Extract connection info from URL
        # Format: postgresql://user:password@host:port/dbname
        PG_USER=$(echo "$PG_URL" | sed 's|.*://\([^:]*\).*|\1|')
        PG_HOST=$(echo "$PG_URL" | sed 's|.*@\([^:]*\).*|\1|')
        PG_PORT=$(echo "$PG_URL" | sed 's|.*:\([0-9]*\)/.*|\1|' | grep -oE '[0-9]+$' || echo "5432")

        echo "Checking table row counts..."
        psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB_NAME" << 'SQL'
SELECT tablename, to_char(count, '999,999,999') as rows
FROM (
    SELECT schemaname, tablename, n_live_tup as count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY count DESC
) t
LIMIT 20;
SQL

        print_success "Validation complete"
    else
        print_warning "psql not available - skipping detailed validation"
        print_warning "Manually verify with: psql -U nama_user -d nama_db -c 'SELECT COUNT(*) FROM leads;'"
    fi
}

# ── Test PgBouncer connection ─────────────────────────────────────────────────
test_pgbouncer() {
    if [ -z "$PGBOUNCER_URL" ]; then
        print_warning "PgBouncer URL not provided (use --pgbouncer-url to test)"
        return 0
    fi

    print_step "Testing PgBouncer connection..."

    if python3 << EOF
import sys
try:
    from sqlalchemy import create_engine, text
    engine = create_engine("$PGBOUNCER_URL")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
    print("✓ PgBouncer connection successful")
except Exception as e:
    print(f"✗ PgBouncer connection failed: {e}", file=sys.stderr)
    sys.exit(1)
EOF
    then
        print_success "PgBouncer is responding correctly"
    else
        print_error "PgBouncer connection test failed"
        exit 1
    fi
}

# ── Summary ───────────────────────────────────────────────────────────────────
print_summary() {
    print_step "Deployment Summary"
    echo ""
    echo "✓ Migration completed successfully"
    echo ""
    echo "Next steps:"
    echo "  1. Verify application can connect (check logs)"
    echo "  2. Run smoke tests on critical endpoints"
    echo "  3. Monitor database performance (check slow queries)"
    echo "  4. Update application DATABASE_URL to production PostgreSQL"
    echo "  5. Consider enabling PgBouncer for production load"
    echo ""
    echo "Useful commands:"
    echo "  # Check table sizes:"
    echo "  psql -U nama_user -d nama_db -c \"SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size DESC;\""
    echo ""
    echo "  # Monitor connections:"
    echo "  psql -U nama_user -d nama_db -c \"SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;\""
    echo ""
    echo "For more details, see deploy/production_checklist.md"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
    print_banner
    parse_args "$@"

    if [ -z "$PG_URL" ]; then
        print_error "PostgreSQL URL is required"
        show_usage
        exit 1
    fi

    validate_requirements
    preflight_checks
    backup_warning
    dry_run
    read -p "Proceed with actual migration? (yes/no) " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Migration cancelled"
        exit 0
    fi
    migrate
    validate_migration
    test_pgbouncer
    print_summary
    echo -e "\n${GREEN}✓ Deployment complete!${NC}\n"
}

# ── Run ───────────────────────────────────────────────────────────────────────
main "$@"
