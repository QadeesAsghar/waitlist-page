import nodemailer from "nodemailer";
import { Resend } from "resend";

function getTransporter() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  if (user && pass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  const host = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();

  if (host && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  return null;
}

function getResendClient() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

export async function sendWelcomeEmail(toEmail) {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Slang</title>
</head>
<body style="margin:0; padding:0; background-color:#08070d; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f4f4f5; -webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#08070d; padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px; background-color:#100e17; border:1px solid #231f33; border-radius:18px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Top Accent Glow Line -->
          <tr>
            <td height="2" style="background:linear-gradient(90deg, #8b5cf6, #a78bfa, #c084fc); font-size:0; line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header / Logo -->
          <tr>
            <td style="padding:36px 36px 20px 36px;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="display:inline-block; width:34px; height:34px; background:#8b5cf6; border-radius:10px; text-align:center; line-height:34px; font-weight:800; font-size:18px; color:#ffffff;">
                      S
                    </div>
                  </td>
                  <td style="padding-left:12px; vertical-align:middle;">
                    <span style="font-size:20px; font-weight:700; color:#ffffff; letter-spacing:-0.5px;">Slang</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status Badge -->
          <tr>
            <td style="padding:0 36px 16px 36px;">
              <div style="display:inline-block; background-color:#1e1833; border:1px solid #3c2f66; border-radius:9999px; padding:4px 12px;">
                <span style="font-size:11px; font-weight:600; color:#c084fc; letter-spacing:0.06em; text-transform:uppercase;">
                  Waitlist Confirmed • Private Beta
                </span>
              </div>
            </td>
          </tr>

          <!-- Heading & Body -->
          <tr>
            <td style="padding:0 36px 24px 36px;">
              <h1 style="margin:0 0 14px 0; font-size:24px; font-weight:700; color:#ffffff; letter-spacing:-0.03em; line-height:1.25;">
                You are on the list.
              </h1>
              <p style="margin:0 0 16px 0; font-size:15px; line-height:24px; color:#a1a1aa;">
                Your spot has been reserved. We are rolling out access in sequential batches to ensure high reliability and zero latency for every workspace.
              </p>
              <p style="margin:0; font-size:15px; line-height:24px; color:#a1a1aa;">
                We will notify you at <strong style="color:#ffffff;">${toEmail}</strong> as soon as your instance is ready to deploy.
              </p>
            </td>
          </tr>

          <!-- What to expect Box -->
          <tr>
            <td style="padding:0 36px 28px 36px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#171324; border:1px solid #28213f; border-radius:12px; padding:18px 20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px 0; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:#71717a;">
                      What to expect next
                    </p>
                    <table border="0" cellspacing="0" cellpadding="0" width="100%">
                      <tr>
                        <td style="padding:4px 0; font-size:14px; color:#e4e4e7; line-height:20px;">
                          • Personal invitation link delivered to your inbox
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0; font-size:14px; color:#e4e4e7; line-height:20px;">
                          • Early preview of customer analytics & live chat tools
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0; font-size:14px; color:#e4e4e7; line-height:20px;">
                          • Dedicated onboarding channel for founding teams
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer / Socials -->
          <tr>
            <td style="padding:24px 36px 36px 36px; border-top:1px solid #1c182b;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size:13px; color:#71717a; line-height:20px;">
                    The Slang Team<br />
                    <span style="font-size:12px; color:#52525b;">Engineered like infrastructure.</span>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="https://whatsapp.com/channel/0029VbDfaOvF6smtYgb6hn2f" style="font-size:12px; color:#a78bfa; text-decoration:none; margin-left:12px;">WhatsApp</a>
                    <a href="https://linkedin.com/company/slangofficial/" style="font-size:12px; color:#a78bfa; text-decoration:none; margin-left:12px;">LinkedIn</a>
                    <a href="https://github.com/QadeesAsghar" style="font-size:12px; color:#a78bfa; text-decoration:none; margin-left:12px;">GitHub</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Copyright note -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px; margin-top:20px;">
          <tr>
            <td align="center" style="font-size:11px; color:#52525b;">
              © ${new Date().getFullYear()} Slang Labs, Inc. All rights reserved.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const transporter = getTransporter();

  // 1. Prioritize Gmail / SMTP if configured
  if (transporter) {
    try {
      const fromAddress = process.env.EMAIL_FROM || `Slang <${process.env.GMAIL_USER || process.env.SMTP_USER}>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: "Welcome to Slang",
        html: htmlContent,
      });
      console.log("[email] welcome email sent via Gmail/SMTP to:", toEmail, "id:", info.messageId);
      return { ok: true, provider: "smtp", id: info.messageId };
    } catch (err) {
      console.error("[email] failed to send via Gmail/SMTP:", err.message);
      return { ok: false, error: err.message };
    }
  }

  const resend = getResendClient();

  // 2. Fallback to Resend if configured
  if (resend) {
    try {
      const fromEmail = process.env.RESEND_FROM || "Slang <onboarding@resend.dev>";
      const result = await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: "Welcome to Slang",
        html: htmlContent,
      });
      if (result.error) {
        console.error("[email] Resend delivery error:", result.error);
        return { ok: false, error: result.error };
      }
      console.log("[email] welcome email sent via Resend to:", toEmail, "id:", result.data?.id);
      return { ok: true, provider: "resend", id: result.data?.id };
    } catch (err) {
      console.error("[email] failed to send via Resend:", err.message);
      return { ok: false, error: err.message };
    }
  }

  console.log("[email] no email provider configured (set GMAIL_USER/GMAIL_APP_PASSWORD or RESEND_API_KEY).");
  return { ok: false, error: "no_provider_configured" };
}
