import { Resend } from "resend";
import { ensureIndexes, getWaitlist } from "../_lib/db.js";
import {
  createLimiter,
  domainAcceptsMail,
  hashIp,
  normalizeEmail,
  trim,
  verifyPow,
  verifyToken,
} from "../_lib/security.js";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const submitLimit = createLimiter({
  name: "submit",
  limit: 5,
  windowMs: 10 * 60 * 1000,
});

const globalLimit = createLimiter({
  name: "global",
  limit: 240,
  windowMs: 60 * 1000,
});

const HONEYPOTS = ["company_website", "fax"];

function tripped(body) {
  return HONEYPOTS.some((field) => {
    const value = body?.[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
    req.socket?.remoteAddress ||
    "127.0.0.1";

  const body = req.body ?? {};
  const ipHash = hashIp(clientIp);

  // Silent honeypot trap
  if (tripped(body)) {
    return res.status(200).json({ ok: true });
  }

  const burst = globalLimit(":global:");
  if (!burst.ok) {
    res.setHeader("Retry-After", String(burst.retryAfter));
    return res.status(429).json({
      error: "Too many requests. Try again in a moment.",
      retryAfter: burst.retryAfter,
    });
  }

  const perIp = submitLimit(ipHash);
  if (!perIp.ok) {
    res.setHeader("Retry-After", String(perIp.retryAfter));
    return res.status(429).json({
      error: "Too many attempts. Try again in a few minutes.",
      retryAfter: perIp.retryAfter,
    });
  }

  const ticket = verifyToken(body.token, ipHash);
  if (!ticket.ok) {
    const message =
      ticket.reason === "too_fast"
        ? "That was a little quick - try once more."
        : "Your session expired. Reload the page and try again.";
    return res.status(400).json({ error: message, reason: ticket.reason });
  }

  if (!verifyPow(ticket.claims.c, ticket.claims.d, body.nonce)) {
    return res.status(400).json({
      error: "Verification failed. Reload the page and retry.",
      reason: "pow_invalid",
    });
  }

  const parsed = normalizeEmail(body.email);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const deliverable = await domainAcceptsMail(parsed.domain);
  if (!deliverable.ok) return res.status(400).json({ error: deliverable.error });

  let waitlist;
  try {
    await ensureIndexes();
    waitlist = await getWaitlist();
  } catch (err) {
    console.error("[vercel-mongo] database error:", err.message);
    return res.status(503).json({ error: "We couldn't save that right now. Please retry." });
  }

  const now = new Date();

  try {
    await waitlist.insertOne({
      email: parsed.email,
      emailKey: parsed.emailKey,
      domain: parsed.domain,
      createdAt: now,
      updatedAt: now,
      status: "pending",
      source: trim(body.source, 64) || "landing",
      ipHash,
      referrer: trim(body.referrer, 512),
      userAgent: trim(req.headers["user-agent"], 512),
      locale: trim(body.locale, 32),
      timeZone: trim(body.timeZone, 64),
    });

    // Send Welcome Email via Resend
    if (resendClient) {
      const fromEmail = process.env.RESEND_FROM || "Slang <onboarding@resend.dev>";
      resendClient.emails
        .send({
          from: fromEmail,
          to: parsed.email,
          subject: "You're on the list - Welcome to Slang",
          html: `
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
          `,
        })
        .then((result) => {
          if (result.error) {
            console.error("[resend] email delivery error:", result.error);
          } else {
            console.log("[resend] welcome email queued/sent successfully:", result.data?.id);
          }
        })
        .catch((err) => console.error("[resend] failed to send welcome email:", err));
    }

    ticket.burn();
    return res.status(201).json({ ok: true });
  } catch (err) {
    if (err?.code === 11000) {
      ticket.burn();
      return res.status(200).json({ ok: true });
    }

    console.error("[vercel-mongo] insert failed:", err.message);
    return res.status(503).json({ error: "We couldn't save that right now. Please retry." });
  }
}
