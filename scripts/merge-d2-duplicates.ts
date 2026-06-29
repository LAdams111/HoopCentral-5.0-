import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function readArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function parsePair(value: string): { duplicateId: number; keepId: number } {
  const [duplicateRaw, keepRaw] = value.split(":");
  const duplicateId = Number.parseInt(duplicateRaw ?? "", 10);
  const keepId = Number.parseInt(keepRaw ?? "", 10);
  if (!duplicateId || !keepId) {
    throw new Error(`Invalid --pair value "${value}" (expected duplicateId:keepId)`);
  }
  return { duplicateId, keepId };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const scanOnly = process.argv.includes("--scan");
  const pairArg = readArg("--pair");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const { closeDatabaseConnection } = await import("../server/src/db/index.js");
  const { findD2BalldontlieDuplicates, mergePlayerInto } = await import(
    "../server/src/services/merge-players.service.js"
  );

  if (pairArg) {
    const { duplicateId, keepId } = parsePair(pairArg);
    console.log(
      `Merge duplicate #${duplicateId} into canonical #${keepId}${dryRun ? " (dry run)" : ""}`,
    );

    if (dryRun) {
      await closeDatabaseConnection();
      return;
    }

    const result = await mergePlayerInto(duplicateId, keepId);
    console.log(
      `Merged ${result.displayName}: removed #${result.removedPlayerId}, kept #${result.keptPlayerId}, +${result.profileViewsTransferred} views, ${result.identitiesMoved} identities, ${result.stintsMoved} stints, ${result.statsMoved} stats${result.slugTransferred ? ", canonical slug restored" : ""}`,
    );
    await closeDatabaseConnection();
    return;
  }

  const pairs = await findD2BalldontlieDuplicates();
  if (pairs.length === 0) {
    console.log("No usbasket-ncaa-d2 / balldontlie duplicate pairs found.");
    await closeDatabaseConnection();
    return;
  }

  console.log(`Found ${pairs.length} duplicate pair(s):`);
  for (const pair of pairs) {
    console.log(
      `  ${pair.displayName} (${pair.birthDate}): d2 #${pair.d2PlayerId} (${pair.d2ExternalId}) -> keep balldontlie #${pair.balldontliePlayerId} (${pair.balldontlieExternalId})`,
    );
  }

  if (scanOnly || dryRun) {
    console.log(`\n${scanOnly ? "Scan only" : "Dry run"} — no changes made.`);
    await closeDatabaseConnection();
    return;
  }

  console.log("");
  for (const pair of pairs) {
    const result = await mergePlayerInto(pair.d2PlayerId, pair.balldontliePlayerId);
    console.log(
      `Merged ${result.displayName}: removed #${result.removedPlayerId}, kept #${result.keptPlayerId}, +${result.profileViewsTransferred} views, ${result.identitiesMoved} identities, ${result.stintsMoved} stints, ${result.statsMoved} stats`,
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
