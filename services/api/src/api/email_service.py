import resend
from api.core.config import get_settings


def send_reset_email(to_email: str, reset_link: str) -> None:
    """Send a password reset email using Resend."""
    settings = get_settings()
    if not settings.resend_api_key:
        print(f"[DEV] Would send reset email to {to_email}: {reset_link}")
        return

    resend.api_key = settings.resend_api_key

    html = f"""<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta charset="UTF-8" />
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <tr>
        <td style="padding: 32px 24px; text-align: center;">
          <h1 style="font-size: 24px; color: #1a1a2e; margin: 0 0 8px;">Nexova</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Restablecimiento de contraseña</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.5; margin: 0 0 24px;">
            Recibiste este correo porque solicitaste restablecer tu contraseña.
            Haz clic en el botón de abajo para crear una nueva.
          </p>
          <a href="{reset_link}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            Restablecer contraseña
          </a>
          <p style="font-size: 14px; color: #9ca3af; margin-top: 24px; line-height: 1.5;">
            Si no solicitaste este cambio, puedes ignorar este correo.<br />
            Este enlace expirará en {settings.reset_token_expire_minutes} minutos.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>"""

    try:
        resend.Emails.send({
            "from": settings.email_from,
            "to": to_email,
            "subject": "Restablece tu contraseña en Nexova",
            "html": html,
        })
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send reset email to {to_email}: {e}")