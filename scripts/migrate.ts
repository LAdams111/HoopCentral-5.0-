import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import {
  closeDatabaseConnection,
  db,
} from "../server/src/db/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const migrationsFolder = path.resolve(
    __dirname,
    "../server/src/db/migrations",
  );

  console.log("Applying migrations from:", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully.");
  await closeDatabaseConnection();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
