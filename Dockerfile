FROM python:3.11-slim

WORKDIR /app

# Install system deps (important for pydantic, numpy issues)
RUN apt-get update && apt-get install -y build-essential

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# IMPORTANT: set correct PYTHONPATH
ENV PYTHONPATH=/app/backend

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
