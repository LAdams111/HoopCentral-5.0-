import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const { closeDatabaseConnection } = await import("../server/src/db/index.js");
  const { runDailySyntheticProfileViews } = await import(
    "../server/src/services/player.service.js"
  );

  const result = await runDailySyntheticProfileViews();
  if (result.skipped) {
    console.log("Daily synthetic profile views already ran today — skipped.");
  } else {
    console.log(`Added 1–6 synthetic views for ${result.updated.toLocaleString()} player(s).`);
  }

  await closeDatabaseConnection();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
