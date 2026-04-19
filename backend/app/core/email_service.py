"""
Email Service — SMTP send + IMAP reply polling
------------------------------------------------
Provides send_via_smtp() and poll_imap_replies() using tenant-scoped
SMTP/IMAP credentials stored in TenantEmailConfig.

All functions:
  - Never raise — catch all exceptions and return error dicts.
  - Decrypt passwords only in-memory at call time.
  - Use stdlib smtplib / imaplib — no extra dependencies.
"""

import email as email_lib
import imaplib
import logging
import smtplib
import time
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, parseaddr, parsedate_to_datetime
from typing import Optional

logger = logging.getLogger(__name__)


# ── Internal helper ───────────────────────────────────────────────────────────

def _decrypt(config, field: str) -> str:
    """
    Decrypt the given password field from config.
    Returns empty string if field is None or decryption fails (logged as error).
    """
    raw = getattr(config, field, None)
    if not raw:
        return ""
    try:
        from app.models.email_config import decrypt_password
        return decrypt_password(raw)
    except Exception as exc:
        logger.error("Failed to decrypt %s for tenant_id=%s: %s", field, getattr(config, "tenant_id", "?"), exc)
        return ""


# ── SMTP send ─────────────────────────────────────────────────────────────────

def send_via_smtp(
    config,
    to: str,
    subject: str,
    html: str,
    text: str = "",
    reply_to: str = "",
    message_id_tag: str = "",
) -> dict:
    """
    Send an email using the tenant's SMTP configuration.

    Args:
        config:         TenantEmailConfig instance
        to:             Recipient email address
        subject:        Email subject
        html:           HTML body
        text:           Plain-text fallback (optional)
        reply_to:       Reply-To header value (optional)
        message_id_tag: Tag used to build the Message-ID header for reply threading.
                        Stored alongside the quotation so IMAP poll can match In-Reply-To.

    Returns:
        { sent: bool, message_id: str, error: str | None }
    """
    try:
        password = _decrypt(config, "smtp_password_encrypted")
        if not password:
            return {"sent": False, "message_id": "", "error": "SMTP password not configured"}

        # Build Message-ID
        tenant_id = getattr(config, "tenant_id", "unknown")
        if message_id_tag:
            msg_id = f"<{message_id_tag}@nama.{tenant_id}>"
        else:
            import uuid
            msg_id = f"<{uuid.uuid4().hex}@nama.{tenant_id}>"

        # Build MIME message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((config.smtp_from_name or "", config.smtp_from_email or config.smtp_username or ""))
        msg["To"] = to
        msg["Message-ID"] = msg_id
        if reply_to:
            msg["Reply-To"] = reply_to

        if text:
            msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))

        # Connect and send
        host = config.smtp_host or ""
        port = config.smtp_port or 587
        username = config.smtp_username or ""

        if config.smtp_use_tls:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(username, password)
                server.sendmail(msg["From"], [to], msg.as_string())
        else:
            # SMTP_SSL for port 465
            with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                server.login(username, password)
                server.sendmail(msg["From"], [to], msg.as_string())

        logger.info("SMTP send OK: tenant=%s to=%s subject=%r msg_id=%s", tenant_id, to, subject, msg_id)
        return {"sent": True, "message_id": msg_id, "error": None}

    except Exception as exc:
        logger.error("SMTP send failed for tenant=%s: %s", getattr(config, "tenant_id", "?"), exc)
        return {"sent": False, "message_id": "", "error": str(exc)}


# ── IMAP reply polling ────────────────────────────────────────────────────────

def poll_imap_replies(config, since_hours: int = 24) -> list:
    """
    Poll the tenant's IMAP inbox for recent messages.

    For each message:
      - Extracts subject, from, plain-text body, In-Reply-To header, Date.
      - Marks the message as Seen after extracting.

    Args:
        config:       TenantEmailConfig instance
        since_hours:  How far back to search (default 24h)

    Returns:
        List of dicts:
        { subject, from_email, from_name, body_text, in_reply_to, message_id, received_at }
    """
    results = []
    try:
        password = _decrypt(config, "imap_password_encrypted")
        if not password:
            logger.warning("IMAP password not configured for tenant=%s", getattr(config, "tenant_id", "?"))
            return results

        host = config.imap_host or ""
        port = config.imap_port or 993
        username = config.imap_username or ""
        folder = config.imap_folder or "INBOX"

        # Build SINCE date string for IMAP search
        since_dt = datetime.utcnow() - timedelta(hours=since_hours)
        since_str = since_dt.strftime("%d-%b-%Y")

        if config.imap_use_ssl:
            imap = imaplib.IMAP4_SSL(host, port)
        else:
            imap = imaplib.IMAP4(host, port)

        try:
            imap.login(username, password)
            imap.select(folder)

            # Search for unseen messages since the date cutoff
            typ, data = imap.search(None, f'(UNSEEN SINCE "{since_str}")')
            if typ != "OK" or not data or not data[0]:
                return results

            msg_nums = data[0].split()
            for num in msg_nums:
                try:
                    typ2, msg_data = imap.fetch(num, "(RFC822)")
                    if typ2 != "OK" or not msg_data or not msg_data[0]:
                        continue

                    raw = msg_data[0][1]
                    parsed = email_lib.message_from_bytes(raw)

                    # Extract headers
                    subject = parsed.get("Subject", "")
                    from_raw = parsed.get("From", "")
                    in_reply_to = parsed.get("In-Reply-To", "").strip()
                    msg_id_header = parsed.get("Message-ID", "").strip()
                    date_raw = parsed.get("Date", "")

                    from_name, from_email = parseaddr(from_raw)

                    # Parse date
                    received_at = None
                    if date_raw:
                        try:
                            received_at = parsedate_to_datetime(date_raw).isoformat()
                        except Exception:
                            received_at = None

                    # Extract plain text body
                    body_text = ""
                    if parsed.is_multipart():
                        for part in parsed.walk():
                            if part.get_content_type() == "text/plain":
                                charset = part.get_content_charset() or "utf-8"
                                body_text = part.get_payload(decode=True).decode(charset, errors="replace")
                                break
                    else:
                        if parsed.get_content_type() == "text/plain":
                            charset = parsed.get_content_charset() or "utf-8"
                            body_text = parsed.get_payload(decode=True).decode(charset, errors="replace")

                    # Mark as seen
                    imap.store(num, "+FLAGS", "\\Seen")

                    results.append({
                        "subject": subject,
                        "from_email": from_email,
                        "from_name": from_name,
                        "body_text": body_text.strip(),
                        "in_reply_to": in_reply_to,
                        "message_id": msg_id_header,
                        "received_at": received_at,
                    })

                except Exception as msg_exc:
                    logger.warning("Failed to parse IMAP message %s: %s", num, msg_exc)
                    continue

        finally:
            try:
                imap.logout()
            except Exception:
                pass

        logger.info(
            "IMAP poll done: tenant=%s folder=%s since=%sh fetched=%d",
            getattr(config, "tenant_id", "?"), folder, since_hours, len(results)
        )

    except Exception as exc:
        logger.error("IMAP poll failed for tenant=%s: %s", getattr(config, "tenant_id", "?"), exc)

    return results


# ── Connection testers ────────────────────────────────────────────────────────

def test_smtp(config) -> dict:
    """
    Test the SMTP configuration by opening a connection and authenticating.

    Returns:
        { success: bool, error: str | None }
    """
    try:
        password = _decrypt(config, "smtp_password_encrypted")
        if not password:
            return {"success": False, "error": "SMTP password not set"}

        host = config.smtp_host or ""
        port = config.smtp_port or 587
        username = config.smtp_username or ""

        if not host:
            return {"success": False, "error": "SMTP host not configured"}

        if config.smtp_use_tls:
            with smtplib.SMTP(host, port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(username, password)
        else:
            with smtplib.SMTP_SSL(host, port, timeout=10) as server:
                server.login(username, password)

        logger.info("SMTP test OK: tenant=%s host=%s", getattr(config, "tenant_id", "?"), host)
        return {"success": True, "error": None}

    except smtplib.SMTPAuthenticationError as exc:
        return {"success": False, "error": f"Authentication failed: {exc.smtp_error.decode(errors='replace') if hasattr(exc, 'smtp_error') else str(exc)}"}
    except smtplib.SMTPConnectError as exc:
        return {"success": False, "error": f"Could not connect to {config.smtp_host}:{config.smtp_port}: {exc}"}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def test_imap(config) -> dict:
    """
    Test the IMAP configuration by connecting, logging in, and counting messages in the folder.

    Returns:
        { success: bool, error: str | None, message_count: int }
    """
    try:
        password = _decrypt(config, "imap_password_encrypted")
        if not password:
            return {"success": False, "error": "IMAP password not set", "message_count": 0}

        host = config.imap_host or ""
        port = config.imap_port or 993
        username = config.imap_username or ""
        folder = config.imap_folder or "INBOX"

        if not host:
            return {"success": False, "error": "IMAP host not configured", "message_count": 0}

        if config.imap_use_ssl:
            imap = imaplib.IMAP4_SSL(host, port)
        else:
            imap = imaplib.IMAP4(host, port)

        try:
            imap.login(username, password)
            typ, data = imap.select(folder, readonly=True)
            if typ != "OK":
                return {"success": False, "error": f"Could not select folder {folder!r}", "message_count": 0}
            # data[0] is the message count as bytes
            count = int(data[0]) if data and data[0] else 0
        finally:
            try:
                imap.logout()
            except Exception:
                pass

        logger.info("IMAP test OK: tenant=%s host=%s count=%d", getattr(config, "tenant_id", "?"), host, count)
        return {"success": True, "error": None, "message_count": count}

    except imaplib.IMAP4.error as exc:
        return {"success": False, "error": f"IMAP error: {exc}", "message_count": 0}
    except Exception as exc:
        return {"success": False, "error": str(exc), "message_count": 0}
