import { sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import { parseBirthDate, parseClaimPosition, parseHeightCm, parseWeightKg } from "../utils/claim-measurements.js";
import { cmToFeetInches, kgToLbs } from "../utils/format.js";
import { nameToSlug } from "../utils/slug.js";
import { getAuthUser } from "./auth.js";

export const coachRouter = Router();

function bearerToken(header: string | undefined): string {
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

type OwnedTeam = {
  id: number;
  name: string;
  slug: string;
  abbreviation: string;
  league_id: number;
  league_slug: string;
  league_name: string;
};

function leagueMatch(leagueSlug: string) {
  const league = leagueSlug.toLowerCase();
  return sql`(${league} = '' OR l.slug = ${league} OR (${league} = 'ncaa-m' AND l.slug = 'ncaa'))`;
}

async function ownedTeams(userId: string, slug = "", leagueSlug = ""): Promise<OwnedTeam[]> {
  const result = await db.execute(sql`
    SELECT t.id, t.name, t.slug, t.abbreviation, t.league_id, l.slug AS league_slug, l.name AS league_name
    FROM claim_requests c
    JOIN teams t ON t.slug = c.team_slug
    JOIN leagues l ON l.id = t.league_id AND l.slug = c.league_slug
    WHERE c.user_id = ${userId}
      AND c.kind = 'team-identity'
      AND c.status = 'approved'
      AND (${slug} = '' OR t.slug = ${slug})
      AND ${leagueMatch(leagueSlug)}
    ORDER BY t.name
  `);
  return result.rows as OwnedTeam[];
}

function seasonLabelOk(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return false;
  const start = Number(match[1]);
  const end = Number(match[2]);
  return start >= 1950 && start <= 2100 && end === (start + 1) % 100;
}

async function seasonIdFor(leagueId: number, label: string): Promise<number | null> {
  const found = await db.execute(sql`
    SELECT id FROM seasons WHERE league_id = ${leagueId} AND season_label = ${label} LIMIT 1
  `);
  const id = (found.rows[0] as { id?: number } | undefined)?.id;
  return id ?? null;
}

coachRouter.get("/teams", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }
  const teams = await ownedTeams(user.id);
  res.json({
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      abbreviation: team.abbreviation,
      leagueSlug: team.league_slug,
      leagueName: team.league_name,
    })),
  });
});

coachRouter.get("/teams/:slug", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }
  const slug = clean(req.params.slug, 160).toLowerCase();
  const leagueSlug = clean(req.query.league, 160).toLowerCase();
  const teams = await ownedTeams(user.id, slug, leagueSlug);
  const team = teams[0];
  if (!team) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "This team is not on your account" } });
    return;
  }

  const seasonRows = await db.execute(sql`
    SELECT DISTINCT se.season_label
    FROM seasons se
    WHERE se.league_id = ${team.league_id}
      AND (
        EXISTS (
          SELECT 1 FROM player_season_stats s
          WHERE s.season_id = se.id AND s.team_id = ${team.id}
        )
        OR EXISTS (
          SELECT 1 FROM team_season_records r
          WHERE r.season_id = se.id AND r.team_id = ${team.id}
        )
      )
    ORDER BY se.season_label DESC
  `);
  const seasons = (seasonRows.rows as { season_label: string }[]).map((row) => row.season_label);
  const requested = clean(req.query.season, 20);
  const season = seasons.includes(requested) ? requested : seasons[0] ?? "";

  let wins: number | null = null;
  let losses: number | null = null;
  let players: {
    id: number;
    name: string;
    position: string;
    jerseyNumber: string;
    height: string;
    weight: string;
    hometown: string;
    country: string;
    birthDate: string;
    gamesPlayed: number | null;
    pointsPerGame: string | null;
    reboundsPerGame: string | null;
    assistsPerGame: string | null;
  }[] = [];

  if (season) {
    const record = await db.execute(sql`
      SELECT r.wins, r.losses
      FROM team_season_records r
      JOIN seasons se ON se.id = r.season_id
      WHERE r.team_id = ${team.id} AND se.season_label = ${season}
      LIMIT 1
    `);
    const recordRow = record.rows[0] as { wins?: number; losses?: number } | undefined;
    wins = recordRow?.wins ?? null;
    losses = recordRow?.losses ?? null;

    const roster = await db.execute(sql`
      SELECT p.id, p.display_name, p.position, p.jersey_number, p.height_cm, p.weight_kg,
             p.hometown, p.country, p.birth_date,
             s.games_played, s.points_per_game, s.rebounds_per_game, s.assists_per_game
      FROM player_season_stats s
      JOIN players p ON p.id = s.player_id
      JOIN seasons se ON se.id = s.season_id
      WHERE s.team_id = ${team.id} AND se.season_label = ${season}
      ORDER BY p.display_name
    `);
    players = (roster.rows as {
      id: number;
      display_name: string;
      position: string | null;
      jersey_number: string | null;
      height_cm: number | null;
      weight_kg: number | null;
      hometown: string | null;
      country: string | null;
      birth_date: string | null;
      games_played: number | null;
      points_per_game: string | null;
      rebounds_per_game: string | null;
      assists_per_game: string | null;
    }[]).map((row) => ({
      id: row.id,
      name: row.display_name,
      position: row.position ?? "",
      jerseyNumber: row.jersey_number ?? "",
      height: row.height_cm ? cmToFeetInches(row.height_cm) : "",
      weight: row.weight_kg ? kgToLbs(row.weight_kg) : "",
      hometown: row.hometown ?? "",
      country: row.country ?? "",
      birthDate: row.birth_date ? String(row.birth_date).slice(0, 10) : "",
      gamesPlayed: row.games_played,
      pointsPerGame: row.points_per_game,
      reboundsPerGame: row.rebounds_per_game,
      assistsPerGame: row.assists_per_game,
    }));
  }

  res.json({
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      abbreviation: team.abbreviation,
      leagueSlug: team.league_slug,
      leagueName: team.league_name,
    },
    season,
    seasons,
    record: { wins, losses },
    players,
  });
});

coachRouter.patch("/teams/:slug", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }
  const slug = clean(req.params.slug, 160).toLowerCase();
  const leagueSlug = clean(req.body?.leagueSlug, 160).toLowerCase();
  const teams = await ownedTeams(user.id, slug, leagueSlug);
  const team = teams[0];
  if (!team) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "This team is not on your account" } });
    return;
  }

  const name = clean(req.body?.name, 120);
  const abbreviation = clean(req.body?.abbreviation, 12).toUpperCase();
  if (!name || abbreviation.length < 2) {
    res.status(400).json({ error: { code: "INVALID", message: "Team name and abbreviation are required" } });
    return;
  }
  const season = clean(req.body?.season, 20);
  const winsText = clean(req.body?.wins, 4);
  const lossesText = clean(req.body?.losses, 4);
  const wins = winsText === "" ? null : Number(winsText);
  const losses = lossesText === "" ? null : Number(lossesText);
  if ((wins != null && (!Number.isInteger(wins) || wins < 0 || wins > 100)) || (losses != null && (!Number.isInteger(losses) || losses < 0 || losses > 100))) {
    res.status(400).json({ error: { code: "INVALID", message: "Wins and losses need to be from 0 to 100" } });
    return;
  }

  await db.execute(sql`
    UPDATE teams SET name = ${name}, abbreviation = ${abbreviation} WHERE id = ${team.id}
  `);

  if (season && wins != null && losses != null) {
    const seasonId = await seasonIdFor(team.league_id, season);
    if (!seasonId) {
      res.status(400).json({ error: { code: "INVALID", message: "That season was not found for this team" } });
      return;
    }
    await db.execute(sql`
      INSERT INTO team_season_records (team_id, season_id, wins, losses)
      VALUES (${team.id}, ${seasonId}, ${wins}::int, ${losses}::int)
      ON CONFLICT (team_id, season_id)
      DO UPDATE SET wins = EXCLUDED.wins, losses = EXCLUDED.losses
    `);
  }

  res.json({ ok: true });
});

coachRouter.post("/teams/:slug/seasons", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }
  const slug = clean(req.params.slug, 160).toLowerCase();
  const leagueSlug = clean(req.body?.leagueSlug, 160).toLowerCase();
  const label = clean(req.body?.season, 20);
  const teams = await ownedTeams(user.id, slug, leagueSlug);
  const team = teams[0];
  if (!team) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "This team is not on your account" } });
    return;
  }
  if (!seasonLabelOk(label)) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a season like 2025-26" } });
    return;
  }
  await db.execute(sql`
    INSERT INTO seasons (league_id, season_label)
    VALUES (${team.league_id}, ${label})
    ON CONFLICT (league_id, season_label) DO NOTHING
  `);
  await db.execute(sql`
    INSERT INTO team_season_records (team_id, season_id, wins, losses)
    SELECT ${team.id}, id, 0, 0
    FROM seasons
    WHERE league_id = ${team.league_id} AND season_label = ${label}
    ON CONFLICT (team_id, season_id) DO NOTHING
  `);
  res.json({ ok: true, season: label });
});

function playerFields(body: Record<string, unknown>) {
  const name = clean(body.name, 120);
  const positionText = clean(body.position, 20);
  const position = positionText ? parseClaimPosition(positionText) : "";
  const jersey = clean(body.jerseyNumber, 8);
  const heightText = clean(body.height, 20);
  const weightText = clean(body.weight, 20);
  const hometown = clean(body.hometown, 120);
  const country = clean(body.country, 80);
  const birthText = clean(body.birthDate, 10);
  return { name, positionText, position, jersey, heightText, weightText, hometown, country, birthText };
}

coachRouter.post("/teams/:slug/players", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }
  const slug = clean(req.params.slug, 160).toLowerCase();
  const leagueSlug = clean(req.body?.leagueSlug, 160).toLowerCase();
  const season = clean(req.body?.season, 20);
  const teams = await ownedTeams(user.id, slug, leagueSlug);
  const team = teams[0];
  if (!team) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "This team is not on your account" } });
    return;
  }
  const fields = playerFields(req.body ?? {});
  if (!fields.name) {
    res.status(400).json({ error: { code: "INVALID", message: "Player name is required" } });
    return;
  }
  if (fields.positionText && !fields.position) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a position like PG, SG, SF, PF, or C" } });
    return;
  }
  const heightCm = fields.heightText ? parseHeightCm(fields.heightText) : null;
  if (fields.heightText && heightCm == null) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a height like 6'7\"" } });
    return;
  }
  const weightKg = fields.weightText ? parseWeightKg(fields.weightText) : null;
  if (fields.weightText && weightKg == null) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a weight like 210 lbs" } });
    return;
  }
  const birthDate = fields.birthText ? parseBirthDate(fields.birthText) : null;
  if (fields.birthText && !birthDate) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a birth date like 2004-06-14" } });
    return;
  }
  const seasonId = await seasonIdFor(team.league_id, season);
  if (!seasonId) {
    res.status(400).json({ error: { code: "INVALID", message: "Pick a season before adding a player" } });
    return;
  }

  const playerSlug = `${nameToSlug(fields.name) || "player"}-${team.id}-${Date.now().toString(36)}`.slice(0, 120);
  const created = await db.execute(sql`
    INSERT INTO players (
      slug, display_name, current_team_id, position, height_cm, weight_kg, hometown, country,
      jersey_number, birth_date, headshot_url
    )
    VALUES (
      ${playerSlug},
      ${fields.name},
      ${team.id},
      ${fields.position || null}::text,
      ${heightCm}::int,
      ${weightKg}::int,
      ${fields.hometown || null}::text,
      ${fields.country || null}::text,
      ${fields.jersey || null}::text,
      ${birthDate}::date,
      ''
    )
    RETURNING id
  `);
  const playerId = (created.rows[0] as { id: number }).id;
  const externalId = `coach-${team.id}-${playerId}`;
  await db.execute(sql`
    INSERT INTO player_identities (player_id, league_id, source, external_id)
    VALUES (${playerId}, ${team.league_id}, 'coach-roster', ${externalId})
  `);
  await db.execute(sql`
    INSERT INTO player_season_stats (player_id, team_id, league_id, season_id)
    VALUES (${playerId}, ${team.id}, ${team.league_id}, ${seasonId})
  `);
  await db.execute(sql`
    INSERT INTO player_stints (player_id, team_id, league_id, season_id)
    VALUES (${playerId}, ${team.id}, ${team.league_id}, ${seasonId})
    ON CONFLICT (player_id, team_id, league_id, season_id) DO NOTHING
  `);
  res.json({ ok: true, id: playerId });
});

coachRouter.patch("/teams/:slug/players/:playerId", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }
  const slug = clean(req.params.slug, 160).toLowerCase();
  const leagueSlug = clean(req.body?.leagueSlug, 160).toLowerCase();
  const playerId = Number(req.params.playerId);
  const teams = await ownedTeams(user.id, slug, leagueSlug);
  const team = teams[0];
  if (!team || !Number.isInteger(playerId) || playerId <= 0) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "This player is not on your team" } });
    return;
  }
  const onRoster = await db.execute(sql`
    SELECT 1 FROM player_season_stats WHERE player_id = ${playerId} AND team_id = ${team.id} LIMIT 1
  `);
  if (!onRoster.rows[0]) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "This player is not on your team" } });
    return;
  }
  const fields = playerFields(req.body ?? {});
  if (!fields.name) {
    res.status(400).json({ error: { code: "INVALID", message: "Player name is required" } });
    return;
  }
  if (fields.positionText && !fields.position) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a position like PG, SG, SF, PF, or C" } });
    return;
  }
  const heightCm = fields.heightText ? parseHeightCm(fields.heightText) : null;
  if (fields.heightText && heightCm == null) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a height like 6'7\"" } });
    return;
  }
  const weightKg = fields.weightText ? parseWeightKg(fields.weightText) : null;
  if (fields.weightText && weightKg == null) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a weight like 210 lbs" } });
    return;
  }
  const birthDate = fields.birthText ? parseBirthDate(fields.birthText) : null;
  if (fields.birthText && !birthDate) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a birth date like 2004-06-14" } });
    return;
  }

  await db.execute(sql`
    UPDATE players
    SET
      display_name = ${fields.name},
      position = ${fields.position || null}::text,
      jersey_number = ${fields.jersey || null}::text,
      height_cm = ${heightCm}::int,
      weight_kg = ${weightKg}::int,
      hometown = ${fields.hometown || null}::text,
      country = ${fields.country || null}::text,
      birth_date = ${birthDate}::date,
      updated_at = now()
    WHERE id = ${playerId}
  `);
  res.json({ ok: true });
});

coachRouter.delete("/teams/:slug/players/:playerId", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }
  const slug = clean(req.params.slug, 160).toLowerCase();
  const leagueSlug = clean(req.query.league, 160).toLowerCase();
  const season = clean(req.query.season, 20);
  const playerId = Number(req.params.playerId);
  const teams = await ownedTeams(user.id, slug, leagueSlug);
  const team = teams[0];
  if (!team || !Number.isInteger(playerId) || playerId <= 0 || !season) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "This player is not on your team" } });
    return;
  }
  await db.execute(sql`
    DELETE FROM player_season_stats
    WHERE player_id = ${playerId}
      AND team_id = ${team.id}
      AND season_id = (SELECT id FROM seasons WHERE league_id = ${team.league_id} AND season_label = ${season} LIMIT 1)
  `);
  await db.execute(sql`
    DELETE FROM player_stints
    WHERE player_id = ${playerId}
      AND team_id = ${team.id}
      AND season_id = (SELECT id FROM seasons WHERE league_id = ${team.league_id} AND season_label = ${season} LIMIT 1)
  `);
  res.json({ ok: true });
});
