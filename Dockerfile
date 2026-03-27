# force rebuild v4
FROM python:3.11-slim

WORKDIR /app

# Install system deps (important for pydantic, numpy issues)
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure backend is discoverable
ENV PYTHONPATH=/app/backend

# Railway uses PORT env variable
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
