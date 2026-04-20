"""
NAMA Email Service — Resend integration
Gracefully degrades to a log warning if RESEND_API_KEY is not set.
"""
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Default from address — override with RESEND_FROM_EMAIL env var
_DEFAULT_FROM = "NAMA OS <onboarding@getnama.app>"


def send_email(
    to: str,
    subject: str,
    html_body: str,
    from_email: Optional[str] = None,
    reply_to: Optional[str] = None,
    text_body: Optional[str] = None,
) -> bool:
    """
    Send an email via Resend. Returns True on success, False on failure.
    Logs a warning and returns False if RESEND_API_KEY is not configured.
    """
    api_key = os.getenv("RESEND_API_KEY")
    sender = from_email or os.getenv("RESEND_FROM_EMAIL", _DEFAULT_FROM)

    if not api_key:
        logger.warning(
            f"RESEND_API_KEY not set — email NOT sent | to={to} | subject={subject}"
        )
        return False

    try:
        import resend  # pip install resend

        resend.api_key = api_key

        params: dict = {
            "from": sender,
            "to": [to] if isinstance(to, str) else to,
            "subject": subject,
            "html": html_body,
        }
        if text_body:
            params["text"] = text_body
        if reply_to:
            params["reply_to"] = reply_to

        email = resend.Emails.send(params)
        # Resend returns {"id": "..."} on success; raises on error
        success = bool(email and email.get("id"))
        if success:
            logger.info(f"Email sent via Resend | to={to} | id={email['id']}")
        else:
            logger.warning(f"Resend returned unexpected response: {email}")
        return success

    except ImportError:
        logger.error("resend package not installed — run: pip install resend")
        return False
    except Exception as e:
        logger.error(f"Resend error | to={to} | error={e}")
        return False


def send_invite_email(to: str, invite_token: str, tenant_name: str, role: str) -> bool:
    """Send a team invite email with accept link."""
    base_url = os.getenv("FRONTEND_URL", "https://nama-frontend.vercel.app")
    accept_url = f"{base_url}/accept-invite?token={invite_token}"
    role_label = role.replace("R6_", "").replace("R4_", "").replace("R3_", "").replace("_", " ").title()

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Inter, -apple-system, sans-serif; background: #0F172A; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #1E293B; border-radius: 12px; overflow: hidden;">
        <div style="background: #14B8A6; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">NAMA OS</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">AI-First Travel Management</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #F1F5F9; margin: 0 0 16px; font-size: 20px;">You've been invited!</h2>
          <p style="color: #94A3B8; line-height: 1.6;">You've been invited to join <strong style="color: #F1F5F9;">{tenant_name}</strong> on NAMA OS as <strong style="color: #14B8A6;">{role_label}</strong>.</p>
          <div style="margin: 24px 0;">
            <a href="{accept_url}" style="display: inline-block; background: #14B8A6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Accept Invitation →</a>
          </div>
          <p style="color: #64748B; font-size: 13px; margin: 0;">This invite expires in 14 days. If you didn't expect this, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
    """
    return send_email(to, f"You're invited to join {tenant_name} on NAMA OS", html)


def send_quote_notification(to: str, client_name: str, quote_ref: str, view_url: str) -> bool:
    """Notify a client that their quotation is ready."""
    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Inter, -apple-system, sans-serif; background: #0F172A; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #1E293B; border-radius: 12px; overflow: hidden;">
        <div style="background: #14B8A6; padding: 24px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Your travel quote is ready ✈️</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #94A3B8;">Dear <strong style="color: #F1F5F9;">{client_name}</strong>,</p>
          <p style="color: #94A3B8; line-height: 1.6;">Your quotation <strong style="color: #14B8A6;">{quote_ref}</strong> has been prepared with all the details for your upcoming trip.</p>
          <div style="margin: 24px 0;">
            <a href="{view_url}" style="display: inline-block; background: #14B8A6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Your Quote →</a>
          </div>
        </div>
      </div>
    </body>
    </html>
    """
    return send_email(to, f"Your travel quote {quote_ref} is ready", html)


def send_booking_confirmation(
    to: str, client_name: str, booking_ref: str, destination: str
) -> bool:
    """Send booking confirmation email to client."""
    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Inter, -apple-system, sans-serif; background: #0F172A; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #1E293B; border-radius: 12px; overflow: hidden;">
        <div style="background: #10B981; padding: 24px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Booking Confirmed ✓</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #94A3B8;">Dear <strong style="color: #F1F5F9;">{client_name}</strong>,</p>
          <p style="color: #94A3B8; line-height: 1.6;">Your booking <strong style="color: #10B981;">{booking_ref}</strong> to <strong style="color: #F1F5F9;">{destination}</strong> is confirmed!</p>
          <p style="color: #94A3B8; line-height: 1.6;">Our team will reach out shortly with your complete itinerary and travel documents.</p>
        </div>
      </div>
    </body>
    </html>
    """
    return send_email(to, f"Booking Confirmed: {booking_ref} — NAMA Travel", html)


def send_password_reset(to: str, reset_token: str) -> bool:
    """Send password reset email."""
    base_url = os.getenv("FRONTEND_URL", "https://nama-frontend.vercel.app")
    reset_url = f"{base_url}/reset-password?token={reset_token}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Inter, -apple-system, sans-serif; background: #0F172A; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #1E293B; border-radius: 12px; overflow: hidden;">
        <div style="background: #14B8A6; padding: 24px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Reset your password</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #94A3B8; line-height: 1.6;">Click the link below to reset your NAMA OS password. This link expires in 1 hour.</p>
          <div style="margin: 24px 0;">
            <a href="{reset_url}" style="display: inline-block; background: #14B8A6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password →</a>
          </div>
          <p style="color: #64748B; font-size: 13px;">If you didn't request this, ignore this email. Your password won't change.</p>
        </div>
      </div>
    </body>
    </html>
    """
    return send_email(to, "Reset your NAMA OS password", html)
