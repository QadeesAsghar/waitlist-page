import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { resolveMx } from "node:dns/promises";

const IS_PROD = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

function loadSecret() {
  const secret = process.env.WAITLIST_SECRET || process.env.TOKEN_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (IS_PROD) {
    // Return deterministic secret or throw
    return "slang-default-ultra-secure-key-32-bytes-minimum-fallback";
  }
  return randomBytes(32).toString("hex");
}

const SECRET = loadSecret();
const IP_SALT =
  process.env.IP_SALT || createHash("sha256").update(`ip:${SECRET}`).digest("hex");

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const CONFIG = {
  powDifficulty: Math.min(6, Math.max(0, num(process.env.POW_DIFFICULTY, 4))),
  minDwellMs: num(process.env.MIN_DWELL_MS, 1500),
  maxTokenAgeMs: num(process.env.MAX_TOKEN_AGE_MS, 45 * 60 * 1000),
  verifyMx: process.env.VERIFY_MX !== "false",
};

export function hashIp(ip) {
  return createHash("sha256")
    .update(`${IP_SALT}:${ip || "unknown"}`)
    .digest("hex");
}

const b64 = (input) => Buffer.from(input).toString("base64url");

function sign(payload) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function issueToken(ipHash) {
  const claims = {
    t: Date.now(),
    n: randomBytes(12).toString("base64url"),
    i: ipHash.slice(0, 16),
    c: randomBytes(16).toString("base64url"),
    d: CONFIG.powDifficulty,
  };

  const payload = b64(JSON.stringify(claims));

  return {
    token: `${payload}.${sign(payload)}`,
    challenge: claims.c,
    difficulty: claims.d,
  };
}

const spentNonces = new Map();

function burnNonce(nonce, expiresAt) {
  const now = Date.now();
  if (spentNonces.size > 5000) {
    for (const [key, expiry] of spentNonces) {
      if (expiry <= now) spentNonces.delete(key);
    }
  }
  spentNonces.set(nonce, expiresAt);
}

export function verifyToken(token, ipHash) {
  if (typeof token !== "string" || token.length > 512) {
    return { ok: false, reason: "token_missing" };
  }

  const split = token.indexOf(".");
  if (split <= 0) return { ok: false, reason: "token_malformed" };

  const payload = token.slice(0, split);
  const signature = token.slice(split + 1);
  if (!safeEqual(signature, sign(payload))) {
    return { ok: false, reason: "token_bad_signature" };
  }

  let claims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "token_malformed" };
  }

  const age = Date.now() - Number(claims.t);
  if (!Number.isFinite(age) || age < 0) {
    return { ok: false, reason: "token_malformed" };
  }
  if (age > CONFIG.maxTokenAgeMs) return { ok: false, reason: "token_expired" };
  if (age < CONFIG.minDwellMs) return { ok: false, reason: "too_fast" };

  if (claims.i !== ipHash.slice(0, 16)) {
    return { ok: false, reason: "token_wrong_origin" };
  }
  if (spentNonces.has(claims.n)) return { ok: false, reason: "token_replayed" };

  return {
    ok: true,
    claims,
    burn: () => burnNonce(claims.n, Number(claims.t) + CONFIG.maxTokenAgeMs),
  };
}

export function verifyPow(challenge, difficulty, nonce) {
  if (difficulty <= 0) return true;
  if (typeof nonce !== "string" && typeof nonce !== "number") return false;

  const candidate = String(nonce);
  if (candidate.length > 32 || !/^[0-9]+$/.test(candidate)) return false;

  const digest = createHash("sha256")
    .update(`${challenge}:${candidate}`)
    .digest("hex");

  return digest.startsWith("0".repeat(difficulty));
}

export function createLimiter({ limit, windowMs, name }) {
  const hits = new Map();
  let lastPrune = Date.now();

  return function take(key) {
    const now = Date.now();

    if (now - lastPrune > windowMs) {
      for (const [k, stamps] of hits) {
        const live = stamps.filter((t) => now - t < windowMs);
        if (live.length) hits.set(k, live);
        else hits.delete(k);
      }
      lastPrune = now;
    }

    const stamps = (hits.get(key) || []).filter((t) => now - t < windowMs);

    if (stamps.length >= limit) {
      const retryAfter = Math.ceil((windowMs - (now - stamps[0])) / 1000);
      hits.set(key, stamps);
      return { ok: false, retryAfter: Math.max(1, retryAfter), name };
    }

    stamps.push(now);
    hits.set(key, stamps);
    return { ok: true, remaining: limit - stamps.length };
  };
}

const DISPOSABLE_DOMAINS = new Set([
  "0-mail.com", "10minutemail.com", "20minutemail.com", "33mail.com", "burnermail.io",
  "dispostable.com", "emailondeck.com", "fakeinbox.com", "getairmail.com", "getnada.com",
  "guerrillamail.com", "guerrillamail.info", "guerrillamail.net", "harakirimail.com",
  "inboxbear.com", "mail-temporaire.fr", "mail.tm", "mailcatch.com", "maildrop.cc",
  "mailinator.com", "mailnesia.com", "mailsac.com", "mintemail.com", "moakt.com",
  "mohmal.com", "mytemp.email", "nowmymail.com", "sharklasers.com", "spam4.me",
  "spamgourmet.com", "tempmail.dev", "tempmail.net", "tempmail.plus", "tempmailo.com",
  "temp-mail.io", "temp-mail.org", "throwawaymail.com", "trashmail.com", "trashmail.de",
  "tuta.io", "yopmail.com", "yopmail.fr", "yopmail.net",
]);

const EMAIL_RE =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

function dedupeKey(local, domain) {
  const gmailish = domain === "gmail.com" || domain === "googlemail.com";
  const stripped = local.split("+")[0];
  const canonical = gmailish ? stripped.replace(/\./g, "") : stripped;
  return `${canonical}@${gmailish ? "gmail.com" : domain}`;
}

export function normalizeEmail(raw) {
  if (typeof raw !== "string") {
    return { ok: false, error: "Enter your email address to continue." };
  }

  const email = raw.trim().toLowerCase();

  if (!email) return { ok: false, error: "Enter your email address to continue." };
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, error: "That doesn't look like a valid email address." };
  }

  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (local.length > 64) {
    return { ok: false, error: "That doesn't look like a valid email address." };
  }
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, error: "Please use a permanent email address." };
  }

  return { ok: true, email, domain, emailKey: dedupeKey(local, domain) };
}

const mxCache = new Map();

export async function domainAcceptsMail(domain) {
  if (!CONFIG.verifyMx) return { ok: true };

  const cached = mxCache.get(domain);
  if (cached && cached.expires > Date.now()) return cached.result;

  let result;
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("dns_timeout")), 3000)
      ),
    ]);
    result = records?.length
      ? { ok: true }
      : { ok: false, error: "That domain can't receive email." };
  } catch (err) {
    const missing = err?.code === "ENOTFOUND" || err?.code === "NXDOMAIN";
    result = missing
      ? { ok: false, error: "That domain can't receive email." }
      : { ok: true };
  }

  if (mxCache.size > 2000) mxCache.clear();
  mxCache.set(domain, { result, expires: Date.now() + 60 * 60 * 1000 });
  return result;
}

export function trim(value, max) {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}
