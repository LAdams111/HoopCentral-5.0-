import { and, eq } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import {
  leagues,
  playerSeasonStats,
  playerStints,
  players,
  seasons,
  teams,
} from "../db/schema/index.js";
import { normalizeSlugParam } from "../utils/slug.js";
import { findOrCreatePlayerByIdentity } from "./player-identity.service.js";

export interface IngestPlayerSeasonInput {
  source: string;
  externalId: string;
  player: {
    displayName: string;
    birthDate?: string | null;
    position?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    hometown?: string | null;
    headshotUrl?: string | null;
  };
  league: {
    slug: string;
    name: string;
  };
  team: {
    slug: string;
    name: string;
    abbreviation: string;
  };
  season: {
    label: string;
  };
  stats: {
    gamesPlayed: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    stealsPerGame?: number | null;
    blocksPerGame?: number | null;
  };
}

export interface IngestPlayerSeasonResult {
  ok: true;
  playerId: number;
  created: {
    player: boolean;
    league: boolean;
    team: boolean;
    season: boolean;
    stint: boolean;
    stats: boolean;
  };
}

export class IngestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestValidationError";
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new IngestValidationError(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new IngestValidationError("Expected string value");
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function optionalNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new IngestValidationError(`${field} must be a number`);
  }
  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new IngestValidationError(`${field} is required and must be a number`);
  }
  return value;
}

export function parseIngestPlayerSeasonBody(body: unknown): IngestPlayerSeasonInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new IngestValidationError("Request body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;
  const player = payload.player;
  const league = payload.league;
  const team = payload.team;
  const season = payload.season;
  const stats = payload.stats;

  if (!player || typeof player !== "object" || Array.isArray(player)) {
    throw new IngestValidationError("player is required");
  }
  if (!league || typeof league !== "object" || Array.isArray(league)) {
    throw new IngestValidationError("league is required");
  }
  if (!team || typeof team !== "object" || Array.isArray(team)) {
    throw new IngestValidationError("team is required");
  }
  if (!season || typeof season !== "object" || Array.isArray(season)) {
    throw new IngestValidationError("season is required");
  }
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    throw new IngestValidationError("stats is required");
  }

  const playerObj = player as Record<string, unknown>;
  const leagueObj = league as Record<string, unknown>;
  const teamObj = team as Record<string, unknown>;
  const seasonObj = season as Record<string, unknown>;
  const statsObj = stats as Record<string, unknown>;

  return {
    source: requireString(payload.source, "source"),
    externalId: requireString(payload.externalId, "externalId"),
    player: {
      displayName: requireString(playerObj.displayName, "player.displayName"),
      birthDate: optionalString(playerObj.birthDate),
      position: optionalString(playerObj.position),
      heightCm: optionalNumber(playerObj.heightCm, "player.heightCm"),
      weightKg: optionalNumber(playerObj.weightKg, "player.weightKg"),
      hometown: optionalString(playerObj.hometown),
      headshotUrl: optionalString(playerObj.headshotUrl),
    },
    league: {
      slug: normalizeSlugParam(requireString(leagueObj.slug, "league.slug")),
      name: requireString(leagueObj.name, "league.name"),
    },
    team: {
      slug: normalizeSlugParam(requireString(teamObj.slug, "team.slug")),
      name: requireString(teamObj.name, "team.name"),
      abbreviation: requireString(teamObj.abbreviation, "team.abbreviation"),
    },
    season: {
      label: requireString(seasonObj.label, "season.label"),
    },
    stats: {
      gamesPlayed: requireNumber(statsObj.gamesPlayed, "stats.gamesPlayed"),
      pointsPerGame: requireNumber(statsObj.pointsPerGame, "stats.pointsPerGame"),
      reboundsPerGame: requireNumber(statsObj.reboundsPerGame, "stats.reboundsPerGame"),
      assistsPerGame: requireNumber(statsObj.assistsPerGame, "stats.assistsPerGame"),
      stealsPerGame: optionalNumber(statsObj.stealsPerGame, "stats.stealsPerGame"),
      blocksPerGame: optionalNumber(statsObj.blocksPerGame, "stats.blocksPerGame"),
    },
  };
}

async function findOrCreateLeague(
  database: DbClient,
  slug: string,
  name: string,
): Promise<{ id: number; created: boolean }> {
  const [existing] = await database
    .select()
    .from(leagues)
    .where(eq(leagues.slug, slug))
    .limit(1);

  if (existing) return { id: existing.id, created: false };

  const [created] = await database
    .insert(leagues)
    .values({ slug, name })
    .returning();

  return { id: created.id, created: true };
}

async function findOrCreateTeam(
  database: DbClient,
  leagueId: number,
  slug: string,
  name: string,
  abbreviation: string,
): Promise<{ id: number; created: boolean }> {
  const [existing] = await database
    .select()
    .from(teams)
    .where(eq(teams.slug, slug))
    .limit(1);

  if (existing) {
    if (existing.leagueId !== leagueId) {
      throw new IngestValidationError(
        `Team slug "${slug}" already belongs to a different league`,
      );
    }
    return { id: existing.id, created: false };
  }

  const [created] = await database
    .insert(teams)
    .values({
      slug,
      name,
      abbreviation,
      leagueId,
    })
    .returning();

  return { id: created.id, created: true };
}

async function findOrCreateSeason(
  database: DbClient,
  leagueId: number,
  seasonLabel: string,
): Promise<{ id: number; created: boolean }> {
  const [existing] = await database
    .select()
    .from(seasons)
    .where(and(eq(seasons.leagueId, leagueId), eq(seasons.seasonLabel, seasonLabel)))
    .limit(1);

  if (existing) return { id: existing.id, created: false };

  const [created] = await database
    .insert(seasons)
    .values({ leagueId, seasonLabel })
    .returning();

  return { id: created.id, created: true };
}

async function upsertStint(
  database: DbClient,
  params: {
    playerId: number;
    teamId: number;
    leagueId: number;
    seasonId: number;
  },
): Promise<boolean> {
  const [existing] = await database
    .select({ id: playerStints.id })
    .from(playerStints)
    .where(
      and(
        eq(playerStints.playerId, params.playerId),
        eq(playerStints.teamId, params.teamId),
        eq(playerStints.leagueId, params.leagueId),
        eq(playerStints.seasonId, params.seasonId),
      ),
    )
    .limit(1);

  if (existing) return false;

  await database.insert(playerStints).values({
    playerId: params.playerId,
    teamId: params.teamId,
    leagueId: params.leagueId,
    seasonId: params.seasonId,
  });

  return true;
}

async function upsertSeasonStats(
  database: DbClient,
  params: {
    playerId: number;
    teamId: number;
    leagueId: number;
    seasonId: number;
    gamesPlayed: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    stealsPerGame?: number | null;
    blocksPerGame?: number | null;
  },
): Promise<boolean> {
  const [existing] = await database
    .select({ id: playerSeasonStats.id })
    .from(playerSeasonStats)
    .where(
      and(
        eq(playerSeasonStats.playerId, params.playerId),
        eq(playerSeasonStats.teamId, params.teamId),
        eq(playerSeasonStats.leagueId, params.leagueId),
        eq(playerSeasonStats.seasonId, params.seasonId),
      ),
    )
    .limit(1);

  const values: {
    gamesPlayed: number;
    pointsPerGame: string;
    reboundsPerGame: string;
    assistsPerGame: string;
    stealsPerGame?: string;
    blocksPerGame?: string;
  } = {
    gamesPlayed: params.gamesPlayed,
    pointsPerGame: String(params.pointsPerGame),
    reboundsPerGame: String(params.reboundsPerGame),
    assistsPerGame: String(params.assistsPerGame),
  };

  if (params.stealsPerGame != null) {
    values.stealsPerGame = String(params.stealsPerGame);
  }
  if (params.blocksPerGame != null) {
    values.blocksPerGame = String(params.blocksPerGame);
  }

  if (existing) {
    await database
      .update(playerSeasonStats)
      .set(values)
      .where(eq(playerSeasonStats.id, existing.id));
    return false;
  }

  await database.insert(playerSeasonStats).values({
    playerId: params.playerId,
    teamId: params.teamId,
    leagueId: params.leagueId,
    seasonId: params.seasonId,
    ...values,
  });

  return true;
}

export async function ingestPlayerSeason(
  input: IngestPlayerSeasonInput,
): Promise<IngestPlayerSeasonResult> {
  return db.transaction(async (tx) => {
    const identityResult = await findOrCreatePlayerByIdentity(
      {
        source: input.source,
        externalId: input.externalId,
        displayName: input.player.displayName,
        birthDate: input.player.birthDate,
      },
      tx,
    );

    await tx
      .update(players)
      .set({
        displayName: input.player.displayName,
        birthDate: input.player.birthDate ?? null,
        position: input.player.position ?? null,
        heightCm: input.player.heightCm ?? null,
        weightKg: input.player.weightKg ?? null,
        hometown: input.player.hometown ?? null,
        headshotUrl: input.player.headshotUrl ?? "",
        updatedAt: new Date(),
      })
      .where(eq(players.id, identityResult.player.id));

    const leagueResult = await findOrCreateLeague(tx, input.league.slug, input.league.name);
    const teamResult = await findOrCreateTeam(
      tx,
      leagueResult.id,
      input.team.slug,
      input.team.name,
      input.team.abbreviation,
    );
    const seasonResult = await findOrCreateSeason(tx, leagueResult.id, input.season.label);

    const stintCreated = await upsertStint(tx, {
      playerId: identityResult.player.id,
      teamId: teamResult.id,
      leagueId: leagueResult.id,
      seasonId: seasonResult.id,
    });

    const statsCreated = await upsertSeasonStats(tx, {
      playerId: identityResult.player.id,
      teamId: teamResult.id,
      leagueId: leagueResult.id,
      seasonId: seasonResult.id,
      gamesPlayed: input.stats.gamesPlayed,
      pointsPerGame: input.stats.pointsPerGame,
      reboundsPerGame: input.stats.reboundsPerGame,
      assistsPerGame: input.stats.assistsPerGame,
      stealsPerGame: input.stats.stealsPerGame,
      blocksPerGame: input.stats.blocksPerGame,
    });

    return {
      ok: true,
      playerId: identityResult.player.id,
      created: {
        player: identityResult.created,
        league: leagueResult.created,
        team: teamResult.created,
        season: seasonResult.created,
        stint: stintCreated,
        stats: statsCreated,
      },
    };
  });
}
