/**
 * Update high-school Ontario OSBA team rows to canonical full names (idempotent).
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { and, eq } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import { leagues, teams } from "../server/src/db/schema/index.js";
import {
  CANONICAL_TEAM_NAME_BY_SLUG,
  abbrevFromCanonicalName,
} from "./osba-trillium-canonical-names.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const [hsLeague] = await db.select().from(leagues).where(eq(leagues.slug, "high-school")).limit(1);
  if (!hsLeague) throw new Error("high-school league not found");

  let updated = 0;
  for (const [slug, canonicalName] of Object.entries(CANONICAL_TEAM_NAME_BY_SLUG)) {
    const rows = await db
      .update(teams)
      .set({ name: canonicalName, abbreviation: abbrevFromCanonicalName(canonicalName) })
      .where(and(eq(teams.leagueId, hsLeague.id), eq(teams.slug, slug)))
      .returning({ id: teams.id, name: teams.name });
    if (rows.length > 0) updated += 1;
  }

  console.log(`Applied canonical names to ${updated} OSBA Trillium team rows.`);
  await closeDatabaseConnection();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
