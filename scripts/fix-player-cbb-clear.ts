import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { closeDatabaseConnection } from "../server/src/db/index.js";
import { clearPlayerNcaaSeasons } from "../server/src/services/ingest-clear-ncaa.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
  const playerId = Number(process.argv[2] ?? "191");
  const result = await clearPlayerNcaaSeasons({ playerId });
  console.log(result);
  await closeDatabaseConnection();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
