# NAMA Backend — Railway production image
# Build context = backend/ (rootDirectory=backend in Railway)
# Trigger rebuild: 2026-04-16
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all backend source code
COPY . .

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

EXPOSE 8080

# Run Alembic migrations then start Gunicorn
# entrypoint.sh: waits for PG, runs alembic upgrade head, then starts gunicorn
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["sh", "-c", "alembic upgrade head && gunicorn app.main:app --config gunicorn.conf.py"]
