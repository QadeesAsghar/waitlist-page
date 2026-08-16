import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedPromise = null;

function uri() {
  const value = process.env.MONGODB_URI;
  if (!value) {
    throw new Error("MONGODB_URI is not configured in Vercel environment variables.");
  }
  return value;
}

export async function getClient() {
  if (cachedClient) return cachedClient;

  if (!cachedPromise) {
    const client = new MongoClient(uri(), {
      appName: "slang-waitlist-vercel",
      maxPoolSize: 10,
      minPoolSize: 0,
      retryWrites: true,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 20000,
    });

    cachedPromise = client.connect().then((c) => {
      cachedClient = c;
      return c;
    }).catch((err) => {
      cachedPromise = null;
      throw err;
    });
  }

  return cachedPromise;
}

export async function getWaitlist() {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "slang").collection("waitlist");
}

let indexesEnsured = false;
export async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const waitlist = await getWaitlist();
    await waitlist.createIndexes([
      { key: { emailKey: 1 }, name: "emailKey_unique", unique: true },
      { key: { createdAt: -1 }, name: "createdAt_desc" },
      { key: { ipHash: 1, createdAt: -1 }, name: "ipHash_createdAt" },
    ]);
    indexesEnsured = true;
  } catch (err) {
    console.error("[vercel-mongo] Index creation warning:", err.message);
  }
}
