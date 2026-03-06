import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "");
}

const FROM = process.env.EMAIL_FROM ?? "PrimeGearStore <noreply@primegearstore.com>";
const BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${BASE_URL}/api/auth/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Confirma tu correo — PrimeGearStore",
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7">
        <tr><td style="background:#09090b;padding:32px 40px;text-align:center">
          <span style="color:#fff;font-size:15px;font-weight:600;letter-spacing:0.14em">PRIMEGEARSTORE</span>
        </td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#09090b">Confirma tu correo electrónico</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.6">
            Gracias por registrarte. Haz clic en el botón para activar tu cuenta. El enlace es válido por 24 horas.
          </p>
          <a href="${link}" style="display:inline-block;background:#09090b;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:8px">
            Confirmar correo
          </a>
          <p style="margin:28px 0 0;font-size:12px;color:#a1a1aa">
            Si no creaste una cuenta, ignora este mensaje.<br>
            O copia este enlace: <a href="${link}" style="color:#52525b">${link}</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f4f4f5;text-align:center">
          <p style="margin:0;font-size:12px;color:#a1a1aa">© ${new Date().getFullYear()} PrimeGearStore</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${BASE_URL}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Restablece tu contraseña — PrimeGearStore",
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7">
        <tr><td style="background:#09090b;padding:32px 40px;text-align:center">
          <span style="color:#fff;font-size:15px;font-weight:600;letter-spacing:0.14em">PRIMEGEARSTORE</span>
        </td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#09090b">Restablecer contraseña</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.6">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta. El enlace es válido por 1 hora.
          </p>
          <a href="${link}" style="display:inline-block;background:#09090b;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:8px">
            Restablecer contraseña
          </a>
          <p style="margin:28px 0 0;font-size:12px;color:#a1a1aa">
            Si no solicitaste esto, ignora este mensaje. Tu contraseña no cambiará.<br>
            O copia este enlace: <a href="${link}" style="color:#52525b">${link}</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f4f4f5;text-align:center">
          <p style="margin:0;font-size:12px;color:#a1a1aa">© ${new Date().getFullYear()} PrimeGearStore</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
