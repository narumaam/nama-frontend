"""
Structured JSON Logging for NAMA Platform
==========================================
Configures Python logging to output JSON lines for log aggregation
(Datadog, CloudWatch, ELK stack, etc.)

Format:
  {"timestamp": "...", "level": "INFO", "logger": "app.api", "message": "...",
   "request_id": "...", "tenant_id": 1, "duration_ms": 45.2}
"""

import logging
import sys
import json
import time
from typing import Optional


class JSONFormatter(logging.Formatter):
    """Format log records as single-line JSON."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S.%fZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include extra fields set by the caller
        for key in ("request_id", "tenant_id", "user_id", "duration_ms", "endpoint", "status_code"):
            if hasattr(record, key):
                log_entry[key] = getattr(record, key)

        # Include exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def configure_logging(level: str = "INFO", json_output: bool = True):
    """
    Configure root logger for the NAMA platform.

    Args:
        level: Log level (DEBUG/INFO/WARNING/ERROR)
        json_output: If True, use JSON formatter; if False, use human-readable format
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    if json_output:
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        ))

    root_logger.addHandler(handler)

    # Silence noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    logging.getLogger("app").setLevel(getattr(logging, level.upper(), logging.INFO))
    logging.info("NAMA logging configured: level=%s json=%s", level, json_output)
