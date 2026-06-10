import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

type SeedPlayer = {
  slug: string;
  name: string;
  leagueSlug: string;
  teamAbbrev: string;
  position: string;
  birthDate: string;
  hometown: string;
  heightCm: number;
  weightKg: number;
  profileViews: number;
};

const LEAGUES = [
  { slug: "nba", name: "NBA" },
  { slug: "wnba", name: "WNBA" },
] as const;

const TEAMS = [
  { abbrev: "LAL", name: "Los Angeles Lakers", leagueSlug: "nba" },
  { abbrev: "GSW", name: "Golden State Warriors", leagueSlug: "nba" },
  { abbrev: "DEN", name: "Denver Nuggets", leagueSlug: "nba" },
  { abbrev: "SAS", name: "San Antonio Spurs", leagueSlug: "nba" },
  { abbrev: "IND", name: "Indiana Fever", leagueSlug: "wnba" },
] as const;

const SEASON_LABELS = [
  { leagueSlug: "nba", label: "2024-25" },
  { leagueSlug: "wnba", label: "2024" },
] as const;

const SEED_PLAYERS: SeedPlayer[] = [
  {
    slug: "lebron-james",
    name: "LeBron James",
    leagueSlug: "nba",
    teamAbbrev: "LAL",
    position: "Small Forward, Power Forward",
    birthDate: "1984-12-30",
    hometown: "Akron, Ohio",
    heightCm: 206,
    weightKg: 113,
    profileViews: 14029,
  },
  {
    slug: "stephen-curry",
    name: "Stephen Curry",
    leagueSlug: "nba",
    teamAbbrev: "GSW",
    position: "Point Guard",
    birthDate: "1988-03-14",
    hometown: "Akron, Ohio",
    heightCm: 188,
    weightKg: 83,
    profileViews: 15142,
  },
  {
    slug: "nikola-jokic",
    name: "Nikola Jokic",
    leagueSlug: "nba",
    teamAbbrev: "DEN",
    position: "Center",
    birthDate: "1995-02-19",
    hometown: "Sombor, Serbia",
    heightCm: 211,
    weightKg: 129,
    profileViews: 11200,
  },
  {
    slug: "victor-wembanyama",
    name: "Victor Wembanyama",
    leagueSlug: "nba",
    teamAbbrev: "SAS",
    position: "Center, Power Forward",
    birthDate: "2004-01-04",
    hometown: "Le Chesnay, France",
    heightCm: 224,
    weightKg: 95,
    profileViews: 18500,
  },
  {
    slug: "caitlin-clark",
    name: "Caitlin Clark",
    leagueSlug: "wnba",
    teamAbbrev: "IND",
    position: "Point Guard",
    birthDate: "2002-01-22",
    hometown: "West Des Moines, Iowa",
    heightCm: 183,
    weightKg: 77,
    profileViews: 16200,
  },
];

async function seed() {
  const { sql } = await import("drizzle-orm");
  const { closeDatabaseConnection, db, pool } = await import(
    "../server/src/db/index.js"
  );
  const schema = await import("../server/src/db/schema/index.js");

  console.log("Seeding Hoop Central database...");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Skipping seed.");
    process.exit(1);
  }

  let existingCount = 0;
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.players);
    existingCount = row?.count ?? 0;
  } catch (err) {
    console.error(
      "Players table not found. Run migrations first (npm run db:migrate).",
    );
    console.error(err);
    await closeDatabaseConnection();
    process.exit(1);
  }

  if (existingCount > 0 && process.env.FORCE_SEED !== "true") {
    console.log(`Database already has ${existingCount} players. Skipping seed.`);
    console.log("Set FORCE_SEED=true to wipe and re-seed.");
    await closeDatabaseConnection();
    return;
  }

  for (const table of ["players", "seasons", "teams", "leagues"]) {
    await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
  }

  const leagueMap = new Map<string, number>();
  for (const league of LEAGUES) {
    const [row] = await db
      .insert(schema.leagues)
      .values({ slug: league.slug, name: league.name })
      .returning();
    leagueMap.set(league.slug, row.id);
  }

  const teamMap = new Map<string, number>();
  for (const team of TEAMS) {
    const [row] = await db
      .insert(schema.teams)
      .values({
        name: team.name,
        abbreviation: team.abbrev,
        leagueId: leagueMap.get(team.leagueSlug)!,
      })
      .returning();
    teamMap.set(team.abbrev, row.id);
  }

  for (const season of SEASON_LABELS) {
    await db.insert(schema.seasons).values({
      leagueId: leagueMap.get(season.leagueSlug)!,
      seasonLabel: season.label,
    });
  }

  for (const player of SEED_PLAYERS) {
    await db.insert(schema.players).values({
      slug: player.slug,
      displayName: player.name,
      currentTeamId: teamMap.get(player.teamAbbrev)!,
      position: player.position,
      birthDate: player.birthDate,
      hometown: player.hometown,
      heightCm: player.heightCm,
      weightKg: player.weightKg,
      profileViews: player.profileViews,
      headshotUrl: "",
    });
  }

  console.log(
    `Seeded ${SEED_PLAYERS.length} players, ${TEAMS.length} teams, ${LEAGUES.length} leagues, ${SEASON_LABELS.length} seasons.`,
  );
  await closeDatabaseConnection();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
