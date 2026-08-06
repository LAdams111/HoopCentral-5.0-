/** Quick sync: align player_stints with player_season_stats and fix known bad team names. */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { and, eq, sql } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import { leagues, teams } from "../server/src/db/schema/index.js";
import { normalizeSlugParam } from "../server/src/utils/slug.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TEAM_FIXES: Array<{ slug: string; name: string; abbreviation: string }> = [
  {
    slug: "montverde-academy-purple-eagles-fl",
    name: "Montverde Academy Purple Eagles Varsity Boys Basketball",
    abbreviation: "MAPEVBB",
  },
];

async function main(): Promise<void> {
  const [hsLeague] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, "high-school"))
    .limit(1);
  if (!hsLeague) throw new Error("high-school league not found");

  console.log("Deleting duplicate stints where correct team stint already exists…");
  await db.execute(sql`
    DELETE FROM player_stints AS ps
    USING player_season_stats AS pss, player_stints AS keep
    WHERE ps.player_id = pss.player_id
      AND ps.season_id = pss.season_id
      AND ps.league_id = pss.league_id
      AND ps.team_id != pss.team_id
      AND pss.league_id = ${hsLeague.id}
      AND keep.player_id = pss.player_id
      AND keep.team_id = pss.team_id
      AND keep.league_id = pss.league_id
      AND keep.season_id = pss.season_id
      AND keep.id != ps.id
  `);

  console.log("Syncing stints to match season stats…");
  const stintSync = await db.execute(sql`
    UPDATE player_stints AS ps
    SET team_id = pss.team_id
    FROM player_season_stats AS pss
    WHERE ps.player_id = pss.player_id
      AND ps.season_id = pss.season_id
      AND ps.league_id = pss.league_id
      AND ps.team_id != pss.team_id
      AND pss.league_id = ${hsLeague.id}
  `);
  console.log(`Stints synced: ${Number(stintSync.rowCount ?? 0).toLocaleString()}`);

  for (const fix of TEAM_FIXES) {
    const slug = normalizeSlugParam(fix.slug);
    const updated = await db
      .update(teams)
      .set({ name: fix.name, abbreviation: fix.abbreviation })
      .where(and(eq(teams.leagueId, hsLeague.id), eq(teams.slug, slug)))
      .returning({ id: teams.id });
    console.log(`Team ${slug}: ${updated.length ? "updated" : "unchanged"}`);
  }

  await closeDatabaseConnection();
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
