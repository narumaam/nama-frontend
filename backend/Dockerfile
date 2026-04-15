# Multi-stage Dockerfile for NAMA FastAPI Backend
# Optimized for production deployment with gunicorn + uvicorn workers

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 1: BUILDER
# Install all dependencies and cache them
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.10-slim as builder

WORKDIR /build

# Install system dependencies required for Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies into a virtual environment
COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 2: RUNTIME
# Minimal final image with only runtime dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.10-slim

WORKDIR /app

# Install only runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY backend/ ./backend/
COPY main.py .
COPY requirements.txt .

# Set environment variables
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Copy entrypoint script
COPY backend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 8000

# Health check: verify the API is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api/v1/health', timeout=5)" || exit 1

# Run via entrypoint (handles alembic migrations + gunicorn startup)
ENTRYPOINT ["/app/entrypoint.sh"]
