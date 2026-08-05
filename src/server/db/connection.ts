import mongoose from "mongoose";
import dns from "node:dns";

declare global {
  // eslint-disable-next-line no-var
  var __warstwoweMongo:
    | {
        connection: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cache = global.__warstwoweMongo ?? { connection: null, promise: null };
global.__warstwoweMongo = cache;

let mongoDnsPrepared = false;

async function prepareMongoSrvDns(uri: string) {
  if (mongoDnsPrepared || !uri.startsWith("mongodb+srv://")) return;
  mongoDnsPrepared = true;

  const hostname = new URL(uri).hostname;
  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
  } catch (error: any) {
    const refused = error?.code === "ECONNREFUSED" || error?.code === "EREFUSED";
    if (!refused) throw error;

    const configuredServers = (process.env.MONGODB_DNS_SERVERS || "")
      .split(",")
      .map((server) => server.trim())
      .filter(Boolean);
    const fallbackServers = configuredServers.length
      ? configuredServers
      : process.env.NODE_ENV !== "production"
        ? ["1.1.1.1", "8.8.8.8"]
        : [];
    if (!fallbackServers.length) throw error;

    dns.setServers(fallbackServers);
    await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
  }
}

/**
 * Pozostałości po usuniętej integracji PayU. `extOrderId_1` jest UNIQUE, a
 * dokumenty Payment tworzone przez Stripe nie mają tego pola — druga płatność
 * w bazie kończyła się `E11000 dup key { extOrderId: null }`, webhook Stripe
 * zwracał 500 i klient płacił, nie dostając dostępu. Mongoose dokłada brakujące
 * indeksy, ale nigdy nie kasuje zbędnych, więc robimy to tutaj.
 */
const OBSOLETE_INDEXES: Array<{ collection: string; index: string }> = [
  { collection: "payments", index: "extOrderId_1" },
  { collection: "payments", index: "payuOrderId_1" },
];

async function dropObsoleteIndexes(connection: typeof mongoose) {
  const db = connection.connection.db;
  if (!db) return;
  for (const { collection, index } of OBSOLETE_INDEXES) {
    try {
      await db.collection(collection).dropIndex(index);
    } catch {
      // Indeks już nie istnieje albo kolekcja jeszcze nie powstała — nie ma
      // czego czyścić. Awaria czyszczenia nie może blokować połączenia.
    }
  }
}

export function mongoConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (cache.connection) return cache.connection;

  if (!cache.promise) {
    cache.promise = prepareMongoSrvDns(uri)
      .then(() => mongoose.connect(uri, {
        dbName: process.env.MONGODB_DB || "warstwowe_saas",
        bufferCommands: false,
        maxPoolSize: 10,
      }))
      .then(async (connection) => {
        await dropObsoleteIndexes(connection);
        return connection;
      });
  }

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}
