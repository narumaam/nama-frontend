# NAMA Backend — Railway production image
# Dockerfile path: /backend/Dockerfile  |  Build context: backend/
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

EXPOSE 8080

CMD ["sh", "-c", "alembic upgrade heads && gunicorn app.main:app --config gunicorn.conf.py"]
