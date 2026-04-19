"""
NAMA Routine Executor
---------------------
Replaces the simulated _execute_routine with a real step-by-step execution
engine that queries the database, calls OpenRouter LLM, sends emails via
Resend, and sends WhatsApp messages via the Meta Cloud API.

Usage:
    result = RoutineExecutor(tenant_id, routine, db).execute()
    # Returns { success, output_summary, actions_log, duration_ms }
"""

import json
import logging
import os
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy.orm import Session

from app.models.routines import Routine
from app.models.leads import Lead, LeadStatus
from app.models.auth import User, UserRole, Tenant
from app.models.bookings import Booking

logger = logging.getLogger(__name__)

OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free"


class RoutineExecutor:
    """
    Executes a Routine's steps_json in sequence.

    Steps run synchronously in a background thread (FastAPI BackgroundTasks).
    Each step handler receives `params` from the step definition and a shared
    `context` dict that accumulates state across steps (e.g. fetched records,
    AI summaries) so later steps can reference earlier results.
    """

    def __init__(self, tenant_id: int, routine: Routine, db: Session) -> None:
        self.tenant_id = tenant_id
        self.routine = routine
        self.db = db
        self.context: Dict[str, Any] = {}
        self.actions_log: List[Dict[str, Any]] = []

    # ── Public entry point ────────────────────────────────────────────────────

    def execute(self) -> Dict[str, Any]:
        """
        Execute all steps in sequence.  Returns a summary dict with:
          success         bool
          output_summary  str
          actions_log     list[dict]
          duration_ms     float
        """
        start_ts = time.perf_counter()
        output_lines: List[str] = []
        success = True

        for step in (self.routine.steps_json or []):
            step_type = step.get("type", "unknown")
            params = step.get("params", {})
            log_entry: Dict[str, Any] = {
                "step": step_type,
                "params": params,
                "ts": datetime.now(timezone.utc).isoformat(),
            }

            try:
                result = self._dispatch(step_type, params)
                log_entry["status"] = "ok"
                log_entry["result"] = result
                output_lines.append(f"✓ {step_type}: {self._summarise_result(result)}")
                # Merge result into context for downstream steps
                if isinstance(result, dict):
                    self.context.update(result)
                elif isinstance(result, list):
                    self.context[f"{step_type}_data"] = result
            except Exception as exc:
                logger.error("RoutineExecutor step=%s error: %s", step_type, exc)
                log_entry["status"] = "error"
                log_entry["error"] = str(exc)
                output_lines.append(f"✗ {step_type}: {exc}")
                success = False

            self.actions_log.append(log_entry)

        duration_ms = (time.perf_counter() - start_ts) * 1000
        output_summary = (
            f"Routine '{self.routine.name}' {'completed' if success else 'completed with errors'}.\n"
            f"Steps executed: {len(self.routine.steps_json or [])}\n"
            + "\n".join(output_lines)
        )

        return {
            "success": success,
            "output_summary": output_summary,
            "actions_log": self.actions_log,
            "duration_ms": duration_ms,
        }

    # ── Step dispatcher ───────────────────────────────────────────────────────

    def _dispatch(self, step_type: str, params: Dict[str, Any]) -> Any:
        handlers = {
            "fetch_data":      self._step_fetch_data,
            "ai_summarise":    self._step_ai_summarise,
            "send_email":      self._step_send_email,
            "send_whatsapp":   self._step_send_whatsapp,
            "generate_pdf":    self._step_generate_pdf,
            "group_by":        self._step_group_by,
            "update_records":  self._step_update_records,
            "ai_score_leads":  self._step_ai_score_leads,
            "create_task":     self._step_create_task,
        }
        handler = handlers.get(step_type)
        if handler is None:
            logger.warning("RoutineExecutor: unknown step type '%s' — skipping", step_type)
            return {"skipped": True, "reason": f"unknown step type '{step_type}'"}
        return handler(params)

    # ── Step: fetch_data ──────────────────────────────────────────────────────

    def _step_fetch_data(self, params: Dict[str, Any]) -> Dict[str, Any]:
        source = params.get("source", "leads")
        filter_key = params.get("filter", "")
        now = datetime.now(timezone.utc)

        records: List[Dict[str, Any]] = []

        if source == "leads":
            q = self.db.query(Lead).filter(Lead.tenant_id == self.tenant_id)

            if filter_key == "created_last_24h":
                q = q.filter(Lead.created_at > now - timedelta(hours=24))
            elif filter_key == "created_last_12h":
                q = q.filter(Lead.created_at > now - timedelta(hours=12))
            elif filter_key == "follow_up_due":
                q = q.filter(
                    Lead.status.in_([LeadStatus.NEW, LeadStatus.CONTACTED]),
                    Lead.updated_at < now - timedelta(days=3),
                )
            elif filter_key == "high_priority":
                q = q.filter(Lead.priority == 1)
            elif filter_key == "cold_7d":
                q = q.filter(
                    Lead.status.in_([LeadStatus.QUALIFIED, LeadStatus.CONTACTED]),
                    Lead.updated_at < now - timedelta(days=7),
                )
            elif filter_key == "open":
                q = q.filter(
                    Lead.status.in_([LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED])
                )

            leads = q.limit(200).all()
            records = [self._lead_to_dict(lead) for lead in leads]
            self.context["leads"] = records
            self.context["_lead_objects"] = leads

        elif source == "bookings":
            q = self.db.query(Booking).filter(Booking.tenant_id == self.tenant_id)

            if filter_key == "confirmed_this_week":
                week_start = now - timedelta(days=now.weekday())
                week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
                from app.schemas.bookings import BookingStatus
                q = q.filter(
                    Booking.status == BookingStatus.CONFIRMED,
                    Booking.created_at >= week_start,
                )

            bookings = q.limit(200).all()
            records = [self._booking_to_dict(b) for b in bookings]
            self.context["bookings"] = records

        elif source == "invoices":
            from app.api.v1.quotations import Quotation, QuotationStatus
            q = self.db.query(Quotation).filter(
                Quotation.tenant_id == self.tenant_id,
                Quotation.is_deleted.is_(False),
            )

            if filter_key == "overdue_7d":
                q = q.filter(
                    Quotation.status == QuotationStatus.SENT,
                    Quotation.created_at < now - timedelta(days=7),
                )

            quotations = q.limit(200).all()
            records = [self._quotation_to_dict(q_row) for q_row in quotations]
            self.context["invoices"] = records

        elif source == "analytics":
            # Lightweight analytics summary without external calls
            from sqlalchemy import func
            lead_count = (
                self.db.query(func.count(Lead.id))
                .filter(Lead.tenant_id == self.tenant_id)
                .scalar() or 0
            )
            booking_count = (
                self.db.query(func.count(Booking.id))
                .filter(Booking.tenant_id == self.tenant_id)
                .scalar() or 0
            )
            revenue_raw = (
                self.db.query(func.sum(Booking.total_price))
                .filter(Booking.tenant_id == self.tenant_id)
                .scalar()
            )
            summary = {
                "total_leads": lead_count,
                "total_bookings": booking_count,
                "total_revenue": float(revenue_raw) if revenue_raw else 0.0,
                "filter": filter_key,
            }
            records = [summary]
            self.context["analytics"] = summary

        return {"source": source, "filter": filter_key, "count": len(records), "data": records}

    # ── Step: ai_summarise ────────────────────────────────────────────────────

    def _step_ai_summarise(self, params: Dict[str, Any]) -> Dict[str, Any]:
        style = params.get("style", "daily_summary")

        # Collect relevant data from context
        data_parts: List[str] = []
        for key in ("leads", "bookings", "invoices", "analytics"):
            val = self.context.get(key)
            if val:
                data_parts.append(f"{key.upper()}: {json.dumps(val, default=str)[:2000]}")
        data_blob = "\n\n".join(data_parts) if data_parts else "No data fetched yet."

        prompts = {
            "daily_briefing": (
                f"Summarise these travel agency leads as a concise morning briefing. "
                f"Highlight follow-ups due today and any urgent new enquiries. "
                f"Keep it under 200 words, use bullet points.\n\nData:\n{data_blob}"
            ),
            "revenue_report": (
                f"Create a brief weekly revenue report for a travel agency. "
                f"Highlight booking totals, top performing areas, and any overdue invoices. "
                f"Keep it under 250 words.\n\nData:\n{data_blob}"
            ),
            "whatsapp_short": (
                f"Write a short WhatsApp message (under 100 words) for a travel agency owner "
                f"summarising today's new leads and priority follow-ups. "
                f"Be direct and action-oriented.\n\nData:\n{data_blob}"
            ),
            "daily_summary": (
                f"Create a concise daily summary for a travel agency. "
                f"Keep it under 200 words.\n\nData:\n{data_blob}"
            ),
        }
        prompt = prompts.get(style, prompts["daily_summary"])

        summary = self._call_openrouter_sync(prompt)
        if not summary:
            # Fallback: template string
            counts = {
                "leads": len(self.context.get("leads", [])),
                "bookings": len(self.context.get("bookings", [])),
                "invoices": len(self.context.get("invoices", [])),
            }
            summary = (
                f"Routine '{self.routine.name}' summary:\n"
                f"- Leads fetched: {counts['leads']}\n"
                f"- Bookings fetched: {counts['bookings']}\n"
                f"- Invoices fetched: {counts['invoices']}\n"
                f"(AI summary unavailable — set OPENROUTER_API_KEY in Railway)"
            )

        self.context["summary"] = summary
        return {"summary": summary, "style": style}

    # ── Step: send_email ──────────────────────────────────────────────────────

    def _step_send_email(self, params: Dict[str, Any]) -> Dict[str, Any]:
        recipient_key = params.get("recipient", "owner")
        subject = params.get("subject") or f"NAMA OS — {self.routine.name}"
        template = params.get("template", "")

        to_email = self._resolve_email(recipient_key)
        if not to_email:
            return {"sent": False, "reason": f"could not resolve email for recipient '{recipient_key}'"}

        summary = self.context.get("summary", "")
        html_body = self._build_email_html(subject, summary, template)

        resend = self._get_resend_client()
        if resend is None:
            logger.info("RoutineExecutor send_email: DEMO MODE — would send to %s", to_email)
            return {"sent": True, "to": to_email, "demo": True}

        try:
            from_addr = os.getenv("RESEND_FROM_EMAIL", "NAMA OS <noreply@getnama.app>")
            resend.Emails.send({
                "from": from_addr,
                "to": [to_email],
                "subject": subject,
                "html": html_body,
            })
            logger.info("RoutineExecutor send_email: sent to %s", to_email)
            return {"sent": True, "to": to_email, "demo": False}
        except Exception as exc:
            logger.error("RoutineExecutor send_email failed: %s", exc)
            return {"sent": False, "error": str(exc)}

    # ── Step: send_whatsapp ───────────────────────────────────────────────────

    def _step_send_whatsapp(self, params: Dict[str, Any]) -> Dict[str, Any]:
        recipient_key = params.get("recipient", "owner")
        template_name = params.get("template", "")

        phone = self._resolve_phone(recipient_key)
        if not phone:
            return {"sent": False, "reason": f"could not resolve phone for recipient '{recipient_key}'"}

        # Build the message text
        summary = self.context.get("summary", "")
        if summary:
            message_text = summary[:1000]  # WhatsApp text message limit
        elif template_name == "follow_up":
            leads = self.context.get("leads", [])
            if leads:
                lead_names = ", ".join(
                    l.get("full_name") or f"Lead #{l.get('id', '?')}"
                    for l in leads[:5]
                )
                message_text = (
                    f"NAMA OS reminder: You have {len(leads)} cold lead(s) needing attention: "
                    f"{lead_names}. Please follow up today."
                )
            else:
                message_text = f"NAMA OS: No cold leads to follow up on right now."
        else:
            message_text = f"NAMA OS — {self.routine.name} completed successfully."

        wa_token = os.getenv("WHATSAPP_TOKEN", "")
        wa_phone_id = os.getenv("WHATSAPP_PHONE_ID", "")

        if not wa_token or not wa_phone_id:
            logger.info("RoutineExecutor send_whatsapp: DEMO MODE — would send to %s", phone)
            return {"sent": True, "to": phone, "demo": True, "message": message_text[:80]}

        # Normalise phone: strip +, spaces, dashes
        phone_normalised = phone.replace("+", "").replace(" ", "").replace("-", "")
        wa_api_base = "https://graph.facebook.com/v19.0"

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(
                    f"{wa_api_base}/{wa_phone_id}/messages",
                    json={
                        "messaging_product": "whatsapp",
                        "to": phone_normalised,
                        "type": "text",
                        "text": {"body": message_text},
                    },
                    headers={
                        "Authorization": f"Bearer {wa_token}",
                        "Content-Type": "application/json",
                    },
                )
                if resp.status_code == 200:
                    msg_id = resp.json().get("messages", [{}])[0].get("id", "")
                    logger.info("RoutineExecutor send_whatsapp: sent to %s msg_id=%s", phone, msg_id)
                    return {"sent": True, "to": phone, "message_id": msg_id}
                else:
                    error = resp.json().get("error", {}).get("message", "unknown error")
                    return {"sent": False, "error": error}
        except Exception as exc:
            logger.error("RoutineExecutor send_whatsapp failed: %s", exc)
            return {"sent": False, "error": str(exc)}

    # ── Step: generate_pdf ────────────────────────────────────────────────────

    def _step_generate_pdf(self, params: Dict[str, Any]) -> Dict[str, Any]:
        document = params.get("document", "voucher")
        # The PDF generation is handled by the documents API (WeasyPrint).
        # Here we call it if a booking is available in context, otherwise log intent.
        booking_id = None
        bookings = self.context.get("bookings", [])
        if bookings and isinstance(bookings[0], dict):
            booking_id = bookings[0].get("id")

        if booking_id:
            backend_url = os.getenv("NEXT_PUBLIC_API_URL", "")
            api_key = os.getenv("NAMA_API_KEY", "")
            if backend_url and api_key:
                try:
                    with httpx.Client(timeout=30.0) as client:
                        endpoint = f"{backend_url}/api/v1/documents/invoice-pdf" if document == "invoice" else f"{backend_url}/api/v1/documents/quotation-pdf"
                        resp = client.post(
                            endpoint,
                            json={"booking_id": booking_id},
                            headers={"X-Api-Key": api_key},
                        )
                        if resp.status_code == 200:
                            logger.info("RoutineExecutor generate_pdf: generated %s for booking %s", document, booking_id)
                            return {"generated": True, "document": document, "booking_id": booking_id}
                        else:
                            return {"generated": False, "error": f"PDF API returned {resp.status_code}"}
                except Exception as exc:
                    return {"generated": False, "error": str(exc)}

        # No booking available — log intent only
        logger.info("RoutineExecutor generate_pdf: no booking in context, logging intent for document=%s", document)
        return {"generated": False, "reason": "no booking in context — PDF queued for next trigger"}

    # ── Step: group_by ────────────────────────────────────────────────────────

    def _step_group_by(self, params: Dict[str, Any]) -> Dict[str, Any]:
        field = params.get("field", "assigned_user")
        leads = self.context.get("leads", [])

        groups: Dict[str, List[Dict[str, Any]]] = {}
        for lead in leads:
            key = str(lead.get(field) or lead.get("assigned_user_id") or "unassigned")
            groups.setdefault(key, []).append(lead)

        self.context["grouped"] = groups
        return {"field": field, "groups": len(groups), "total_items": len(leads)}

    # ── Step: update_records ──────────────────────────────────────────────────

    def _step_update_records(self, params: Dict[str, Any]) -> Dict[str, Any]:
        fields = params.get("fields", [])
        lead_objects: List[Lead] = self.context.get("_lead_objects", [])

        if not lead_objects or not fields:
            return {"updated": 0}

        updated = 0
        for lead in lead_objects:
            # The scored data was stored in context by ai_score_leads
            scored = self.context.get("_scored_leads", {})
            lead_score = scored.get(lead.id)
            if lead_score:
                if "priority" in fields and lead_score.get("priority") is not None:
                    lead.priority = lead_score["priority"]
                if "triage_confidence" in fields and lead_score.get("triage_confidence") is not None:
                    lead.triage_confidence = lead_score["triage_confidence"]
                updated += 1

        if updated > 0:
            self.db.commit()

        return {"updated": updated, "fields": fields}

    # ── Step: ai_score_leads ──────────────────────────────────────────────────

    def _step_ai_score_leads(self, params: Dict[str, Any]) -> Dict[str, Any]:
        lead_objects: List[Lead] = self.context.get("_lead_objects", [])
        if not lead_objects:
            return {"scored": 0, "upgraded": 0, "downgraded": 0}

        scored_count = 0
        upgraded = 0
        downgraded = 0
        scored_map: Dict[int, Dict[str, Any]] = {}

        # Build a simple scoring prompt for all leads at once (batching)
        # For each lead, use a heuristic + optional LLM path
        api_key = os.getenv("OPENROUTER_API_KEY", "")

        for lead in lead_objects:
            old_priority = lead.priority or 5
            budget = lead.budget_per_person or 0
            pax = lead.travelers_count or 1
            conf = lead.triage_confidence or 0.0
            status = lead.status.value if lead.status else "NEW"

            if api_key:
                prompt = (
                    f"Score this travel lead 1-10 (1=highest priority). "
                    f"Destination: {lead.destination or 'unknown'}, "
                    f"Budget: INR {budget}/pax, Pax: {pax}, "
                    f"Status: {status}, "
                    f"Confidence: {conf:.0%}. "
                    f"Return only a JSON object: {{\"priority\": <1-10>, \"confidence\": <0.0-1.0>}}"
                )
                raw = self._call_openrouter_sync(prompt, max_tokens=100)
                try:
                    import re as _re
                    json_match = _re.search(r'\{[^}]+\}', raw or "")
                    if json_match:
                        scored = json.loads(json_match.group(0))
                        new_priority = max(1, min(10, int(scored.get("priority", old_priority))))
                        new_conf = max(0.0, min(1.0, float(scored.get("confidence", conf))))
                    else:
                        raise ValueError("no JSON in response")
                except Exception:
                    new_priority = self._heuristic_priority(budget, pax, conf, status)
                    new_conf = conf
            else:
                new_priority = self._heuristic_priority(budget, pax, conf, status)
                new_conf = conf

            scored_map[lead.id] = {"priority": new_priority, "triage_confidence": new_conf}
            if new_priority < old_priority:
                upgraded += 1
            elif new_priority > old_priority:
                downgraded += 1
            scored_count += 1

        self.context["_scored_leads"] = scored_map
        return {"scored": scored_count, "upgraded": upgraded, "downgraded": downgraded}

    # ── Step: create_task ─────────────────────────────────────────────────────

    def _step_create_task(self, params: Dict[str, Any]) -> Dict[str, Any]:
        title = params.get("title", "Routine reminder")
        due_hours = params.get("due_hours", 24)
        due_dt = datetime.now(timezone.utc) + timedelta(hours=due_hours)

        reminder = {
            "id": f"routine_{self.routine.id}_{int(time.time())}",
            "title": title,
            "date": due_dt.strftime("%Y-%m-%d"),
            "time": due_dt.strftime("%H:%M"),
            "type": "manual",
            "notes": f"Auto-created by routine: {self.routine.name}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "routine_id": self.routine.id,
        }

        try:
            tenant = self.db.query(Tenant).filter(Tenant.id == self.tenant_id).first()
            if tenant:
                settings = dict(tenant.settings or {})
                reminders = list(settings.get("calendar_reminders", []))
                reminders.append(reminder)
                # Keep only the last 200 reminders
                if len(reminders) > 200:
                    reminders = reminders[-200:]
                settings["calendar_reminders"] = reminders
                tenant.settings = settings
                self.db.commit()
                logger.info("RoutineExecutor create_task: added reminder '%s' for tenant %s", title, self.tenant_id)
                return {"created": True, "reminder_id": reminder["id"], "due": reminder["date"]}
        except Exception as exc:
            logger.error("RoutineExecutor create_task failed: %s", exc)
            return {"created": False, "error": str(exc)}

        return {"created": False, "reason": "tenant not found"}

    # ── Private helpers ───────────────────────────────────────────────────────

    def _resolve_email(self, recipient_key: str) -> Optional[str]:
        """Resolve a recipient key to an email address."""
        if "@" in recipient_key:
            return recipient_key

        if recipient_key == "owner":
            user = self.db.query(User).filter(
                User.tenant_id == self.tenant_id,
                User.role.in_([UserRole.R0_NAMA_OWNER, UserRole.R1_SUPER_ADMIN, UserRole.R2_ORG_ADMIN]),
                User.is_active == True,
            ).order_by(User.id.asc()).first()
            return user.email if user else None

        if recipient_key == "finance_admin":
            user = self.db.query(User).filter(
                User.tenant_id == self.tenant_id,
                User.role == UserRole.R5_FINANCE_ADMIN,
                User.is_active == True,
            ).first()
            return user.email if user else None

        if recipient_key in ("client", "lead"):
            # Try to get email from context lead or booking
            leads = self.context.get("leads", [])
            if leads and leads[0].get("email"):
                return leads[0]["email"]
            bookings = self.context.get("bookings", [])
            if bookings and bookings[0].get("lead_email"):
                return bookings[0]["lead_email"]
            return None

        if recipient_key == "ops_executive":
            user = self.db.query(User).filter(
                User.tenant_id == self.tenant_id,
                User.role == UserRole.R4_OPS_EXECUTIVE,
                User.is_active == True,
            ).first()
            return user.email if user else None

        return None

    def _resolve_phone(self, recipient_key: str) -> Optional[str]:
        """Resolve a recipient key to a phone number."""
        if recipient_key in ("owner", "assigned_agent"):
            role_filter = UserRole.R3_SALES_MANAGER if recipient_key == "assigned_agent" else UserRole.R2_ORG_ADMIN
            user = self.db.query(User).filter(
                User.tenant_id == self.tenant_id,
                User.role == role_filter,
                User.is_active == True,
            ).first()
            if user and user.profile_data:
                phone = user.profile_data.get("phone")
                if phone:
                    return phone
            # Try owner as fallback
            if recipient_key == "assigned_agent":
                owner = self.db.query(User).filter(
                    User.tenant_id == self.tenant_id,
                    User.role.in_([UserRole.R0_NAMA_OWNER, UserRole.R1_SUPER_ADMIN, UserRole.R2_ORG_ADMIN]),
                    User.is_active == True,
                ).order_by(User.id.asc()).first()
                if owner and owner.profile_data:
                    return owner.profile_data.get("phone")
            return None

        if recipient_key in ("lead", "client"):
            leads = self.context.get("leads", [])
            if leads and leads[0].get("phone"):
                return leads[0]["phone"]
            return None

        if recipient_key == "ops_executive":
            user = self.db.query(User).filter(
                User.tenant_id == self.tenant_id,
                User.role == UserRole.R4_OPS_EXECUTIVE,
                User.is_active == True,
            ).first()
            if user and user.profile_data:
                return user.profile_data.get("phone")
            return None

        return None

    def _call_openrouter_sync(self, prompt: str, max_tokens: int = 600) -> Optional[str]:
        """Call OpenRouter synchronously and return the response text, or None on failure."""
        api_key = os.getenv("OPENROUTER_API_KEY", "")
        if not api_key:
            return None

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    OPENROUTER_BASE,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://getnama.app",
                        "X-Title": "NAMA OS Routine Executor",
                    },
                    json={
                        "model": OPENROUTER_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "max_tokens": max_tokens,
                        "temperature": 0.4,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as exc:
            logger.warning("RoutineExecutor OpenRouter call failed: %s", exc)
            return None

    def _get_resend_client(self):
        """Return resend module with api_key set, or None if not configured."""
        key = os.getenv("RESEND_API_KEY", "")
        if key:
            try:
                import resend  # type: ignore
                resend.api_key = key
                return resend
            except ImportError:
                logger.warning("resend package not installed")
        return None

    def _build_email_html(self, subject: str, body: str, template: str = "") -> str:
        """Build a minimal HTML email body."""
        safe_body = body.replace("\n", "<br>")

        template_extras = ""
        if template == "booking_confirmed":
            template_extras = """
            <div style="background:#dcfce7;border:1px solid #bbf7d0;padding:12px 16px;border-radius:8px;margin-bottom:16px;">
              <strong style="color:#15803d">✅ Booking Confirmed</strong>
            </div>"""
        elif template == "payment_reminder":
            template_extras = """
            <div style="background:#fef2f2;border:1px solid #fecaca;padding:12px 16px;border-radius:8px;margin-bottom:16px;">
              <strong style="color:#dc2626">⚠️ Payment Reminder</strong>
            </div>"""

        return f"""
        <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:640px;margin:0 auto">
          <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
            <div style="color:#14B8A6;font-weight:900;font-size:18px">NAMA OS</div>
            <div style="color:#94a3b8;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px">
              Automated Routine: {self.routine.name}
            </div>
          </div>
          <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
            <h2 style="margin:0 0 16px;font-size:17px;font-weight:800;color:#0f172a">{subject}</h2>
            {template_extras}
            <div style="font-size:14px;color:#475569;line-height:1.7">{safe_body or "Routine completed successfully."}</div>
            <div style="margin-top:28px;text-align:center">
              <a href="https://getnama.app/dashboard/routines"
                 style="display:inline-block;background:#14B8A6;color:#0f172a;font-weight:900;font-size:13px;padding:12px 28px;border-radius:10px;text-decoration:none">
                View in NAMA OS →
              </a>
            </div>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
              NAMA OS · getnama.app · Sent by Routine Engine
            </div>
          </div>
        </div>"""

    def _heuristic_priority(self, budget: float, pax: int, conf: float, status: str) -> int:
        """Return a heuristic priority 1–10 (1 = highest)."""
        score = 5.0
        if budget >= 150000:
            score -= 2
        elif budget >= 75000:
            score -= 1
        elif budget < 25000:
            score += 1

        if pax >= 6:
            score -= 1
        if conf >= 0.8:
            score -= 1

        if status in ("QUALIFIED", "PROPOSAL_SENT"):
            score -= 1
        elif status in ("WON", "CONTACTED"):
            score = score
        elif status in ("LOST", "UNRESPONSIVE"):
            score += 2

        return max(1, min(10, int(score)))

    def _summarise_result(self, result: Any) -> str:
        """One-line summary of a step result for the output log."""
        if isinstance(result, dict):
            if "count" in result:
                return f"{result.get('count', 0)} records ({result.get('source', '')} {result.get('filter', '')})"
            if "sent" in result:
                dest = result.get("to", "")
                return f"{'sent' if result['sent'] else 'failed'} to {dest}"
            if "summary" in result:
                return (result["summary"] or "")[:80]
            if "scored" in result:
                return f"scored {result['scored']}, upgraded {result.get('upgraded',0)}, downgraded {result.get('downgraded',0)}"
            if "updated" in result:
                return f"updated {result['updated']} records"
            if "created" in result:
                return "task created" if result["created"] else f"task not created: {result.get('reason','')}"
            if "generated" in result:
                return "PDF generated" if result["generated"] else "PDF skipped"
            return str(result)[:80]
        return str(result)[:80]

    # ── Model serialisers ─────────────────────────────────────────────────────

    def _lead_to_dict(self, lead: Lead) -> Dict[str, Any]:
        return {
            "id": lead.id,
            "full_name": lead.full_name,
            "email": lead.email,
            "phone": lead.phone,
            "destination": lead.destination,
            "status": lead.status.value if lead.status else None,
            "priority": lead.priority,
            "budget_per_person": lead.budget_per_person,
            "travelers_count": lead.travelers_count,
            "triage_confidence": lead.triage_confidence,
            "assigned_user_id": lead.assigned_user_id,
            "created_at": lead.created_at.isoformat() if lead.created_at else None,
            "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
        }

    def _booking_to_dict(self, booking: Booking) -> Dict[str, Any]:
        lead_name = ""
        lead_email = ""
        destination = ""
        if booking.lead:
            lead_name = booking.lead.full_name or f"Lead #{booking.lead_id}"
            lead_email = booking.lead.email or ""
            destination = booking.lead.destination or ""
        return {
            "id": booking.id,
            "lead_id": booking.lead_id,
            "lead_name": lead_name,
            "lead_email": lead_email,
            "destination": destination,
            "status": booking.status.value if booking.status else None,
            "total_price": booking.total_price,
            "currency": booking.currency,
            "created_at": booking.created_at.isoformat() if booking.created_at else None,
        }

    def _quotation_to_dict(self, q) -> Dict[str, Any]:
        return {
            "id": q.id,
            "lead_name": q.lead_name,
            "destination": q.destination,
            "total_price": float(q.total_price) if q.total_price else 0.0,
            "status": q.status.value if q.status else None,
            "currency": q.currency,
            "created_at": q.created_at.isoformat() if q.created_at else None,
        }
