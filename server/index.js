import "dotenv/config";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { closeClient, ensureIndexes } from "./lib/db.js";
import { waitlistRouter } from "./routes/waitlist.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const PORT = Number(process.env.PORT) || 8787;

const app = express();
app.disable("x-powered-by");

/*
 * Off by default and it matters: with `trust proxy` enabled, Express reads the
 * client IP out of X-Forwarded-For, which anyone can set. Turning that on
 * without a proxy in front would hand every bot a fresh identity per request
 * and make the rate limiter decorative. Set TRUST_PROXY=1 only when something
 * you control is actually terminating the connection.
 */
if (process.env.TRUST_PROXY) {
  const value = Number(process.env.TRUST_PROXY);
  app.set("trust proxy", Number.isFinite(value) ? value : process.env.TRUST_PROXY);
}

app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  });
  next();
});

// 4kb is generous for `{ email, token, nonce }` and closes the door on
// megabyte bodies being used to tie up the process.
app.use(express.json({ limit: "4kb" }));

// Malformed JSON reaches here as a SyntaxError from the parser above
app.use((err, _req, res, next) => {
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "Malformed request." });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request too large." });
  }
  return next(err);
});

app.use("/api/waitlist", waitlistRouter);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

/*
 * In production this process serves the built site too, so there is one origin
 * and no CORS to configure. In dev, Vite serves the app and proxies /api here.
 */
if (existsSync(join(DIST, "index.html")) && process.env.SERVE_STATIC !== "false") {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    // Tailwind's generated sheet plus the inline gradients in <Background />
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://api.dicebear.com",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join("; ");

  app.use((_req, res, next) => {
    res.set("Content-Security-Policy", csp);
    next();
  });

  // Hashed asset filenames are immutable; index.html must never be cached
  const ASSETS = join(DIST, "assets");
  app.use(
    express.static(DIST, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.startsWith(ASSETS)) {
          res.set("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  app.get("*splat", (_req, res) => {
    res.set("Cache-Control", "no-cache");
    res.sendFile(join(DIST, "index.html"));
  });
}

if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });

  /*
   * Best-effort at boot. A missing index is worth shouting about - without the
   * unique one on emailKey duplicates would land silently - but it must not stop
   * the process, since the DB may simply not be reachable yet.
   */
  ensureIndexes()
    .then(() => console.log("[server] mongodb indexes ready"))
    .catch((err) => console.error("[server] index setup failed:", err.message));

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      console.log(`\n[server] ${signal} - shutting down`);
      server.close(async () => {
        await closeClient().catch(() => {});
        process.exit(0);
      });
    });
  }
} else {
  // In Vercel serverless environment, just ensure indexes eagerly
  ensureIndexes().catch((err) => console.error("[server] index setup failed:", err.message));
}

// Export for Vercel serverless functions
export default app;
