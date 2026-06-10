import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const migrationsFolder = path.resolve(
    __dirname,
    "../server/src/db/migrations",
  );

  if (!fs.existsSync(migrationsFolder)) {
    console.error("Migrations folder not found:", migrationsFolder);
    process.exit(1);
  }

  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const pg = await import("pg");

  console.log("DATABASE_URL: configured");
  console.log("Applying migrations from:", migrationsFolder);

  const pool = new pg.default.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder });
    console.log("Migrations applied successfully.");
  } finally {
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
