"""
Email Templates API — M21
--------------------------
CRUD for tenant email templates + NAMA system templates.
System templates are shared read-only; tenants can clone them.
POST /{id}/send — renders variables and sends via Resend.
"""
import re
import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.v1.deps import require_tenant, get_db
from app.models.email_template import EmailTemplate
from app.core.email import send_email

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class TemplateCreate(BaseModel):
    name:      str
    category:  str
    subject:   str
    html_body: str
    text_body: Optional[str] = None
    variables: List[str] = []

class TemplateUpdate(BaseModel):
    name:      Optional[str] = None
    category:  Optional[str] = None
    subject:   Optional[str] = None
    html_body: Optional[str] = None
    text_body: Optional[str] = None
    variables: Optional[List[str]] = None
    is_active: Optional[bool] = None

class TemplateOut(BaseModel):
    id:         int
    tenant_id:  Optional[int]
    name:       str
    category:   str
    subject:    str
    html_body:  str
    text_body:  Optional[str]
    variables:  List[str]
    is_system:  bool
    is_active:  bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True

class SendRequest(BaseModel):
    to:        str               # recipient email
    variables: dict = {}         # {"client_name": "Ravi", "destination": "Bali", ...}
    reply_to:  Optional[str] = None


# ── 14 NAMA system templates ──────────────────────────────────────────────────

def _brand_wrap(inner_html: str, category_color: str = "#14B8A6") -> str:
    return f"""<!DOCTYPE html>
<html>
<body style="font-family:Inter,-apple-system,sans-serif;background:#0F172A;margin:0;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;background:#1E293B;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
    <div style="background:{category_color};padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px;">NAMA Travel</h1>
      <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px;">Your journey begins here</p>
    </div>
    <div style="padding:32px;">
      {inner_html}
    </div>
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0;">© NAMA Travel · Crafting journeys since 2024</p>
    </div>
  </div>
</body>
</html>"""


SYSTEM_TEMPLATES = [
    # ── ENQUIRY ────────────────────────────────────────────────────────────────
    {
        "name": "New Enquiry Acknowledgement",
        "category": "ENQUIRY",
        "subject": "Thank you for your enquiry, {{client_name}}!",
        "variables": ["client_name", "destination", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">Thank you for reaching out! We've received your enquiry about <strong style="color:#14B8A6;">{{destination}}</strong> and our travel experts are already reviewing the best options for you.</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 24px;">You can expect a detailed proposal from us within <strong style="color:#F1F5F9;">24 hours</strong>. In the meantime, feel free to reply to this email if you have any specific requests or questions.</p>
      <div style="background:#0F172A;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#64748B;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Your enquiry</p>
        <p style="color:#F1F5F9;font-size:14px;margin:0;font-weight:600;">{{destination}}</p>
      </div>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Warm regards,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """),
    },

    # ── QUOTES ────────────────────────────────────────────────────────────────
    {
        "name": "Quote Ready",
        "category": "QUOTES",
        "subject": "Your travel quote for {{destination}} is ready ✈️",
        "variables": ["client_name", "destination", "quote_ref", "valid_until", "view_url", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">Great news! Your personalised travel quote for <strong style="color:#14B8A6;">{{destination}}</strong> is ready. We've carefully curated an itinerary tailored to your preferences and budget.</p>
      <div style="margin:24px 0;text-align:center;">
        <a href="{{view_url}}" style="display:inline-block;background:#14B8A6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:-0.2px;">View Your Quote →</a>
      </div>
      <div style="background:#0F172A;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#64748B;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Quote details</p>
        <p style="color:#F1F5F9;font-size:13px;margin:0 0 4px;">Reference: <strong>{{quote_ref}}</strong></p>
        <p style="color:#F1F5F9;font-size:13px;margin:0;">Valid until: <strong>{{valid_until}}</strong></p>
      </div>
      <p style="color:#94A3B8;line-height:1.7;font-size:14px;margin:0 0 16px;">This quote is valid for a limited period. Please feel free to reach out if you'd like any modifications or have questions.</p>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Warm regards,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """),
    },

    # ── BOOKINGS ──────────────────────────────────────────────────────────────
    {
        "name": "Booking Confirmed",
        "category": "BOOKINGS",
        "subject": "🎉 Your {{destination}} trip is confirmed! Booking {{booking_ref}}",
        "variables": ["client_name", "destination", "booking_ref", "travel_date", "travelers_count", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">Fantastic news — your trip to <strong style="color:#10B981;">{{destination}}</strong> is officially confirmed! 🎉 Get ready for an unforgettable experience.</p>
      <div style="background:#0F172A;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#64748B;font-size:12px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Booking summary</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#64748B;font-size:13px;padding:4px 0;">Booking Ref</td><td style="color:#F1F5F9;font-size:13px;font-weight:600;text-align:right;">{{booking_ref}}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding:4px 0;">Destination</td><td style="color:#F1F5F9;font-size:13px;font-weight:600;text-align:right;">{{destination}}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding:4px 0;">Travel Date</td><td style="color:#F1F5F9;font-size:13px;font-weight:600;text-align:right;">{{travel_date}}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding:4px 0;">Travelers</td><td style="color:#F1F5F9;font-size:13px;font-weight:600;text-align:right;">{{travelers_count}}</td></tr>
        </table>
      </div>
      <p style="color:#94A3B8;line-height:1.7;font-size:14px;margin:0 0 16px;">What happens next:<br>• Confirmation documents will be shared within 24 hours<br>• Hotel vouchers and e-tickets will follow 7 days before departure<br>• Your dedicated travel manager will be in touch shortly</p>
      <p style="color:#94A3B8;font-size:14px;margin:0;">With excitement,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """, "#10B981"),
    },

    # ── PAYMENTS ──────────────────────────────────────────────────────────────
    {
        "name": "Payment Received",
        "category": "PAYMENTS",
        "subject": "Payment received — Thank you, {{client_name}}!",
        "variables": ["client_name", "amount", "currency", "booking_ref", "destination", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">We've successfully received your payment. Thank you! Your booking for <strong style="color:#14B8A6;">{{destination}}</strong> is now secured.</p>
      <div style="background:#0F172A;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
        <p style="color:#64748B;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Amount received</p>
        <p style="color:#10B981;font-size:28px;font-weight:700;margin:0;">{{currency}} {{amount}}</p>
        <p style="color:#64748B;font-size:13px;margin:8px 0 0;">Booking Ref: {{booking_ref}}</p>
      </div>
      <p style="color:#94A3B8;line-height:1.7;font-size:14px;margin:0 0 16px;">Please keep this email as your payment confirmation. A detailed receipt will be attached to your booking documents.</p>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Best regards,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """, "#10B981"),
    },
    {
        "name": "Balance Due Reminder",
        "category": "PAYMENTS",
        "subject": "Balance due reminder — {{booking_ref}} for {{destination}}",
        "variables": ["client_name", "amount_due", "currency", "due_date", "booking_ref", "destination", "payment_link", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">This is a friendly reminder that your balance payment for your <strong style="color:#14B8A6;">{{destination}}</strong> trip is due soon. Please complete the payment to ensure your booking remains confirmed.</p>
      <div style="background:#0F172A;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#64748B;font-size:12px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Payment details</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#64748B;font-size:13px;padding:4px 0;">Balance Due</td><td style="color:#F59E0B;font-size:15px;font-weight:700;text-align:right;">{{currency}} {{amount_due}}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding:4px 0;">Due Date</td><td style="color:#F1F5F9;font-size:13px;font-weight:600;text-align:right;">{{due_date}}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding:4px 0;">Booking Ref</td><td style="color:#F1F5F9;font-size:13px;text-align:right;">{{booking_ref}}</td></tr>
        </table>
      </div>
      <div style="margin:24px 0;text-align:center;">
        <a href="{{payment_link}}" style="display:inline-block;background:#F59E0B;color:#0F172A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Pay Now →</a>
      </div>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Best regards,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """, "#F59E0B"),
    },

    # ── DOCUMENTS ─────────────────────────────────────────────────────────────
    {
        "name": "Itinerary Shared",
        "category": "DOCUMENTS",
        "subject": "Your {{destination}} itinerary is ready 📋",
        "variables": ["client_name", "destination", "travel_date", "view_url", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">Your detailed itinerary for <strong style="color:#14B8A6;">{{destination}}</strong> departing <strong style="color:#F1F5F9;">{{travel_date}}</strong> is now ready. We've put together every detail to ensure a seamless experience.</p>
      <div style="margin:24px 0;text-align:center;">
        <a href="{{view_url}}" style="display:inline-block;background:#14B8A6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">View Itinerary →</a>
      </div>
      <p style="color:#94A3B8;line-height:1.7;font-size:14px;margin:0 0 16px;">Please review all the details carefully and let us know if you'd like any changes. We're here to make this trip perfect for you.</p>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Warm regards,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """),
    },
    {
        "name": "Travel Documents Ready",
        "category": "DOCUMENTS",
        "subject": "Your travel documents are ready — {{destination}} trip",
        "variables": ["client_name", "destination", "travel_date", "booking_ref", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">Your travel documents for <strong style="color:#14B8A6;">{{destination}}</strong> (departing {{travel_date}}) are attached to this email. Please save and print copies as needed.</p>
      <div style="background:#0F172A;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#64748B;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Documents included</p>
        <ul style="color:#F1F5F9;font-size:13px;margin:0;padding-left:16px;line-height:2;">
          <li>Hotel confirmation vouchers</li>
          <li>Flight e-tickets</li>
          <li>Transfer booking confirmation</li>
          <li>Emergency contact sheet</li>
        </ul>
      </div>
      <p style="color:#94A3B8;line-height:1.7;font-size:14px;margin:0 0 16px;">We recommend keeping digital copies on your phone. Have a wonderful trip!</p>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Best wishes,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """),
    },
    {
        "name": "Visa Status Update",
        "category": "DOCUMENTS",
        "subject": "Visa update for your {{destination}} trip",
        "variables": ["client_name", "destination", "visa_status", "next_steps", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">Here's an update on your visa application for <strong style="color:#14B8A6;">{{destination}}</strong>:</p>
      <div style="background:#0F172A;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
        <p style="color:#64748B;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Visa Status</p>
        <p style="color:#F1F5F9;font-size:20px;font-weight:700;margin:0;">{{visa_status}}</p>
      </div>
      <p style="color:#94A3B8;line-height:1.7;font-size:14px;margin:0 0 16px;"><strong style="color:#F1F5F9;">Next steps:</strong><br>{{next_steps}}</p>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Please don't hesitate to reach out with any questions.<br><br>Best regards,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """),
    },

    # ── PRE-TRIP ──────────────────────────────────────────────────────────────
    {
        "name": "Trip Reminder (7 days)",
        "category": "PRE_TRIP",
        "subject": "⏰ 7 days to go — your {{destination}} adventure awaits!",
        "variables": ["client_name", "destination", "travel_date", "departure_city", "booking_ref", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">Only <strong style="color:#14B8A6;">7 days</strong> until your <strong style="color:#F1F5F9;">{{destination}}</strong> trip departing <strong style="color:#F1F5F9;">{{travel_date}}</strong> from {{departure_city}}! Here's your pre-trip checklist:</p>
      <div style="background:#0F172A;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#64748B;font-size:12px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Pre-departure checklist</p>
        <ul style="color:#F1F5F9;font-size:13px;margin:0;padding-left:16px;line-height:2.2;">
          <li>✅ Passport valid for 6+ months</li>
          <li>✅ Visa obtained (if applicable)</li>
          <li>✅ Travel insurance confirmed</li>
          <li>✅ Foreign currency / travel card ready</li>
          <li>✅ Download airline app + web check-in (opens 24–48 hrs before)</li>
          <li>✅ Hotel vouchers and e-tickets saved on phone</li>
          <li>✅ Emergency contacts noted</li>
        </ul>
      </div>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Have an amazing trip! 🌍<br><br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """),
    },

    # ── POST-TRIP ─────────────────────────────────────────────────────────────
    {
        "name": "Post-Trip Thank You",
        "category": "POST_TRIP",
        "subject": "Welcome back! Hope you loved {{destination}} 🌟",
        "variables": ["client_name", "destination", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">Welcome back! We hope your trip to <strong style="color:#14B8A6;">{{destination}}</strong> was everything you dreamed of and more. It was a pleasure crafting this journey for you.</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">We'd love to hear about your experience — your feedback helps us create even better journeys for you and other travellers.</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 24px;">Whenever you're ready to plan your next adventure, we're just a message away. The world has so many beautiful places waiting for you! 🌏</p>
      <p style="color:#94A3B8;font-size:14px;margin:0;">With warmth,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """),
    },
    {
        "name": "Feedback Request",
        "category": "POST_TRIP",
        "subject": "How was your {{destination}} trip? Share your experience ⭐",
        "variables": ["client_name", "destination", "review_url", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">We hope your trip to <strong style="color:#14B8A6;">{{destination}}</strong> was wonderful! Your feedback means the world to us — it takes just 2 minutes and helps us serve you better.</p>
      <div style="margin:24px 0;text-align:center;">
        <a href="{{review_url}}" style="display:inline-block;background:#14B8A6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Share Your Experience ⭐</a>
      </div>
      <p style="color:#94A3B8;line-height:1.7;font-size:14px;margin:0 0 16px;">We read every response personally and use your feedback to continuously improve. Thank you for trusting us with your travels.</p>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Gratefully,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """),
    },

    # ── FOLLOW-UP ─────────────────────────────────────────────────────────────
    {
        "name": "Follow-up (No Response)",
        "category": "FOLLOW_UP",
        "subject": "Following up on your {{destination}} enquiry",
        "variables": ["client_name", "destination", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">I hope you're doing well! I wanted to follow up on your enquiry for <strong style="color:#14B8A6;">{{destination}}</strong>. I know life gets busy, and I just wanted to check in to see if you had any questions or if you'd like to explore different options.</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">We have some exciting packages that might interest you, and I'd love to help make your travel plans come together seamlessly.</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 24px;">Just reply to this email or give me a call — I'm here to help!</p>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Best regards,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """),
    },
    {
        "name": "Re-engagement",
        "category": "FOLLOW_UP",
        "subject": "We miss you, {{client_name}}! New destinations just added",
        "variables": ["client_name", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">It's been a while since we last connected, and we've been busy adding incredible new destinations and travel experiences to our portfolio!</p>
      <div style="background:#0F172A;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#64748B;font-size:12px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">New destinations added</p>
        <ul style="color:#F1F5F9;font-size:13px;margin:0;padding-left:16px;line-height:2.2;">
          <li>🌴 Maldives — All-inclusive overwater villas</li>
          <li>🦁 Kenya Safari — Luxury private game drives</li>
          <li>🗼 Europe Multi-city — Curated cultural journeys</li>
          <li>🏔️ Bhutan — Sustainable Himalayan escapes</li>
        </ul>
      </div>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 24px;">Whether you're dreaming of a quick weekend getaway or an epic adventure, we'd love to plan something special for you. Let's catch up!</p>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Until next time,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """),
    },

    # ── MARKETING ─────────────────────────────────────────────────────────────
    {
        "name": "Special Offer / Promotion",
        "category": "MARKETING",
        "subject": "🎁 Exclusive offer for you — {{offer_title}}",
        "variables": ["client_name", "offer_title", "offer_description", "original_price", "offer_price", "currency", "valid_until", "cta_url", "agent_name", "agency_name"],
        "html_body": _brand_wrap("""
      <p style="color:#94A3B8;font-size:15px;margin:0 0 16px;">Dear <strong style="color:#F1F5F9;">{{client_name}}</strong>,</p>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 16px;">We have an exclusive offer crafted just for you:</p>
      <div style="background:#0F172A;border-radius:8px;padding:24px;margin-bottom:24px;text-align:center;border:1px solid rgba(20,184,166,0.3);">
        <p style="color:#14B8A6;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Limited Time Offer</p>
        <p style="color:#F1F5F9;font-size:20px;font-weight:700;margin:0 0 8px;">{{offer_title}}</p>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 16px;">{{offer_description}}</p>
        <p style="color:#64748B;font-size:13px;text-decoration:line-through;margin:0 0 4px;">{{currency}} {{original_price}}</p>
        <p style="color:#10B981;font-size:24px;font-weight:700;margin:0 0 4px;">{{currency}} {{offer_price}}</p>
        <p style="color:#64748B;font-size:12px;margin:0;">Valid until {{valid_until}}</p>
      </div>
      <div style="margin:24px 0;text-align:center;">
        <a href="{{cta_url}}" style="display:inline-block;background:#14B8A6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Grab This Offer →</a>
      </div>
      <p style="color:#94A3B8;font-size:14px;margin:0;">Best,<br><strong style="color:#F1F5F9;">{{agent_name}}</strong><br><span style="color:#64748B;">{{agency_name}}</span></p>
        """),
    },
]


def _seed_system_templates(db: Session):
    """Insert NAMA system templates if not already present."""
    existing = db.query(EmailTemplate).filter(EmailTemplate.is_system == True).count()
    if existing >= len(SYSTEM_TEMPLATES):
        return existing
    for t in SYSTEM_TEMPLATES:
        row = EmailTemplate(
            tenant_id=None,
            is_system=True,
            is_active=True,
            name=t["name"],
            category=t["category"],
            subject=t["subject"],
            html_body=t["html_body"],
            variables=t["variables"],
        )
        db.add(row)
    db.commit()
    return len(SYSTEM_TEMPLATES)


def _render(template_str: str, variables: dict) -> str:
    """Replace {{var}} placeholders with provided values."""
    def replacer(m):
        key = m.group(1).strip()
        return str(variables.get(key, m.group(0)))
    return re.sub(r"\{\{(\w+)\}\}", replacer, template_str)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[TemplateOut], summary="List templates (system + tenant)")
async def list_templates(
    category: Optional[str] = Query(None),
    is_system: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
):
    q = db.query(EmailTemplate).filter(
        or_(
            EmailTemplate.tenant_id == tenant_id,
            EmailTemplate.is_system == True,
        ),
        EmailTemplate.is_active == True,
    )
    if category:
        q = q.filter(EmailTemplate.category == category.upper())
    if is_system is not None:
        q = q.filter(EmailTemplate.is_system == is_system)
    return q.order_by(EmailTemplate.is_system.desc(), EmailTemplate.id).all()


@router.post("/", response_model=TemplateOut, summary="Create tenant template")
async def create_template(
    payload: TemplateCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
):
    # Auto-detect variables from html_body if not provided
    detected = re.findall(r"\{\{(\w+)\}\}", payload.html_body)
    variables = list(dict.fromkeys(payload.variables or detected))
    row = EmailTemplate(
        tenant_id=tenant_id,
        is_system=False,
        **payload.dict(exclude={"variables"}),
        variables=variables,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/{template_id}", response_model=TemplateOut, summary="Get single template")
async def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
):
    row = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        or_(EmailTemplate.tenant_id == tenant_id, EmailTemplate.is_system == True),
    ).first()
    if not row:
        raise HTTPException(404, "Template not found")
    return row


@router.put("/{template_id}", response_model=TemplateOut, summary="Update tenant template")
async def update_template(
    template_id: int,
    payload: TemplateUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
):
    row = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.tenant_id == tenant_id,
        EmailTemplate.is_system == False,
    ).first()
    if not row:
        raise HTTPException(404, "Template not found or not editable")
    for k, v in payload.dict(exclude_none=True).items():
        setattr(row, k, v)
    # Re-detect variables if html_body changed
    if payload.html_body and not payload.variables:
        row.variables = list(dict.fromkeys(re.findall(r"\{\{(\w+)\}\}", payload.html_body)))
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{template_id}", summary="Soft-delete tenant template")
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
):
    row = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.tenant_id == tenant_id,
        EmailTemplate.is_system == False,
    ).first()
    if not row:
        raise HTTPException(404, "Template not found or not deletable")
    row.is_active = False
    db.commit()
    return {"ok": True}


@router.post("/{template_id}/clone", response_model=TemplateOut, summary="Clone system template to tenant library")
async def clone_template(
    template_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
):
    src = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not src:
        raise HTTPException(404, "Template not found")
    clone = EmailTemplate(
        tenant_id=tenant_id,
        is_system=False,
        is_active=True,
        name=f"{src.name} (Copy)",
        category=src.category,
        subject=src.subject,
        html_body=src.html_body,
        text_body=src.text_body,
        variables=src.variables or [],
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return clone


@router.post("/{template_id}/send", summary="Render and send template via Resend")
async def send_template(
    template_id: int,
    payload: SendRequest,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(require_tenant),
):
    row = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        or_(EmailTemplate.tenant_id == tenant_id, EmailTemplate.is_system == True),
    ).first()
    if not row:
        raise HTTPException(404, "Template not found")

    subject  = _render(row.subject,   payload.variables)
    html     = _render(row.html_body, payload.variables)
    text     = _render(row.text_body, payload.variables) if row.text_body else None

    ok = send_email(
        to=payload.to,
        subject=subject,
        html_body=html,
        text_body=text,
        reply_to=payload.reply_to,
    )
    if not ok:
        raise HTTPException(500, "Email send failed — check RESEND_API_KEY")
    return {"ok": True, "to": payload.to, "subject": subject}


@router.post("/seed", summary="Seed NAMA system templates (admin)")
async def seed_templates(
    db: Session = Depends(get_db),
    _tenant_id: int = Depends(require_tenant),
):
    count = _seed_system_templates(db)
    return {"seeded": count}
