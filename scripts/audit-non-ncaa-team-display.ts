import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const NCAA_LEAGUE_SLUGS = new Set(["ncaa", "ncaa-m", "ncaa-w", "ncaa-d2"]);

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const { db, closeDatabaseConnection } = await import("../server/src/db/index.js");

  console.log("=== Non-NCAA teams whose abbreviation matches a D1 NCAA ESPN abbrev ===\n");
  const risky = await db.execute(sql`
    SELECT l.slug AS league_slug,
           t.slug,
           t.name,
           t.abbreviation,
           COUNT(pss.id)::int AS player_season_rows
    FROM teams t
    JOIN leagues l ON l.id = t.league_id
    LEFT JOIN player_season_stats pss ON pss.team_id = t.id
    WHERE l.slug NOT IN ('ncaa', 'ncaa-m', 'ncaa-w', 'ncaa-d2')
      AND t.abbreviation IS NOT NULL
      AND LENGTH(TRIM(t.abbreviation)) BETWEEN 2 AND 4
    GROUP BY l.slug, t.id, t.slug, t.name, t.abbreviation
    HAVING COUNT(pss.id) > 0
    ORDER BY l.slug, t.abbreviation, t.name
  `);

  for (const row of risky.rows as Array<{
    league_slug: string;
    slug: string;
    name: string;
    abbreviation: string;
    player_season_rows: number;
  }>) {
    if (NCAA_LEAGUE_SLUGS.has(row.league_slug)) continue;
    console.log(
      `${row.league_slug}: ${row.name} [${row.slug}] abbrev=${row.abbreviation} (${row.player_season_rows} stat rows)`,
    );
  }

  console.log("\n=== CCAA teams (raw DB names — these are the real teams) ===\n");
  const ccaaTeams = await db.execute(sql`
    SELECT t.slug, t.name, t.abbreviation, COUNT(pss.id)::int AS player_season_rows
    FROM teams t
    JOIN leagues l ON l.id = t.league_id
    LEFT JOIN player_season_stats pss ON pss.team_id = t.id
    WHERE l.slug = 'ccaa'
    GROUP BY t.id, t.slug, t.name, t.abbreviation
    ORDER BY t.name
  `);

  for (const row of ccaaTeams.rows as Array<{
    slug: string;
    name: string;
    abbreviation: string;
    player_season_rows: number;
  }>) {
    console.log(`${row.name} [${row.slug}] abbrev=${row.abbreviation ?? "—"} (${row.player_season_rows} stat rows)`);
  }

  console.log("\n=== Duplicate school names within the same league ===\n");
  const dupes = await db.execute(sql`
    SELECT l.slug AS league_slug,
           t.name,
           array_agg(t.slug ORDER BY t.slug) AS slugs,
           COUNT(*)::int AS team_count
    FROM teams t
    JOIN leagues l ON l.id = t.league_id
    GROUP BY l.slug, t.league_id, t.name
    HAVING COUNT(*) > 1
    ORDER BY l.slug, t.name
    LIMIT 50
  `);

  for (const row of dupes.rows as Array<{
    league_slug: string;
    name: string;
    slugs: string[];
    team_count: number;
  }>) {
    console.log(`${row.league_slug}: ${row.name} -> ${row.slugs.join(", ")}`);
  }

  await closeDatabaseConnection();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
