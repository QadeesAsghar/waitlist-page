import { MongoClient } from "mongodb";

/*
 * The connection string is read from the environment and never leaves this
 * process. Nothing under src/ can see it: Vite only exposes variables prefixed
 * `VITE_` to the browser bundle, and the credentials here deliberately are not.
 */

let connecting = null;

function uri() {
  const value = process.env.MONGODB_URI;
  if (!value) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env and fill it in."
    );
  }
  return value;
}

/**
 * One pooled client for the whole process, created lazily.
 *
 * The promise itself is cached rather than the resolved client so that
 * concurrent first requests share a single connect() instead of racing to open
 * a pool each.
 */
export function getClient() {
  if (!connecting) {
    const client = new MongoClient(uri(), {
      appName: "slang-waitlist",
      maxPoolSize: 10,
      minPoolSize: 0,
      retryWrites: true,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 20000,
    });

    connecting = client.connect().catch((err) => {
      // Don't cache a failed attempt — the next request should try again
      connecting = null;
      throw err;
    });
  }
  return connecting;
}

export async function getWaitlist() {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "slang").collection("waitlist");
}

/**
 * `emailKey` carries the uniqueness guarantee, so a duplicate signup is a
 * write that fails with E11000 rather than a read-then-write race.
 */
export async function ensureIndexes() {
  const waitlist = await getWaitlist();
  await waitlist.createIndexes([
    { key: { emailKey: 1 }, name: "emailKey_unique", unique: true },
    { key: { createdAt: -1 }, name: "createdAt_desc" },
    { key: { ipHash: 1, createdAt: -1 }, name: "ipHash_createdAt" },
  ]);
}

export async function closeClient() {
  if (!connecting) return;
  const client = await connecting.catch(() => null);
  connecting = null;
  if (client) await client.close();
}
