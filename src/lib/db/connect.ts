import "server-only";
import mongoose, { type Mongoose } from "mongoose";
import { env } from "@/lib/env";

export class DatabaseUnavailableError extends Error {
  constructor(message = "The database is not configured or reachable.") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

type MongooseCache = {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  __formSaathiMongoose?: MongooseCache;
};

const cache: MongooseCache = (globalForMongoose.__formSaathiMongoose ??= {
  connection: null,
  promise: null,
});

export async function connectDb(): Promise<Mongoose> {
  if (cache.connection) return cache.connection;
  if (!env.MONGODB_URI) {
    throw new DatabaseUnavailableError("MONGODB_URI is not set.");
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8_000,
        maxPoolSize: 10,
      })
      .catch((error) => {
        cache.promise = null;
        throw error;
      });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}
