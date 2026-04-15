#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────────────────────
# NAMA Backend Entrypoint
#
# Responsibilities:
#   1. Wait for PostgreSQL to be ready
#   2. Run database migrations via Alembic
#   3. Start Gunicorn with Uvicorn workers
# ─────────────────────────────────────────────────────────────────────────────

echo "🚀 Starting NAMA Backend..."

# ─────────────────────────────────────────────────────────────────────────────
# 1. Wait for PostgreSQL to be ready
# ─────────────────────────────────────────────────────────────────────────────

echo "⏳ Waiting for PostgreSQL to be ready..."

# Parse DATABASE_URL to extract host and port
# Format: postgresql://user:password@host:port/dbname
if [[ "$DATABASE_URL" == *"@"* ]]; then
    # Extract host:port from DATABASE_URL
    HOST_PORT=$(echo "$DATABASE_URL" | sed 's|.*@\([^/]*\)/.*|\1|')
    DB_HOST=$(echo "$HOST_PORT" | cut -d: -f1)
    DB_PORT=${DB_HOST##*:}
    DB_HOST=${DB_HOST%:*}

    # If no port specified, default to 5432
    if [ "$DB_HOST" == "$DB_PORT" ]; then
        DB_PORT=5432
    fi
else
    # Fallback to localhost:5432
    DB_HOST="localhost"
    DB_PORT="5432"
fi

# Wait for PostgreSQL with timeout
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "${POSTGRES_USER:-nama_user}" 2>/dev/null; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo "   Attempt $ATTEMPT/$MAX_ATTEMPTS - PostgreSQL not ready, waiting 2 seconds..."
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ ERROR: PostgreSQL did not become ready in time"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. Run Alembic migrations
# ─────────────────────────────────────────────────────────────────────────────

echo "🗂️  Running database migrations..."

cd /app/backend

# Run alembic upgrade to latest migration
if alembic upgrade head; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ ERROR: Database migrations failed"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. Start Gunicorn with Uvicorn workers
# ─────────────────────────────────────────────────────────────────────────────

cd /app

echo "🚀 Starting Gunicorn with Uvicorn workers..."
echo "   Binding to: ${GUNICORN_BIND:-0.0.0.0:8000}"
echo "   Workers: ${WEB_CONCURRENCY:-4}"
echo "   Log level: ${LOG_LEVEL:-info}"

# Start gunicorn with the gunicorn.conf.py configuration
exec gunicorn \
    --config /app/backend/gunicorn.conf.py \
    app.main:app
