#!/usr/bin/env node
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function readArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const hoopPlayerId = Number.parseInt(readArg("--hoop-player-id") ?? "", 10);
  const externalId = readArg("--external-id")?.trim();
  const sources = readArg("--sources")?.split(",").map((s) => s.trim()).filter(Boolean);
  const leagueSlugs = readArg("--league-slugs")?.split(",").map((s) => s.trim()).filter(Boolean);
  const seasonLabels = readArg("--season-labels")?.split(",").map((s) => s.trim()).filter(Boolean);
  const teamSlug = readArg("--team-slug")?.trim();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  if (!hoopPlayerId || !externalId || !sources?.length) {
    console.error(
      "Usage: split-usbasket-identity.ts --hoop-player-id <id> --external-id <usbasketId> --sources src1,src2 [--league-slugs a,b] [--season-labels ...] [--team-slug ...] [--dry-run]",
    );
    process.exit(1);
  }

  const { closeDatabaseConnection } = await import("../server/src/db/index.js");
  const { detachUsbasketIdentityFromPlayer } = await import(
    "../server/src/services/split-usbasket-identity.service.js"
  );

  const input = {
    hoopPlayerId,
    externalId,
    sources,
    removeStats:
      leagueSlugs?.length && seasonLabels?.length
        ? { leagueSlugs, seasonLabels, teamSlug }
        : undefined,
  };

  console.log(JSON.stringify(input, null, 2));

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    await closeDatabaseConnection();
    return;
  }

  const result = await detachUsbasketIdentityFromPlayer(input);
  console.log("\nResult:", result);
  await closeDatabaseConnection();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
