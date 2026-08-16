import { ensureIndexes, getWaitlist } from "../_lib/db.js";
import { sendWelcomeEmail } from "../_lib/email.js";
import {
  createLimiter,
  domainAcceptsMail,
  hashIp,
  normalizeEmail,
  trim,
  verifyPow,
  verifyToken,
} from "../_lib/security.js";

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

    // Dispatch welcome email via configured SMTP (Gmail/Outlook) or Resend
    sendWelcomeEmail(parsed.email).catch((err) => {
      console.error("[vercel-mongo] welcome email dispatch error:", err.message || err);
    });

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
