import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const { closeDatabaseConnection } = await import("../server/src/db/index.js");
  const { findSeedBalldontlieDuplicates, mergePlayerInto } = await import(
    "../server/src/services/merge-players.service.js"
  );

  const pairs = await findSeedBalldontlieDuplicates();
  if (pairs.length === 0) {
    console.log("No seed/balldontlie duplicate pairs found.");
    await closeDatabaseConnection();
    return;
  }

  console.log(`Found ${pairs.length} duplicate pair(s):`);
  for (const pair of pairs) {
    console.log(
      `  ${pair.displayName}: seed #${pair.seedPlayerId} (${pair.seedSeasons} seasons) -> keep balldontlie #${pair.balldontliePlayerId} (${pair.balldontlieSeasons} seasons)`,
    );
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    await closeDatabaseConnection();
    return;
  }

  console.log("");
  for (const pair of pairs) {
    const result = await mergePlayerInto(pair.seedPlayerId, pair.balldontliePlayerId);
    console.log(
      `Merged ${result.displayName}: removed #${result.removedPlayerId}, kept #${result.keptPlayerId}, +${result.profileViewsTransferred} views${result.slugTransferred ? ", canonical slug restored" : ""}`,
    );
  }

  await closeDatabaseConnection();
  console.log("\nDone.");
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    console.error("Merge failed:", err);
    process.exit(1);
  });
}
