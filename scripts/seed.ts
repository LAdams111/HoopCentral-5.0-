import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { NBA_TEAMS_WITH_SLUGS } from "../server/src/data/nba-teams.js";
import { ensureLeagueTeams } from "./ensure-teams.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

type SeasonStat = {
  season: string;
  startDate: string;
  endDate: string;
  gp: number;
  ppg: number;
  rpg: number;
  apg: number;
};

type SeedPlayer = {
  slug: string;
  name: string;
  leagueSlug: string;
  teamAbbrev: string;
  externalId: string;
  position: string;
  birthDate: string;
  hometown: string;
  heightCm: number;
  weightKg: number;
  profileViews: number;
  stats: SeasonStat[];
};

const LEAGUES = [
  { slug: "nba", name: "NBA" },
  { slug: "wnba", name: "WNBA" },
] as const;

const TEAMS = [
  ...NBA_TEAMS_WITH_SLUGS.map((team) => ({
    abbrev: team.abbrev,
    name: team.name,
    slug: team.slug,
    leagueSlug: "nba" as const,
  })),
  {
    abbrev: "IND",
    name: "Indiana Fever",
    slug: "indiana-fever",
    leagueSlug: "wnba" as const,
  },
] as const;

const SEASON_LABELS = [
  { leagueSlug: "nba", label: "2023-24" },
  { leagueSlug: "nba", label: "2024-25" },
  { leagueSlug: "wnba", label: "2024" },
  { leagueSlug: "wnba", label: "2025" },
] as const;

const SEED_PLAYERS: SeedPlayer[] = [
  {
    slug: "lebron-james",
    name: "LeBron James",
    leagueSlug: "nba",
    teamAbbrev: "LAL",
    externalId: "2544",
    position: "Small Forward, Power Forward",
    birthDate: "1984-12-30",
    hometown: "Akron, Ohio",
    heightCm: 206,
    weightKg: 113,
    profileViews: 14029,
    stats: [
      {
        season: "2024-25",
        startDate: "2024-10-01",
        endDate: "2025-06-30",
        gp: 70,
        ppg: 24.4,
        rpg: 7.8,
        apg: 8.2,
      },
      {
        season: "2023-24",
        startDate: "2023-10-01",
        endDate: "2024-06-30",
        gp: 71,
        ppg: 25.7,
        rpg: 7.3,
        apg: 8.3,
      },
    ],
  },
  {
    slug: "stephen-curry",
    name: "Stephen Curry",
    leagueSlug: "nba",
    teamAbbrev: "GSW",
    externalId: "201939",
    position: "Point Guard",
    birthDate: "1988-03-14",
    hometown: "Akron, Ohio",
    heightCm: 188,
    weightKg: 83,
    profileViews: 15142,
    stats: [
      {
        season: "2024-25",
        startDate: "2024-10-01",
        endDate: "2025-06-30",
        gp: 70,
        ppg: 24.5,
        rpg: 4.4,
        apg: 6.0,
      },
      {
        season: "2023-24",
        startDate: "2023-10-01",
        endDate: "2024-06-30",
        gp: 74,
        ppg: 26.4,
        rpg: 4.5,
        apg: 5.1,
      },
    ],
  },
  {
    slug: "nikola-jokic",
    name: "Nikola Jokic",
    leagueSlug: "nba",
    teamAbbrev: "DEN",
    externalId: "203999",
    position: "Center",
    birthDate: "1995-02-19",
    hometown: "Sombor, Serbia",
    heightCm: 211,
    weightKg: 129,
    profileViews: 11200,
    stats: [
      {
        season: "2024-25",
        startDate: "2024-10-01",
        endDate: "2025-06-30",
        gp: 70,
        ppg: 29.6,
        rpg: 12.7,
        apg: 10.2,
      },
      {
        season: "2023-24",
        startDate: "2023-10-01",
        endDate: "2024-06-30",
        gp: 79,
        ppg: 26.4,
        rpg: 12.4,
        apg: 9.0,
      },
    ],
  },
  {
    slug: "victor-wembanyama",
    name: "Victor Wembanyama",
    leagueSlug: "nba",
    teamAbbrev: "SAS",
    externalId: "1641705",
    position: "Center, Power Forward",
    birthDate: "2004-01-04",
    hometown: "Le Chesnay, France",
    heightCm: 224,
    weightKg: 95,
    profileViews: 18500,
    stats: [
      {
        season: "2024-25",
        startDate: "2024-10-01",
        endDate: "2025-06-30",
        gp: 46,
        ppg: 24.3,
        rpg: 11.0,
        apg: 3.7,
      },
      {
        season: "2023-24",
        startDate: "2023-10-01",
        endDate: "2024-06-30",
        gp: 71,
        ppg: 21.4,
        rpg: 10.6,
        apg: 3.9,
      },
    ],
  },
  {
    slug: "caitlin-clark",
    name: "Caitlin Clark",
    leagueSlug: "wnba",
    teamAbbrev: "IND",
    externalId: "clark-ca01w",
    position: "Point Guard",
    birthDate: "2002-01-22",
    hometown: "West Des Moines, Iowa",
    heightCm: 183,
    weightKg: 77,
    profileViews: 16200,
    stats: [
      {
        season: "2025",
        startDate: "2025-05-01",
        endDate: "2025-10-31",
        gp: 38,
        ppg: 18.5,
        rpg: 5.2,
        apg: 7.9,
      },
      {
        season: "2024",
        startDate: "2024-05-01",
        endDate: "2024-10-31",
        gp: 40,
        ppg: 19.2,
        rpg: 5.7,
        apg: 8.4,
      },
    ],
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
  let statCount = 0;
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.players);
    existingCount = row?.count ?? 0;

    const [statRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.playerSeasonStats);
    statCount = statRow?.count ?? 0;
  } catch (err) {
    console.error(
      "Players table not found. Run migrations first (npm run db:migrate).",
    );
    console.error(err);
    await closeDatabaseConnection();
    process.exit(1);
  }

  if (
    existingCount > 0 &&
    statCount > 0 &&
    process.env.FORCE_SEED !== "true"
  ) {
    console.log(
      `Database already has ${existingCount} players and ${statCount} stat rows. Skipping player seed.`,
    );
    console.log("Set FORCE_SEED=true to wipe and re-seed.");
    await closeDatabaseConnection();
    await ensureLeagueTeams();
    return;
  }

  if (existingCount > 0 && statCount === 0) {
    console.log(
      `Database has ${existingCount} players but no season stats — re-seeding career data.`,
    );
  }

  for (const table of [
    "player_season_stats",
    "player_stints",
    "player_identities",
    "players",
    "seasons",
    "teams",
    "leagues",
  ]) {
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
        slug: team.slug,
        leagueId: leagueMap.get(team.leagueSlug)!,
      })
      .returning();
    teamMap.set(`${team.leagueSlug}:${team.abbrev}`, row.id);
  }

  const seasonMap = new Map<string, number>();
  for (const season of SEASON_LABELS) {
    const key = `${season.leagueSlug}:${season.label}`;
    const [row] = await db
      .insert(schema.seasons)
      .values({
        leagueId: leagueMap.get(season.leagueSlug)!,
        seasonLabel: season.label,
      })
      .returning();
    seasonMap.set(key, row.id);
  }

  for (const player of SEED_PLAYERS) {
    const leagueId = leagueMap.get(player.leagueSlug)!;
    const teamId = teamMap.get(`${player.leagueSlug}:${player.teamAbbrev}`)!;

    const [playerRow] = await db
      .insert(schema.players)
      .values({
        slug: player.slug,
        displayName: player.name,
        currentTeamId: teamId,
        position: player.position,
        birthDate: player.birthDate,
        hometown: player.hometown,
        heightCm: player.heightCm,
        weightKg: player.weightKg,
        profileViews: player.profileViews,
        headshotUrl: "",
      })
      .returning();

    await db.insert(schema.playerIdentities).values({
      playerId: playerRow.id,
      leagueId,
      source: "seed",
      externalId: player.externalId,
    });

    for (const stat of player.stats) {
      const seasonKey = `${player.leagueSlug}:${stat.season}`;
      const seasonId = seasonMap.get(seasonKey)!;

      await db.insert(schema.playerStints).values({
        playerId: playerRow.id,
        teamId,
        leagueId,
        seasonId,
        startDate: stat.startDate,
        endDate: stat.endDate,
      });

      await db.insert(schema.playerSeasonStats).values({
        playerId: playerRow.id,
        seasonId,
        leagueId,
        teamId,
        gamesPlayed: stat.gp,
        pointsPerGame: String(stat.ppg),
        reboundsPerGame: String(stat.rpg),
        assistsPerGame: String(stat.apg),
      });
    }
  }

  console.log(
    `Seeded ${SEED_PLAYERS.length} players with career stints and season stats (2 seasons each).`,
  );
  await closeDatabaseConnection();
  await ensureLeagueTeams();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
