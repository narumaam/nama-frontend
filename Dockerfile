# NAMA CLEAN BUILD FINAL v500
FROM python:3.11-slim

WORKDIR /app

# 🚨 HARD RESET (this is the key fix)
RUN rm -rf /app/*

RUN apt-get update && apt-get install -y build-essential

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN ls -la /app
ENV PYTHONPATH=/app/backend

CMD ["python", "main.py"]
