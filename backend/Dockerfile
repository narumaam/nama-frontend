# NAMA Backend — Railway production image
# Build context = repo root (Railway uses repo root, Dockerfile at /backend/Dockerfile)
# Trigger rebuild: 2026-04-18
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
# Note: build context is repo root, backend/ files are at backend/ prefix
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ .

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

EXPOSE 8080

# Run Alembic migrations then start Gunicorn
CMD ["sh", "-c", "alembic upgrade head && gunicorn app.main:app --config gunicorn.conf.py"]
