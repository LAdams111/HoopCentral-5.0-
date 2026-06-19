import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { eq, sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
  const { db, closeDatabaseConnection } = await import("../server/src/db/index.js");
  const { teams, playerSeasonStats, leagues } = await import("../server/src/db/schema/index.js");
  const { resolveNcaaTeamSlugVariants } = await import(
    "../server/src/utils/ncaa-team-alias-report.js"
  );
  const { getTeamRoster } = await import("../server/src/services/team.service.js");

  const [league] = await db.select().from(leagues).where(eq(leagues.slug, "ncaa")).limit(1);
  if (!league) {
    console.log("No ncaa league");
    return;
  }

  const dupes = await db.execute(sql`
    SELECT t.name, array_agg(t.slug ORDER BY t.slug) as slugs, array_agg(t.id ORDER BY t.id) as ids
    FROM teams t
    WHERE t.league_id = ${league.id}
    GROUP BY t.league_id, t.name
    HAVING count(*) > 1
    ORDER BY t.name
  `);

  console.log("=== Duplicate NCAA team names ===");
  for (const row of dupes.rows as Array<{ name: string; slugs: string[]; ids: number[] }>) {
    console.log(`${row.name}: ${row.slugs.join(", ")}`);
  }

  const allTeams = await db
    .select({ id: teams.id, slug: teams.slug, name: teams.name })
    .from(teams)
    .where(eq(teams.leagueId, league.id));

  const slugToTeam = new Map(allTeams.map((team) => [team.slug, team]));
  const checked = new Set<string>();
  const aliasGroups: Array<{ variants: string[]; ids: number[] }> = [];

  for (const team of allTeams) {
    const variants = resolveNcaaTeamSlugVariants(team.slug);
    const key = [...variants].sort().join("|");
    if (checked.has(key)) continue;
    checked.add(key);

    const matched = variants.map((variant) => slugToTeam.get(variant)).filter(Boolean);
    if (matched.length > 1) {
      aliasGroups.push({ variants, ids: matched.map((entry) => entry!.id) });
    }
  }

  console.log("\n=== Alias variant groups with multiple DB rows ===");
  for (const group of aliasGroups) {
    const statCounts = await Promise.all(
      group.ids.map(async (id) => {
        const [row] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(playerSeasonStats)
          .where(eq(playerSeasonStats.teamId, id));
        const team = allTeams.find((entry) => entry.id === id);
        return { slug: team?.slug, stats: row?.count ?? 0 };
      }),
    );
    console.log(`${group.variants.join(" / ")}`, statCounts);
  }

  console.log("\n=== Spot-check: players missing from team roster link ===");
  const sampleStats = await db.execute(sql`
    SELECT p.display_name, t.slug as team_slug, s.season_label, pss.player_id
    FROM player_season_stats pss
    JOIN players p ON p.id = pss.player_id
    JOIN teams t ON t.id = pss.team_id
    JOIN seasons s ON s.id = pss.season_id
    JOIN leagues l ON l.id = pss.league_id
    WHERE l.slug = 'ncaa'
    ORDER BY random()
    LIMIT 500
  `);

  const missing: string[] = [];
  for (const row of sampleStats.rows as Array<{
    display_name: string;
    team_slug: string;
    season_label: string;
    player_id: number;
  }>) {
    const roster = await getTeamRoster(row.team_slug, row.season_label, "ncaa-m");
    const found = roster?.players.some((player) => player.id === row.player_id);
    if (!found) {
      missing.push(`${row.display_name} | ${row.team_slug} | ${row.season_label}`);
    }
  }

  console.log(`Missing from roster in 500 random NCAA stat rows: ${missing.length}`);
  for (const entry of missing.slice(0, 50)) {
    console.log(`  ${entry}`);
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
