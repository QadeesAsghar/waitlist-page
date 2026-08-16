import { createLimiter, hashIp, issueToken } from "../_lib/security.js";

const tokenLimit = createLimiter({
  name: "token",
  limit: 40,
  windowMs: 10 * 60 * 1000,
});

const globalLimit = createLimiter({
  name: "global",
  limit: 240,
  windowMs: 60 * 1000,
});

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
    req.socket?.remoteAddress ||
    "127.0.0.1";

  const ipHash = hashIp(clientIp);

  const burst = globalLimit(":global:");
  if (!burst.ok) {
    res.setHeader("Retry-After", String(burst.retryAfter));
    return res.status(429).json({
      error: "Too many requests. Try again shortly.",
      retryAfter: burst.retryAfter,
    });
  }

  const perIp = tokenLimit(ipHash);
  if (!perIp.ok) {
    res.setHeader("Retry-After", String(perIp.retryAfter));
    return res.status(429).json({
      error: "Too many requests. Try again shortly.",
      retryAfter: perIp.retryAfter,
    });
  }

  res.setHeader("Cache-Control", "no-store, max-age=0");
  return res.status(200).json(issueToken(ipHash));
}
