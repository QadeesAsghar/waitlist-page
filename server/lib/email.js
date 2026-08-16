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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #18181b;">
      <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #09090b;">Welcome to the waitlist.</h2>
      <p style="font-size: 16px; line-height: 24px; margin-bottom: 24px; color: #3f3f46;">
        We've reserved your spot. We're currently rolling out access to a limited number of teams to ensure a flawless experience.
      </p>
      <p style="font-size: 16px; line-height: 24px; margin-bottom: 40px; color: #3f3f46;">
        We'll notify you the moment your workspace is ready to be provisioned.
      </p>
      <div style="border-top: 1px solid #e4e4e7; padding-top: 32px;">
        <p style="font-size: 14px; color: #71717a; margin: 0;">
          - The Slang Team
        </p>
      </div>
    </div>
  `;

  const transporter = getTransporter();

  // 1. Prioritize Gmail / SMTP if configured
  if (transporter) {
    try {
      const fromAddress = process.env.EMAIL_FROM || `Slang <${process.env.GMAIL_USER || process.env.SMTP_USER}>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: "You're on the list - Welcome to Slang",
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
        subject: "You're on the list - Welcome to Slang",
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
