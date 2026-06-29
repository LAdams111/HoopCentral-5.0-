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
import { resolveOperationalIngestLeague } from "../utils/league-resolution.js";
import { MENS_NCAA_SOURCES, USPORTS_SOURCES } from "../utils/league-slug.js";
import { normalizeNcaaTeamForIngest } from "../utils/ncaa-team-aliases.js";
import { normalizeUsportsTeamForIngest, UsportsTeamRejectedError } from "../utils/usports-team-aliases.js";
import { sanitizeHeadshotUrl } from "../utils/headshot.js";
import { findOrCreatePlayerByIdentity } from "./player-identity.service.js";
import {
  isPostgresTransientError,
  isPostgresUniqueViolation,
} from "../utils/postgres.js";

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
    fieldGoalPct?: number | null;
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
      fieldGoalPct: optionalNumber(statsObj.fieldGoalPct, "stats.fieldGoalPct"),
    },
  };
}

async function findOrCreateLeague(
  database: DbClient,
  slug: string,
  name: string,
  gender: string | null = null,
): Promise<{ id: number; created: boolean }> {
  const [existing] = await database
    .select()
    .from(leagues)
    .where(eq(leagues.slug, slug))
    .limit(1);

  if (existing) return { id: existing.id, created: false };

  try {
    const [created] = await database
      .insert(leagues)
      .values({ slug, name, gender })
      .returning();
    return { id: created.id, created: true };
  } catch (err) {
    if (!isPostgresUniqueViolation(err)) throw err;
    const [again] = await database
      .select()
      .from(leagues)
      .where(eq(leagues.slug, slug))
      .limit(1);
    if (!again) throw err;
    return { id: again.id, created: false };
  }
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
    .where(and(eq(teams.leagueId, leagueId), eq(teams.slug, slug)))
    .limit(1);

  if (existing) {
    return { id: existing.id, created: false };
  }

  try {
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
  } catch (err) {
    if (!isPostgresUniqueViolation(err)) throw err;
    const [again] = await database
      .select()
      .from(teams)
      .where(and(eq(teams.leagueId, leagueId), eq(teams.slug, slug)))
      .limit(1);
    if (!again) throw err;
    return { id: again.id, created: false };
  }
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

  try {
    const [created] = await database
      .insert(seasons)
      .values({ leagueId, seasonLabel })
      .returning();
    return { id: created.id, created: true };
  } catch (err) {
    if (!isPostgresUniqueViolation(err)) throw err;
    const [again] = await database
      .select()
      .from(seasons)
      .where(and(eq(seasons.leagueId, leagueId), eq(seasons.seasonLabel, seasonLabel)))
      .limit(1);
    if (!again) throw err;
    return { id: again.id, created: false };
  }
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

  try {
    await database.insert(playerStints).values({
      playerId: params.playerId,
      teamId: params.teamId,
      leagueId: params.leagueId,
      seasonId: params.seasonId,
    });
    return true;
  } catch (err) {
    if (isPostgresUniqueViolation(err)) return false;
    throw err;
  }
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
    fieldGoalPct?: number | null;
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
    fieldGoalPct?: string;
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
  if (params.fieldGoalPct != null) {
    values.fieldGoalPct = String(params.fieldGoalPct);
  }

  if (existing) {
    await database
      .update(playerSeasonStats)
      .set(values)
      .where(eq(playerSeasonStats.id, existing.id));
    return false;
  }

  try {
    await database.insert(playerSeasonStats).values({
      playerId: params.playerId,
      teamId: params.teamId,
      leagueId: params.leagueId,
      seasonId: params.seasonId,
      ...values,
    });
    return true;
  } catch (err) {
    if (!isPostgresUniqueViolation(err)) throw err;
    const [raceExisting] = await database
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
    if (!raceExisting) throw err;
    await database
      .update(playerSeasonStats)
      .set(values)
      .where(eq(playerSeasonStats.id, raceExisting.id));
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSeasonIngestPlayerUpdate(
  input: IngestPlayerSeasonInput["player"],
): Partial<typeof players.$inferInsert> {
  const update: Partial<typeof players.$inferInsert> = {
    displayName: input.displayName,
    updatedAt: new Date(),
  };

  if (input.birthDate != null) update.birthDate = input.birthDate;
  if (input.position != null) update.position = input.position;
  if (input.heightCm != null) update.heightCm = input.heightCm;
  if (input.weightKg != null) update.weightKg = input.weightKg;
  if (input.hometown != null) update.hometown = input.hometown;
  if (input.headshotUrl) {
    const sanitized = sanitizeHeadshotUrl(input.headshotUrl);
    if (sanitized) update.headshotUrl = sanitized;
  }

  return update;
}

async function ingestPlayerSeasonOnce(
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
      .set(buildSeasonIngestPlayerUpdate(input.player))
      .where(eq(players.id, identityResult.player.id));

    const resolvedLeague = await resolveOperationalIngestLeague(
      tx,
      input.source,
      input.league.slug,
      input.league.name,
    );

    const leagueResult = await findOrCreateLeague(
      tx,
      resolvedLeague.slug,
      resolvedLeague.name,
      resolvedLeague.gender,
    );

    let teamPayload = MENS_NCAA_SOURCES.has(input.source)
      ? normalizeNcaaTeamForIngest(input.team)
      : input.team;

    if (USPORTS_SOURCES.has(input.source)) {
      try {
        teamPayload = normalizeUsportsTeamForIngest(input.team);
      } catch (error) {
        if (error instanceof UsportsTeamRejectedError) {
          throw new IngestValidationError(error.message);
        }
        throw error;
      }
    }

    const teamResult = await findOrCreateTeam(
      tx,
      leagueResult.id,
      teamPayload.slug,
      teamPayload.name,
      teamPayload.abbreviation,
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
      fieldGoalPct: input.stats.fieldGoalPct,
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

export async function ingestPlayerSeason(
  input: IngestPlayerSeasonInput,
): Promise<IngestPlayerSeasonResult> {
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await ingestPlayerSeasonOnce(input);
    } catch (err) {
      if (!isPostgresTransientError(err) || attempt === maxAttempts) {
        throw err;
      }
      await sleep(150 * attempt * attempt);
    }
  }

  throw new Error("ingestPlayerSeason failed after retries");
}
