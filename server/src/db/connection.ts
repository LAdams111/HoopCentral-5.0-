import "../load-env.js";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL is not set. Database queries will fail until it is configured.",
  );
}

function parsePoolMax(): number {
  const raw = process.env.DATABASE_POOL_MAX?.trim();
  if (!raw) return 40;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) || parsed < 1 ? 40 : parsed;
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: parsePoolMax(),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 30_000,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export type DbClient =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

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
