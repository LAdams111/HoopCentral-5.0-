/**
 * Seed OSBA Trillium Mens (2025-26) teams + rosters into high-school league (Ontario).
 * Idempotent — safe to re-run.
 *
 * Data: scripts/data/osba-trillium-2025-26.json
 * Source: https://www.ontariosba.ca/division/0/33064/rosters
 */
import dotenv from "dotenv";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../server/src/db/index.js";
import {
  leagues,
  playerIdentities,
  playerSeasonStats,
  playerStints,
  players,
  seasons,
  teams,
} from "../server/src/db/schema/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

type SeedPayload = {
  sourceUrl: string;
  division: string;
  association: string;
  province: string;
  seasonLabel: string;
  teams: { name: string; slug: string; abbreviation: string }[];
  roster: {
    teamSlug: string;
    teamName: string;
    jersey: string;
    name: string;
    position: string;
    playerSlug: string;
  }[];
};

const HS_LEAGUE_SLUG = "high-school";
const DATA_PATH = path.resolve(__dirname, "data/osba-trillium-2025-26.json");
const INSERT_CHUNK = 100;

async function main() {
  const payload = JSON.parse(readFileSync(DATA_PATH, "utf8")) as SeedPayload;

  const [hsLeague] = await db.select().from(leagues).where(eq(leagues.slug, HS_LEAGUE_SLUG)).limit(1);
  if (!hsLeague) {
    throw new Error(`League ${HS_LEAGUE_SLUG} not found — run db:seed or db:migrate first.`);
  }

  let [seasonRow] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.leagueId, hsLeague.id), eq(seasons.seasonLabel, payload.seasonLabel)))
    .limit(1);

  if (!seasonRow) {
    [seasonRow] = await db
      .insert(seasons)
      .values({ leagueId: hsLeague.id, seasonLabel: payload.seasonLabel })
      .returning();
  }

  const teamIdBySlug = new Map<string, number>();
  const existingTeams = await db
    .select()
    .from(teams)
    .where(and(eq(teams.leagueId, hsLeague.id), inArray(teams.slug, payload.teams.map((t) => t.slug))));

  for (const row of existingTeams) {
    teamIdBySlug.set(row.slug, row.id);
  }

  const teamsToInsert = payload.teams.filter((team) => !teamIdBySlug.has(team.slug));
  if (teamsToInsert.length > 0) {
    const inserted = await db
      .insert(teams)
      .values(
        teamsToInsert.map((team) => ({
          name: team.name,
          abbreviation: team.abbreviation,
          slug: team.slug,
          leagueId: hsLeague.id,
        })),
      )
      .returning();
    for (const row of inserted) {
      teamIdBySlug.set(row.slug, row.id);
    }
  }

  const playerSlugs = payload.roster.map((r) => r.playerSlug);
  const existingPlayers = await db
    .select()
    .from(players)
    .where(inArray(players.slug, playerSlugs));
  const playerIdBySlug = new Map(existingPlayers.map((p) => [p.slug, p.id]));

  const osbaExternalIds = playerSlugs;
  const existingOsbaIdentities = await db
    .select()
    .from(playerIdentities)
    .where(
      and(eq(playerIdentities.source, "osba"), inArray(playerIdentities.externalId, osbaExternalIds)),
    );
  for (const row of existingOsbaIdentities) {
    if (!playerIdBySlug.has(row.externalId)) {
      playerIdBySlug.set(row.externalId, row.playerId);
    }
  }

  const playersToInsert = payload.roster.filter((entry) => !playerIdBySlug.has(entry.playerSlug));
  const uniqueNewPlayers = new Map<string, (typeof payload.roster)[number]>();
  for (const entry of playersToInsert) {
    if (!uniqueNewPlayers.has(entry.playerSlug)) {
      uniqueNewPlayers.set(entry.playerSlug, entry);
    }
  }

  const newPlayerRows = [...uniqueNewPlayers.values()];
  for (let i = 0; i < newPlayerRows.length; i += INSERT_CHUNK) {
    const chunk = newPlayerRows.slice(i, i + INSERT_CHUNK);
    const inserted = await db
      .insert(players)
      .values(
        chunk.map((entry) => ({
          slug: entry.playerSlug,
          displayName: entry.name,
          currentTeamId: teamIdBySlug.get(entry.teamSlug)!,
          position: entry.position,
          jerseyNumber: entry.jersey,
          hometown: "Ontario, Canada",
          country: "Canada",
          extendedProfile: {
            hsAssociation: payload.association,
            hsDivision: payload.division,
            hsProvince: payload.province,
            osbaSourceUrl: payload.sourceUrl,
          },
        })),
      )
      .onConflictDoNothing({ target: players.slug })
      .returning({ id: players.id, slug: players.slug });

    for (const row of inserted) {
      playerIdBySlug.set(row.slug, row.id);
    }
  }

  if (playerIdBySlug.size < playerSlugs.length) {
    const refetch = await db
      .select({ id: players.id, slug: players.slug })
      .from(players)
      .where(inArray(players.slug, playerSlugs));
    for (const row of refetch) {
      playerIdBySlug.set(row.slug, row.id);
    }
  }

  const identitiesToInsert = payload.roster
    .map((entry) => {
      const playerId = playerIdBySlug.get(entry.playerSlug);
      if (!playerId) return null;
      return {
        playerId,
        leagueId: hsLeague.id,
        source: "osba" as const,
        externalId: entry.playerSlug,
      };
    })
    .filter(Boolean) as {
    playerId: number;
    leagueId: number;
    source: string;
    externalId: string;
  }[];

  const knownOsba = new Set(existingOsbaIdentities.map((r) => r.externalId));
  const newIdentities = identitiesToInsert.filter((row) => !knownOsba.has(row.externalId));
  for (let i = 0; i < newIdentities.length; i += INSERT_CHUNK) {
    await db
      .insert(playerIdentities)
      .values(newIdentities.slice(i, i + INSERT_CHUNK))
      .onConflictDoNothing();
  }

  const statKeys = new Set<string>();
  const existingStats = await db
    .select({
      playerId: playerSeasonStats.playerId,
      teamId: playerSeasonStats.teamId,
    })
    .from(playerSeasonStats)
    .where(
      and(
        eq(playerSeasonStats.seasonId, seasonRow.id),
        inArray(playerSeasonStats.teamId, [...teamIdBySlug.values()]),
      ),
    );
  for (const row of existingStats) {
    statKeys.add(`${row.playerId}:${row.teamId}`);
  }

  const statsToInsert = payload.roster
    .map((entry) => {
      const playerId = playerIdBySlug.get(entry.playerSlug);
      const teamId = teamIdBySlug.get(entry.teamSlug);
      if (!playerId || !teamId) return null;
      const key = `${playerId}:${teamId}`;
      if (statKeys.has(key)) return null;
      statKeys.add(key);
      return {
        playerId,
        seasonId: seasonRow.id,
        leagueId: hsLeague.id,
        teamId,
        gamesPlayed: 0,
        pointsPerGame: "0",
        reboundsPerGame: "0",
        assistsPerGame: "0",
        stealsPerGame: "0",
        blocksPerGame: "0",
      };
    })
    .filter(Boolean) as {
    playerId: number;
    seasonId: number;
    leagueId: number;
    teamId: number;
    gamesPlayed: number;
    pointsPerGame: string;
    reboundsPerGame: string;
    assistsPerGame: string;
    stealsPerGame: string;
    blocksPerGame: string;
  }[];

  for (let i = 0; i < statsToInsert.length; i += INSERT_CHUNK) {
    await db
      .insert(playerSeasonStats)
      .values(statsToInsert.slice(i, i + INSERT_CHUNK))
      .onConflictDoNothing({
        target: [
          playerSeasonStats.playerId,
          playerSeasonStats.teamId,
          playerSeasonStats.seasonId,
          playerSeasonStats.leagueId,
        ],
      });
  }

  const stintKeys = new Set<string>();
  const existingStints = await db
    .select({
      playerId: playerStints.playerId,
      teamId: playerStints.teamId,
    })
    .from(playerStints)
    .where(
      and(
        eq(playerStints.seasonId, seasonRow.id),
        inArray(playerStints.teamId, [...teamIdBySlug.values()]),
      ),
    );
  for (const row of existingStints) {
    stintKeys.add(`${row.playerId}:${row.teamId}`);
  }

  const stintsToInsert = statsToInsert
    .map((row) => {
      const key = `${row.playerId}:${row.teamId}`;
      if (stintKeys.has(key)) return null;
      stintKeys.add(key);
      return {
        playerId: row.playerId,
        teamId: row.teamId,
        leagueId: hsLeague.id,
        seasonId: seasonRow.id,
      };
    })
    .filter(Boolean) as {
    playerId: number;
    teamId: number;
    leagueId: number;
    seasonId: number;
  }[];

  for (let i = 0; i < stintsToInsert.length; i += INSERT_CHUNK) {
    await db
      .insert(playerStints)
      .values(stintsToInsert.slice(i, i + INSERT_CHUNK))
      .onConflictDoNothing({
        target: [
          playerStints.playerId,
          playerStints.teamId,
          playerStints.leagueId,
          playerStints.seasonId,
        ],
      });
  }

  console.log(
    `OSBA Trillium seed complete: ${payload.teams.length} teams, ${payload.roster.length} roster rows, ${newPlayerRows.length} new players.`,
  );
  console.log(`Browse: Leagues → High School (Boys) → Canada → Ontario → pick a team → season 2025-26`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
