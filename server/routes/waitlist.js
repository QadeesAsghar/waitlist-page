import { Router } from "express";
import { Resend } from "resend";
import { getWaitlist } from "../lib/db.js";
import {
  CONFIG,
  createLimiter,
  domainAcceptsMail,
  hashIp,
  issueToken,
  normalizeEmail,
  trim,
  verifyPow,
  verifyToken,
} from "../lib/security.js";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/*
 * Layered so that each cheap check runs before an expensive one: origin,
 * honeypot and rate limit cost nothing; the token HMAC is one hash; the
 * proof-of-work is one hash; DNS is a network round trip; Mongo is last.
 */

const tokenLimit = createLimiter({
  name: "token",
  limit: 40,
  windowMs: 10 * 60 * 1000,
});

const submitLimit = createLimiter({
  name: "submit",
  limit: 5,
  windowMs: 10 * 60 * 1000,
});

/** Backstop against a distributed flood, where per-IP limits don't bite. */
const globalLimit = createLimiter({
  name: "global",
  limit: 240,
  windowMs: 60 * 1000,
});

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

/**
 * Only enforced when the header is actually present. Browsers send `Origin` on
 * cross-origin requests and on same-origin POSTs, but coverage has historically
 * varied, and rejecting a real signup over a missing header would be worse than
 * letting the token and proof-of-work carry that request.
 */
function originAllowed(req) {
  const origin = req.get("origin");
  if (!origin) return true;
  if (!ALLOWED_ORIGINS.length) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

/*
 * Honeypot fields. Rendered off-screen with no label, so a human never touches
 * them and a form-filling bot that walks the DOM does. `display: none` is
 * skipped by the better bots, which is why the client positions these instead.
 */
const HONEYPOTS = ["company_website", "fax"];

function tripped(body) {
  return HONEYPOTS.some((field) => {
    const value = body?.[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

/** One shape for every rejection, so probing tells an attacker very little. */
function reject(res, status, error, extra) {
  return res.status(status).json({ error, ...extra });
}

export const waitlistRouter = Router();

/* ── Ticket ──────────────────────────────────────────────────────── */

waitlistRouter.get("/token", (req, res) => {
  const ipHash = hashIp(req.ip);

  const burst = globalLimit(":global:");
  if (!burst.ok) {
    res.set("Retry-After", String(burst.retryAfter));
    return reject(res, 429, "Too many requests. Try again shortly.", {
      retryAfter: burst.retryAfter,
    });
  }

  const perIp = tokenLimit(ipHash);
  if (!perIp.ok) {
    res.set("Retry-After", String(perIp.retryAfter));
    return reject(res, 429, "Too many requests. Try again shortly.", {
      retryAfter: perIp.retryAfter,
    });
  }

  // A cached ticket would be a replayed ticket
  res.set("Cache-Control", "no-store");
  return res.json(issueToken(ipHash));
});

/* ── Submit ──────────────────────────────────────────────────────── */

waitlistRouter.post("/", async (req, res) => {
  res.set("Cache-Control", "no-store");

  if (!originAllowed(req)) {
    return reject(res, 403, "Request blocked.");
  }
  if (!req.is("application/json")) {
    return reject(res, 415, "Expected application/json.");
  }

  const body = req.body ?? {};
  const ipHash = hashIp(req.ip);

  /*
   * A tripped honeypot gets 200 OK. Telling a bot it was detected only teaches
   * whoever wrote it to stop filling the field; a silent no-op looks like
   * success and keeps the junk out of the collection.
   */
  if (tripped(body)) {
    return res.json({ ok: true });
  }

  const burst = globalLimit(":global:");
  if (!burst.ok) {
    res.set("Retry-After", String(burst.retryAfter));
    return reject(res, 429, "Too many requests. Try again in a moment.", {
      retryAfter: burst.retryAfter,
    });
  }

  const perIp = submitLimit(ipHash);
  if (!perIp.ok) {
    res.set("Retry-After", String(perIp.retryAfter));
    return reject(res, 429, "Too many attempts. Try again in a few minutes.", {
      retryAfter: perIp.retryAfter,
    });
  }

  const ticket = verifyToken(body.token, ipHash);
  if (!ticket.ok) {
    // `too_fast` is the one case worth its own copy: a real person who pasted
    // an address and hit enter instantly can just try again.
    const message =
      ticket.reason === "too_fast"
        ? "That was a little quick - try once more."
        : "Your session expired. Reload the page and try again.";
    return reject(res, 400, message, { reason: ticket.reason });
  }

  if (!verifyPow(ticket.claims.c, ticket.claims.d, body.nonce)) {
    return reject(res, 400, "Verification failed. Reload the page and retry.", {
      reason: "pow_invalid",
    });
  }

  const parsed = normalizeEmail(body.email);
  if (!parsed.ok) return reject(res, 400, parsed.error);

  const deliverable = await domainAcceptsMail(parsed.domain);
  if (!deliverable.ok) return reject(res, 400, deliverable.error);

  let waitlist;
  try {
    waitlist = await getWaitlist();
  } catch (err) {
    console.error("[waitlist] database unavailable:", err.message);
    return reject(res, 503, "We couldn't save that right now. Please retry.");
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
      // Hashed, never the raw address - see hashIp()
      ipHash,
      referrer: trim(body.referrer, 512),
      userAgent: trim(req.get("user-agent"), 512),
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
    /*
     * 11000 is the unique index on emailKey doing its job. Answering exactly as
     * we would for a fresh insert keeps the endpoint from becoming an oracle
     * for "is this address on the list".
     */
    if (err?.code === 11000) {
      ticket.burn();
      return res.json({ ok: true });
    }

    console.error("[waitlist] insert failed:", err.message);
    return reject(res, 503, "We couldn't save that right now. Please retry.");
  }
});

/* ── Health ──────────────────────────────────────────────────────── */

waitlistRouter.get("/health", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const waitlist = await getWaitlist();
    await waitlist.estimatedDocumentCount();
    return res.json({ ok: true, powDifficulty: CONFIG.powDifficulty });
  } catch {
    return res.status(503).json({ ok: false });
  }
});
