import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

interface VerifyResult {
  players: number;
  identities: number;
  seasonStats: number;
  stints: number;
  duplicateIdentities: number;
  duplicateStats: number;
  duplicateStints: number;
}

async function verify(): Promise<VerifyResult> {
  const { closeDatabaseConnection, db } = await import("../server/src/db/index.js");
  const schema = await import("../server/src/db/schema/index.js");

  const [playerRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.players);
  const [identityRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.playerIdentities);
  const [statsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.playerSeasonStats);
  const [stintRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.playerStints);

  const duplicateIdentityRows = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT source, external_id
      FROM player_identities
      GROUP BY source, external_id
      HAVING COUNT(*) > 1
    ) dupes
  `);

  const duplicateStatsRows = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT player_id, team_id, league_id, season_id
      FROM player_season_stats
      GROUP BY player_id, team_id, league_id, season_id
      HAVING COUNT(*) > 1
    ) dupes
  `);

  const duplicateStintRows = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT player_id, team_id, league_id, season_id
      FROM player_stints
      GROUP BY player_id, team_id, league_id, season_id
      HAVING COUNT(*) > 1
    ) dupes
  `);

  await closeDatabaseConnection();

  return {
    players: playerRow?.count ?? 0,
    identities: identityRow?.count ?? 0,
    seasonStats: statsRow?.count ?? 0,
    stints: stintRow?.count ?? 0,
    duplicateIdentities: duplicateIdentityRows.rows[0]?.count ?? 0,
    duplicateStats: duplicateStatsRows.rows[0]?.count ?? 0,
    duplicateStints: duplicateStintRows.rows[0]?.count ?? 0,
  };
}

function printResult(result: VerifyResult): boolean {
  console.log("=== Ingest Verification ===");
  console.log(`Players:                  ${result.players}`);
  console.log(`Identities:               ${result.identities}`);
  console.log(`Season stats rows:        ${result.seasonStats}`);
  console.log(`Stints:                   ${result.stints}`);
  console.log(`Duplicate identities:     ${result.duplicateIdentities}`);
  console.log(`Duplicate stats rows:     ${result.duplicateStats}`);
  console.log(`Duplicate stints:         ${result.duplicateStints}`);

  const ok =
    result.duplicateIdentities === 0 &&
    result.duplicateStats === 0 &&
    result.duplicateStints === 0;

  console.log(ok ? "\nPASS — no duplicate rows detected." : "\nFAIL — duplicates found.");
  return ok;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const result = await verify();
  const ok = printResult(result);
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
