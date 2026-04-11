import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "") or SMTP_USER


def _send(to_addresses: list, subject: str, html: str):
    """Low-level send. Raises on error so callers can log."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = ", ".join(to_addresses)
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, to_addresses, msg.as_string())


def notify_pending_entry(entry, creator_name: str, participants: list, approver_emails: list):
    """Called in a background task — silently skipped if SMTP is not configured."""
    if not SMTP_HOST or not SMTP_USER or not approver_emails:
        return

    location = "Rom 🇮🇹" if entry.location == "rome" else "Mallorca 🇪🇸"
    start = entry.start_date.strftime("%d.%m.%Y")
    end = entry.end_date.strftime("%d.%m.%Y")
    date_str = start if start == end else f"{start} – {end}"
    participants_str = ", ".join(participants) if participants else creator_name

    html = f"""
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:16px 8px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:480px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#6366f1;padding:24px 28px;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
              🏠 Familienkalender
            </p>
            <p style="margin:4px 0 0;font-size:13px;color:#c7d2fe;">Neue Kalenderanfrage</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;">
              <strong>{creator_name}</strong> möchte folgendes eintragen:
            </p>

            <!-- Detail card -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f9fafb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #f3f4f6;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;">Ort</span><br>
                  <span style="font-size:15px;font-weight:600;color:#111827;">{location}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #f3f4f6;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;">Zeitraum</span><br>
                  <span style="font-size:15px;font-weight:600;color:#111827;">{date_str}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;{'border-bottom:1px solid #f3f4f6;' if entry.note else ''}">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;">Personen</span><br>
                  <span style="font-size:15px;font-weight:600;color:#111827;">{participants_str}</span>
                </td>
              </tr>
              {'<tr><td style="padding:16px 20px;"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;">Notiz</span><br><span style="font-size:14px;color:#374151;font-style:italic;">' + entry.note + '</span></td></tr>' if entry.note else ''}
            </table>

            <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">
              Bitte öffne den Familienkalender, um die Anfrage zu genehmigen oder abzulehnen.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Familienkalender · Automatische Benachrichtigung</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    try:
        _send(approver_emails, f"📅 Neue Anfrage von {creator_name} – Familienkalender", html)
        print(f"Notification email sent to {approver_emails}")
    except Exception as e:
        print(f"Email notification failed: {e}")
