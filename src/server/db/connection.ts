import mongoose from "mongoose";

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

export function mongoConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (cache.connection) return cache.connection;

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || "warstwowe_saas",
      bufferCommands: false,
      maxPoolSize: 10,
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
