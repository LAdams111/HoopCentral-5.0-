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
  const {
    findNbaBalldontlieSplitDuplicates,
    mergePlayerInto,
  } = await import("../server/src/services/merge-players.service.js");

  const pairs = await findNbaBalldontlieSplitDuplicates();
  if (pairs.length === 0) {
    console.log("No split NBA player records found.");
    await closeDatabaseConnection();
    return;
  }

  console.log(`Found ${pairs.length} split NBA profile(s):`);
  for (const pair of pairs) {
    console.log(
      `  ${pair.displayName}: keep #${pair.keepPlayerId} (${pair.keepIdentities} ids, ${pair.keepStats} stats) <- merge #${pair.sparsePlayerId} (${pair.sparseIdentities} ids, ${pair.sparseStats} stats)`,
    );
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    await closeDatabaseConnection();
    return;
  }

  console.log("");
  for (const pair of pairs) {
    const result = await mergePlayerInto(pair.sparsePlayerId, pair.keepPlayerId);
    console.log(
      `Merged #${result.removedPlayerId} into #${result.keptPlayerId} (${result.displayName}): +${result.identitiesMoved} identities, +${result.statsMoved} stats, +${result.stintsMoved} stints`,
    );
  }

  await closeDatabaseConnection();
  console.log(`\nDone. Merged ${pairs.length} player(s).`);
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch(async (err) => {
    console.error("Merge failed:", err);
    process.exit(1);
  });
}
