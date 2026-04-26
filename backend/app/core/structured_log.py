"""
Tier 10D — structured JSON request logging.

Emits one JSON line per HTTP request to stdout. Fields:
  ts, level, msg, request_id, method, path, status, latency_ms,
  tenant_id, user_id, ip, ua

Request_id is a uuid4 generated per request and surfaced via the
X-Request-Id response header so logs can be correlated across services
(Vercel front-of-stack → Railway backend → Neon slow-query log).

Safe to import / install eagerly: no side effects on first import,
plain stdlib only (no structlog dep).
"""
from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar
from typing import Any, Dict, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# request-scoped context (used by other modules that want to add
# request_id / tenant_id to log lines without threading them through args)
_request_id_var: ContextVar[Optional[str]] = ContextVar("nama_request_id", default=None)
_tenant_id_var: ContextVar[Optional[int]] = ContextVar("nama_tenant_id", default=None)
_user_id_var:   ContextVar[Optional[int]] = ContextVar("nama_user_id",   default=None)


def get_request_id() -> Optional[str]:
    return _request_id_var.get()


def get_tenant_id() -> Optional[int]:
    return _tenant_id_var.get()


def get_user_id() -> Optional[int]:
    return _user_id_var.get()


class _JsonFormatter(logging.Formatter):
    """Render LogRecord as a single-line JSON document."""

    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)) +
                  f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        rid = _request_id_var.get()
        tid = _tenant_id_var.get()
        uid = _user_id_var.get()
        if rid:
            payload["request_id"] = rid
        if tid is not None:
            payload["tenant_id"] = tid
        if uid is not None:
            payload["user_id"] = uid
        # Allow callers to pass extra={"http_status": 200, ...} on log calls.
        for k, v in record.__dict__.items():
            if k.startswith("_") or k in {
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "getMessage",
                "message",
            }:
                continue
            try:
                json.dumps(v)
                payload[k] = v
            except Exception:
                payload[k] = str(v)
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_json_logging(level: str = "INFO") -> None:
    """
    Replace the root handler with a single JSON-formatted stdout handler.
    Idempotent — safe to call repeatedly. Pass NAMA_JSON_LOGS=false in env
    to skip (useful for local debug where line-style is easier to read).
    """
    import os
    if os.getenv("NAMA_JSON_LOGS", "true").lower() in ("0", "false", "no"):
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter())

    root = logging.getLogger()
    # Drop any prior handlers Uvicorn / Gunicorn installed so we don't dual-log.
    for h in list(root.handlers):
        root.removeHandler(h)
    root.addHandler(handler)
    root.setLevel(level)

    # Keep uvicorn/gunicorn loggers but route through the same handler.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "gunicorn", "gunicorn.error", "gunicorn.access"):
        lg = logging.getLogger(name)
        lg.handlers = [handler]
        lg.propagate = False


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Per-request JSON access log + X-Request-Id header propagation."""

    SKIP_PATHS = {"/", "/health", "/healthz", "/api/health", "/metrics", "/favicon.ico"}

    async def dispatch(self, request: Request, call_next):
        # Honour upstream request id from Vercel / nginx if present.
        rid = (
            request.headers.get("x-request-id")
            or request.headers.get("x-amzn-trace-id")
            or uuid.uuid4().hex
        )
        token_rid = _request_id_var.set(rid)

        # Best-effort tenant + user extraction from JWT (no exception propagation)
        tenant_id: Optional[int] = None
        user_id: Optional[int] = None
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            try:
                from app.core.security import decode_access_token
                claims = decode_access_token(auth[7:])
                if claims:
                    tid = claims.get("tenant_id")
                    uid = claims.get("sub") or claims.get("user_id")
                    if tid is not None:
                        try:
                            tenant_id = int(tid)
                        except Exception:
                            pass
                    if uid is not None:
                        try:
                            user_id = int(uid)
                        except Exception:
                            pass
            except Exception:
                pass
        token_tid = _tenant_id_var.set(tenant_id)
        token_uid = _user_id_var.set(user_id)

        start = time.perf_counter()
        status_code = 500
        try:
            response: Response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-Id"] = rid
            return response
        except Exception:
            # Re-raise after logging — global error handler will turn it into a 500 envelope.
            logging.getLogger("nama.access").exception(
                "request failed",
                extra={
                    "http_method": request.method,
                    "http_path": request.url.path,
                },
            )
            raise
        finally:
            latency_ms = (time.perf_counter() - start) * 1000
            if request.url.path not in self.SKIP_PATHS:
                logging.getLogger("nama.access").info(
                    f"{request.method} {request.url.path} -> {status_code}",
                    extra={
                        "http_method": request.method,
                        "http_path": request.url.path,
                        "http_status": status_code,
                        "latency_ms": round(latency_ms, 2),
                        "ip": (request.client.host if request.client else None),
                        "ua": request.headers.get("user-agent", "")[:200],
                    },
                )
            _request_id_var.reset(token_rid)
            _tenant_id_var.reset(token_tid)
            _user_id_var.reset(token_uid)
