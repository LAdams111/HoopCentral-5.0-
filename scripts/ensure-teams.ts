import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { eq } from "drizzle-orm";
import { NBA_TEAMS_WITH_SLUGS } from "../server/src/data/nba-teams.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const WNBA_TEAMS = [
  {
    abbrev: "IND",
    name: "Indiana Fever",
    slug: "indiana-fever",
    leagueSlug: "wnba",
  },
] as const;

export async function ensureLeagueTeams() {
  const { closeDatabaseConnection, db } = await import("../server/src/db/index.js");
  const schema = await import("../server/src/db/schema/index.js");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Skipping team ensure.");
    return;
  }

  const leagueMap = new Map<string, number>();
  for (const league of [
    { slug: "nba", name: "NBA" },
    { slug: "wnba", name: "WNBA" },
  ]) {
    const [existing] = await db
      .select()
      .from(schema.leagues)
      .where(eq(schema.leagues.slug, league.slug))
      .limit(1);

    if (existing) {
      leagueMap.set(league.slug, existing.id);
      continue;
    }

    const [created] = await db
      .insert(schema.leagues)
      .values({ slug: league.slug, name: league.name })
      .returning();
    leagueMap.set(league.slug, created.id);
  }

  const allTeams = [
    ...NBA_TEAMS_WITH_SLUGS.map((team) => ({
      ...team,
      leagueSlug: "nba" as const,
    })),
    ...WNBA_TEAMS,
  ];

  let added = 0;
  for (const team of allTeams) {
    const leagueId = leagueMap.get(team.leagueSlug);
    if (!leagueId) continue;

    const [existing] = await db
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.slug, team.slug))
      .limit(1);

    if (existing) continue;

    await db.insert(schema.teams).values({
      name: team.name,
      abbreviation: team.abbrev,
      slug: team.slug,
      leagueId,
    });
    added += 1;
  }

  if (added > 0) {
    console.log(`Ensured league teams: added ${added} missing team(s).`);
  }

  await closeDatabaseConnection();
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  ensureLeagueTeams().catch((err) => {
    console.error("Ensure teams failed:", err);
    process.exit(1);
  });
}
