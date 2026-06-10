import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../server/src/db/schema/index.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

type SeasonStat = {
  season: string;
  gp: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  fg: number;
};

type SeedPlayer = {
  slug: string;
  name: string;
  teamAbbrev: string;
  position: string;
  birthDate: string;
  hometown: string;
  heightCm: number;
  weightKg: number;
  jersey: number;
  profileViews: number;
  awards?: { name: string; season: string }[];
  stats: SeasonStat[];
  pastTeams?: { abbrev: string; seasons: string[] }[];
};

const NBA_TEAMS = [
  { abbrev: "LAL", slug: "los-angeles-lakers", name: "Los Angeles Lakers", city: "Los Angeles" },
  { abbrev: "GSW", slug: "golden-state-warriors", name: "Golden State Warriors", city: "San Francisco" },
  { abbrev: "BOS", slug: "boston-celtics", name: "Boston Celtics", city: "Boston" },
  { abbrev: "MIA", slug: "miami-heat", name: "Miami Heat", city: "Miami" },
  { abbrev: "CLE", slug: "cleveland-cavaliers", name: "Cleveland Cavaliers", city: "Cleveland" },
  { abbrev: "OKC", slug: "oklahoma-city-thunder", name: "Oklahoma City Thunder", city: "Oklahoma City" },
  { abbrev: "SAS", slug: "san-antonio-spurs", name: "San Antonio Spurs", city: "San Antonio" },
  { abbrev: "DAL", slug: "dallas-mavericks", name: "Dallas Mavericks", city: "Dallas" },
  { abbrev: "PHX", slug: "phoenix-suns", name: "Phoenix Suns", city: "Phoenix" },
  { abbrev: "DEN", slug: "denver-nuggets", name: "Denver Nuggets", city: "Denver" },
  { abbrev: "MIL", slug: "milwaukee-bucks", name: "Milwaukee Bucks", city: "Milwaukee" },
  { abbrev: "NYK", slug: "new-york-knicks", name: "New York Knicks", city: "New York" },
  { abbrev: "MIN", slug: "minnesota-timberwolves", name: "Minnesota Timberwolves", city: "Minneapolis" },
];

const SEED_PLAYERS: SeedPlayer[] = [
  {
    slug: "lebron-james",
    name: "LeBron James",
    teamAbbrev: "LAL",
    position: "Small Forward, Power Forward",
    birthDate: "1984-12-30",
    hometown: "Akron, Ohio",
    heightCm: 206,
    weightKg: 113,
    jersey: 23,
    profileViews: 14029,
    awards: [
      { name: "NBA MVP", season: "2023-24" },
      { name: "All-NBA First Team", season: "2024-25" },
    ],
    pastTeams: [
      { abbrev: "CLE", seasons: ["2003-04", "2004-05", "2005-06", "2006-07", "2007-08", "2008-09", "2009-10", "2014-15", "2015-16", "2016-17", "2017-18"] },
      { abbrev: "MIA", seasons: ["2010-11", "2011-12", "2012-13", "2013-14"] },
    ],
    stats: [
      { season: "2024-25", gp: 70, ppg: 24.4, rpg: 7.8, apg: 8.2, spg: 1.0, bpg: 0.6, fg: 51.3 },
      { season: "2023-24", gp: 71, ppg: 25.7, rpg: 7.3, apg: 8.3, spg: 1.3, bpg: 0.5, fg: 54.0 },
      { season: "2022-23", gp: 55, ppg: 28.9, rpg: 8.3, apg: 6.8, spg: 0.9, bpg: 0.6, fg: 50.0 },
      { season: "2021-22", gp: 56, ppg: 30.3, rpg: 8.2, apg: 6.2, spg: 1.3, bpg: 1.1, fg: 52.4 },
      { season: "2020-21", gp: 45, ppg: 25.0, rpg: 7.7, apg: 7.8, spg: 1.1, bpg: 0.6, fg: 51.3 },
    ],
  },
  {
    slug: "stephen-curry",
    name: "Stephen Curry",
    teamAbbrev: "GSW",
    position: "Point Guard",
    birthDate: "1988-03-14",
    hometown: "Akron, Ohio",
    heightCm: 188,
    weightKg: 83,
    jersey: 30,
    profileViews: 15142,
    awards: [{ name: "NBA MVP", season: "2021-22" }],
    stats: [
      { season: "2024-25", gp: 70, ppg: 24.5, rpg: 4.4, apg: 6.0, spg: 1.1, bpg: 0.4, fg: 45.0 },
      { season: "2023-24", gp: 74, ppg: 26.4, rpg: 4.5, apg: 5.1, spg: 0.7, bpg: 0.4, fg: 45.0 },
      { season: "2022-23", gp: 56, ppg: 29.4, rpg: 6.1, apg: 6.3, spg: 0.9, bpg: 0.4, fg: 49.3 },
    ],
  },
  {
    slug: "kevin-durant",
    name: "Kevin Durant",
    teamAbbrev: "PHX",
    position: "Small Forward, Power Forward",
    birthDate: "1988-09-29",
    hometown: "Washington, D.C.",
    heightCm: 211,
    weightKg: 109,
    jersey: 35,
    profileViews: 13200,
    stats: [
      { season: "2024-25", gp: 62, ppg: 26.6, rpg: 6.0, apg: 4.2, spg: 0.8, bpg: 1.2, fg: 52.7 },
      { season: "2023-24", gp: 75, ppg: 27.1, rpg: 6.6, apg: 5.0, spg: 0.9, bpg: 1.2, fg: 52.3 },
    ],
  },
  {
    slug: "giannis-antetokounmpo",
    name: "Giannis Antetokounmpo",
    teamAbbrev: "MIL",
    position: "Power Forward, Center",
    birthDate: "1994-12-06",
    hometown: "Athens, Greece",
    heightCm: 211,
    weightKg: 110,
    jersey: 34,
    profileViews: 12850,
    awards: [{ name: "NBA MVP", season: "2023-24" }],
    stats: [
      { season: "2024-25", gp: 67, ppg: 30.4, rpg: 11.9, apg: 6.5, spg: 0.9, bpg: 1.2, fg: 61.2 },
      { season: "2023-24", gp: 73, ppg: 30.4, rpg: 11.5, apg: 6.5, spg: 1.2, bpg: 1.1, fg: 61.1 },
    ],
  },
  {
    slug: "luka-doncic",
    name: "Luka Dončić",
    teamAbbrev: "LAL",
    position: "Point Guard, Shooting Guard",
    birthDate: "1999-02-28",
    hometown: "Ljubljana, Slovenia",
    heightCm: 203,
    weightKg: 104,
    jersey: 77,
    profileViews: 13558,
    stats: [
      { season: "2024-25", gp: 50, ppg: 28.1, rpg: 8.3, apg: 7.8, spg: 1.8, bpg: 0.4, fg: 45.7 },
    ],
  },
  {
    slug: "shai-gilgeous-alexander",
    name: "Shai Gilgeous-Alexander",
    teamAbbrev: "OKC",
    position: "Point Guard, Shooting Guard",
    birthDate: "1998-07-12",
    hometown: "Toronto, Ontario",
    heightCm: 198,
    weightKg: 88,
    jersey: 2,
    profileViews: 15108,
    awards: [{ name: "NBA MVP", season: "2024-25" }],
    stats: [
      { season: "2024-25", gp: 76, ppg: 32.7, rpg: 5.0, apg: 6.4, spg: 1.7, bpg: 1.0, fg: 51.9 },
      { season: "2023-24", gp: 75, ppg: 30.1, rpg: 5.5, apg: 6.2, spg: 2.0, bpg: 0.9, fg: 53.9 },
    ],
  },
  {
    slug: "victor-wembanyama",
    name: "Victor Wembanyama",
    teamAbbrev: "SAS",
    position: "Center, Power Forward",
    birthDate: "2004-01-04",
    hometown: "Le Chesnay, France",
    heightCm: 224,
    weightKg: 106,
    jersey: 1,
    profileViews: 15174,
    stats: [
      { season: "2024-25", gp: 46, ppg: 24.3, rpg: 11.0, apg: 3.7, spg: 1.1, bpg: 3.8, fg: 47.6 },
      { season: "2023-24", gp: 71, ppg: 21.4, rpg: 10.6, apg: 3.9, spg: 1.2, bpg: 3.6, fg: 46.8 },
    ],
  },
  {
    slug: "jayson-tatum",
    name: "Jayson Tatum",
    teamAbbrev: "BOS",
    position: "Small Forward, Power Forward",
    birthDate: "1998-03-03",
    hometown: "St. Louis, Missouri",
    heightCm: 203,
    weightKg: 95,
    jersey: 0,
    profileViews: 14200,
    stats: [
      { season: "2024-25", gp: 72, ppg: 26.8, rpg: 8.7, apg: 6.0, spg: 1.1, bpg: 0.5, fg: 45.2 },
      { season: "2023-24", gp: 74, ppg: 26.9, rpg: 8.1, apg: 4.9, spg: 1.0, bpg: 0.6, fg: 47.1 },
    ],
  },
  {
    slug: "nikola-jokic",
    name: "Nikola Jokić",
    teamAbbrev: "DEN",
    position: "Center",
    birthDate: "1995-02-19",
    hometown: "Sombor, Serbia",
    heightCm: 211,
    weightKg: 129,
    jersey: 15,
    profileViews: 13800,
    awards: [
      { name: "NBA MVP", season: "2023-24" },
      { name: "NBA MVP", season: "2021-22" },
    ],
    stats: [
      { season: "2024-25", gp: 70, ppg: 29.6, rpg: 13.7, apg: 10.2, spg: 1.8, bpg: 0.6, fg: 57.6 },
      { season: "2023-24", gp: 79, ppg: 26.4, rpg: 12.4, apg: 9.0, spg: 1.4, bpg: 0.9, fg: 58.3 },
    ],
  },
  {
    slug: "anthony-edwards",
    name: "Anthony Edwards",
    teamAbbrev: "MIN",
    position: "Shooting Guard, Small Forward",
    birthDate: "2001-08-05",
    hometown: "Atlanta, Georgia",
    heightCm: 193,
    weightKg: 102,
    jersey: 5,
    profileViews: 12500,
    stats: [
      { season: "2024-25", gp: 79, ppg: 27.6, rpg: 5.7, apg: 4.5, spg: 1.2, bpg: 0.6, fg: 44.7 },
    ],
  },
  {
    slug: "cooper-flagg",
    name: "Cooper Flagg",
    teamAbbrev: "DAL",
    position: "Small Forward",
    birthDate: "2006-12-21",
    hometown: "Newport, Maine",
    heightCm: 206,
    weightKg: 92,
    jersey: 2,
    profileViews: 16472,
    stats: [
      { season: "2024-25", gp: 35, ppg: 18.2, rpg: 6.8, apg: 4.1, spg: 1.3, bpg: 1.1, fg: 44.5 },
    ],
  },
  {
    slug: "a-ja-wilson",
    name: "A'ja Wilson",
    teamAbbrev: "NYK",
    position: "Center, Power Forward",
    birthDate: "1996-05-02",
    hometown: "Hopkins, South Carolina",
    heightCm: 193,
    weightKg: 88,
    jersey: 22,
    profileViews: 9800,
    stats: [
      { season: "2024-25", gp: 38, ppg: 22.1, rpg: 9.5, apg: 2.8, spg: 1.2, bpg: 2.2, fg: 51.2 },
    ],
  },
];

async function seed() {
  console.log("Seeding Hoop Central database...");

  const tables = [
    "player_awards",
    "player_season_stats",
    "player_stints",
    "player_biographical",
    "players",
    "seasons",
    "teams",
    "leagues",
  ];

  for (const table of tables) {
    await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
  }

  const [league] = await db
    .insert(schema.leagues)
    .values({ slug: "nba", name: "NBA", country: "USA", isActive: 1 })
    .returning();

  const teamMap = new Map<string, number>();
  for (const t of NBA_TEAMS) {
    const [team] = await db
      .insert(schema.teams)
      .values({
        leagueId: league.id,
        slug: t.slug,
        name: t.name,
        abbreviation: t.abbrev,
        city: t.city,
      })
      .returning();
    teamMap.set(t.abbrev, team.id);
  }

  const seasonLabels = new Set<string>();
  for (const p of SEED_PLAYERS) {
    for (const s of p.stats) seasonLabels.add(s.season);
    for (const pt of p.pastTeams ?? []) {
      for (const s of pt.seasons) seasonLabels.add(s);
    }
    for (const a of p.awards ?? []) seasonLabels.add(a.season);
  }

  const seasonMap = new Map<string, number>();
  for (const label of [...seasonLabels].sort()) {
    const [season] = await db
      .insert(schema.seasons)
      .values({ leagueId: league.id, label })
      .returning();
    seasonMap.set(label, season.id);
  }

  for (const p of SEED_PLAYERS) {
    const teamId = teamMap.get(p.teamAbbrev)!;
    const [player] = await db
      .insert(schema.players)
      .values({
        slug: p.slug,
        displayName: p.name,
        currentTeamId: teamId,
        status: "active",
        profileViews: p.profileViews,
        headshotUrl: "",
      })
      .returning();

    await db.insert(schema.playerBiographical).values({
      playerId: player.id,
      birthDate: p.birthDate,
      hometown: p.hometown,
      heightCm: p.heightCm,
      weightKg: p.weightKg,
      position: p.position,
      jerseyNumber: p.jersey,
    });

    const stintKeys = new Set<string>();

    const addStint = async (abbrev: string, seasonLabel: string) => {
      const key = `${abbrev}-${seasonLabel}`;
      if (stintKeys.has(key)) return;
      stintKeys.add(key);
      const tid = teamMap.get(abbrev)!;
      await db.insert(schema.playerStints).values({
        playerId: player.id,
        teamId: tid,
        leagueId: league.id,
        seasonId: seasonMap.get(seasonLabel)!,
        jerseyNumber: String(p.jersey),
        stintType: "standard",
      });
    };

    for (const s of p.stats) {
      await addStint(p.teamAbbrev, s.season);
    }
    for (const pt of p.pastTeams ?? []) {
      for (const s of pt.seasons) {
        await addStint(pt.abbrev, s);
      }
    }

    for (const s of p.stats) {
      const tid = teamMap.get(p.teamAbbrev)!;
      const [stintRow] = await db
        .select()
        .from(schema.playerStints)
        .where(
          and(
            eq(schema.playerStints.playerId, player.id),
            eq(schema.playerStints.teamId, tid),
            eq(schema.playerStints.seasonId, seasonMap.get(s.season)!),
          ),
        )
        .limit(1);

      await db.insert(schema.playerSeasonStats).values({
        playerId: player.id,
        stintId: stintRow?.id,
        seasonId: seasonMap.get(s.season)!,
        leagueId: league.id,
        teamId: tid,
        gamesPlayed: s.gp,
        pointsPerGame: String(s.ppg),
        reboundsPerGame: String(s.rpg),
        assistsPerGame: String(s.apg),
        stealsPerGame: String(s.spg),
        blocksPerGame: String(s.bpg),
        fgPct: String(s.fg),
      });
    }

    for (const a of p.awards ?? []) {
      await db.insert(schema.playerAwards).values({
        playerId: player.id,
        seasonId: seasonMap.get(a.season)!,
        leagueId: league.id,
        awardName: a.name,
      });
    }
  }

  console.log(`Seeded ${SEED_PLAYERS.length} players, ${NBA_TEAMS.length} teams, ${seasonLabels.size} seasons.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
