import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL is not set. Database queries will fail until it is configured.",
  );
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!process.env.DATABASE_URL) {
    return { connected: false, error: "DATABASE_URL is not configured" };
  }

  const start = Date.now();

  try {
    await db.execute(sql`SELECT 1`);
    return { connected: true, latencyMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { connected: false, error: message, latencyMs: Date.now() - start };
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
}
