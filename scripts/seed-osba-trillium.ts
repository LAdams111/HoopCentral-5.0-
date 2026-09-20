/**
 * Seed OSBA Trillium Mens teams + rosters (all seasons OSBA publishes) into high-school (Ontario).
 * Idempotent — safe to re-run.
 *
 * Data: scripts/data/osba-trillium-all-seasons.json
 * Refresh data: node scripts/fetch-osba-trillium-rosters.mjs
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
import {
  abbrevFromCanonicalName,
  canonicalTeamName,
} from "./osba-trillium-canonical-names.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

type RosterEntry = {
  teamSlug: string;
  teamName: string;
  jersey: string;
  name: string;
  position: string;
  playerSlug: string;
};

type TeamEntry = { name: string; slug: string; abbreviation: string };

type SeasonBlock = {
  osbaSeasonLabel: string;
  seasonLabel: string;
  sourceUrl: string;
  teams: TeamEntry[];
  roster: RosterEntry[];
};

type SeedPayload = {
  sourceUrl: string;
  division: string;
  association: string;
  province: string;
  seasons: SeasonBlock[];
  teams: TeamEntry[];
};

const HS_LEAGUE_SLUG = "high-school";
const DATA_PATH = path.resolve(__dirname, "data/osba-trillium-all-seasons.json");
const INSERT_CHUNK = 100;

async function main() {
  const payload = JSON.parse(readFileSync(DATA_PATH, "utf8")) as SeedPayload;
  const seasonBlocks = payload.seasons
    .filter((s) => s.roster.length > 0)
    .sort((a, b) => a.seasonLabel.localeCompare(b.seasonLabel));

  if (seasonBlocks.length === 0) {
    throw new Error("No roster data in JSON — run node scripts/fetch-osba-trillium-rosters.mjs");
  }

  const [hsLeague] = await db.select().from(leagues).where(eq(leagues.slug, HS_LEAGUE_SLUG)).limit(1);
  if (!hsLeague) {
    throw new Error(`League ${HS_LEAGUE_SLUG} not found — run db:seed or db:migrate first.`);
  }

  const teamIdBySlug = new Map<string, number>();
  const allTeamSlugs = payload.teams.map((t) => t.slug);
  const existingTeams = await db
    .select()
    .from(teams)
    .where(and(eq(teams.leagueId, hsLeague.id), inArray(teams.slug, allTeamSlugs)));

  for (const row of existingTeams) {
    teamIdBySlug.set(row.slug, row.id);
  }

  for (const team of payload.teams) {
    const name = canonicalTeamName(team.slug, team.name);
    const abbreviation = abbrevFromCanonicalName(name);
    if (teamIdBySlug.has(team.slug)) {
      await db
        .update(teams)
        .set({ name, abbreviation })
        .where(and(eq(teams.leagueId, hsLeague.id), eq(teams.slug, team.slug)));
    }
  }

  const teamsToInsert = payload.teams.filter((team) => !teamIdBySlug.has(team.slug));
  if (teamsToInsert.length > 0) {
    const inserted = await db
      .insert(teams)
      .values(
        teamsToInsert.map((team) => {
          const name = canonicalTeamName(team.slug, team.name);
          return {
            name,
            abbreviation: abbrevFromCanonicalName(name),
            slug: team.slug,
            leagueId: hsLeague.id,
          };
        }),
      )
      .returning();
    for (const row of inserted) {
      teamIdBySlug.set(row.slug, row.id);
    }
  }

  const allPlayerSlugs = [
    ...new Set(seasonBlocks.flatMap((s) => s.roster.map((r) => r.playerSlug))),
  ];
  const playerIdBySlug = new Map<string, number>();

  const existingPlayers = await db
    .select()
    .from(players)
    .where(inArray(players.slug, allPlayerSlugs));
  for (const p of existingPlayers) {
    playerIdBySlug.set(p.slug, p.id);
  }

  const existingOsbaIdentities = await db
    .select()
    .from(playerIdentities)
    .where(
      and(eq(playerIdentities.source, "osba"), inArray(playerIdentities.externalId, allPlayerSlugs)),
    );
  for (const row of existingOsbaIdentities) {
    playerIdBySlug.set(row.externalId, row.playerId);
  }

  let totalNewPlayers = 0;
  let totalStatRows = 0;

  for (const block of seasonBlocks) {
    let [seasonRow] = await db
      .select()
      .from(seasons)
      .where(and(eq(seasons.leagueId, hsLeague.id), eq(seasons.seasonLabel, block.seasonLabel)))
      .limit(1);

    if (!seasonRow) {
      [seasonRow] = await db
        .insert(seasons)
        .values({ leagueId: hsLeague.id, seasonLabel: block.seasonLabel })
        .returning();
    }

    const missingSlugs = block.roster
      .map((r) => r.playerSlug)
      .filter((slug) => !playerIdBySlug.has(slug));
    const uniqueNew = new Map<string, RosterEntry>();
    for (const entry of block.roster) {
      if (missingSlugs.includes(entry.playerSlug) && !uniqueNew.has(entry.playerSlug)) {
        uniqueNew.set(entry.playerSlug, entry);
      }
    }

    const newPlayerRows = [...uniqueNew.values()];
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
              osbaSeason: block.osbaSeasonLabel,
            },
          })),
        )
        .onConflictDoNothing({ target: players.slug })
        .returning({ id: players.id, slug: players.slug });

      for (const row of inserted) {
        playerIdBySlug.set(row.slug, row.id);
      }
    }

    totalNewPlayers += newPlayerRows.length;

    if (newPlayerRows.length > 0) {
      const refetch = await db
        .select({ id: players.id, slug: players.slug })
        .from(players)
        .where(inArray(players.slug, newPlayerRows.map((r) => r.playerSlug)));
      for (const row of refetch) {
        playerIdBySlug.set(row.slug, row.id);
      }
    }

    const knownOsba = new Set(
      (
        await db
          .select({ externalId: playerIdentities.externalId })
          .from(playerIdentities)
          .where(
            and(
              eq(playerIdentities.source, "osba"),
              inArray(playerIdentities.externalId, block.roster.map((r) => r.playerSlug)),
            ),
          )
      ).map((r) => r.externalId),
    );

    const identitiesToInsert = block.roster
      .map((entry) => {
        const playerId = playerIdBySlug.get(entry.playerSlug);
        if (!playerId || knownOsba.has(entry.playerSlug)) return null;
        knownOsba.add(entry.playerSlug);
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

    for (let i = 0; i < identitiesToInsert.length; i += INSERT_CHUNK) {
      await db
        .insert(playerIdentities)
        .values(identitiesToInsert.slice(i, i + INSERT_CHUNK))
        .onConflictDoNothing();
    }

    const statsToInsert = block.roster
      .map((entry) => {
        const playerId = playerIdBySlug.get(entry.playerSlug);
        const teamId = teamIdBySlug.get(entry.teamSlug);
        if (!playerId || !teamId) return null;
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

    totalStatRows += statsToInsert.length;

    const stintsToInsert = statsToInsert.map((row) => ({
      playerId: row.playerId,
      teamId: row.teamId,
      leagueId: hsLeague.id,
      seasonId: seasonRow.id,
    }));

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

    for (const entry of block.roster) {
      const playerId = playerIdBySlug.get(entry.playerSlug);
      const teamId = teamIdBySlug.get(entry.teamSlug);
      if (!playerId || !teamId) continue;
      await db
        .update(players)
        .set({
          currentTeamId: teamId,
          position: entry.position,
          jerseyNumber: entry.jersey,
          updatedAt: new Date(),
        })
        .where(eq(players.id, playerId));
    }

    console.log(
      `  ${block.osbaSeasonLabel} (${block.seasonLabel}): ${block.roster.length} roster rows`,
    );
  }

  const skipped = payload.seasons.filter((s) => s.roster.length === 0);
  console.log(
    `\nOSBA Trillium seed complete: ${payload.teams.length} teams, ${seasonBlocks.length} seasons with data, ${totalNewPlayers} new players, ${totalStatRows} stat rows attempted.`,
  );
  if (skipped.length > 0) {
    console.log(
      `Skipped (OSBA shows "No Roster Found"): ${skipped.map((s) => s.osbaSeasonLabel).join(", ")}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
