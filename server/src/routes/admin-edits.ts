import { sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import { parseBirthDate, parseHeightCm, parseWeightKg } from "../utils/claim-measurements.js";
import { formatPosition } from "../utils/position.js";
import { getAuthUser } from "./auth.js";

export const adminEditsRouter = Router();

function bearerToken(header: string | undefined): string {
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function optionalStat(value: unknown, max: number): number | null | undefined {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) return undefined;
  return n;
}

adminEditsRouter.patch("/players/:id", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user?.isAdmin) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const id = Number(req.params.id);
  const name = clean(req.body?.name, 120);
  if (!Number.isInteger(id) || id <= 0 || !name) {
    res.status(400).json({ error: { code: "INVALID", message: "Player name is required" } });
    return;
  }

  const positionText = clean(req.body?.position, 20);
  const position = positionText ? formatPosition(positionText).slice(0, 20) : null;
  const heightText = clean(req.body?.height, 20);
  const heightCm = heightText ? parseHeightCm(heightText) : null;
  if (heightText && heightCm == null) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a height like 6'7\"" } });
    return;
  }
  const weightText = clean(req.body?.weight, 20);
  const weightKg = weightText ? parseWeightKg(weightText) : null;
  if (weightText && weightKg == null) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a weight like 210 lbs" } });
    return;
  }
  const birthText = clean(req.body?.birthDate, 10);
  const birthDate = birthText ? parseBirthDate(birthText) : null;
  if (birthText && !birthDate) {
    res.status(400).json({ error: { code: "INVALID", message: "Use a birth date like 2004-06-14" } });
    return;
  }

  const hometown = clean(req.body?.hometown, 120);
  const country = clean(req.body?.country, 80);
  const jersey = clean(req.body?.jerseyNumber, 8);
  const bio = clean(req.body?.bio, 2000);
  const stats = Array.isArray(req.body?.stats) ? req.body.stats : [];

  const parsedStats: {
    id: number;
    games: number | null;
    points: number | null;
    rebounds: number | null;
    assists: number | null;
    steals: number | null;
    blocks: number | null;
    fieldGoal: number | null;
  }[] = [];

  for (const row of stats) {
    const statId = Number(row?.id);
    if (!Number.isInteger(statId) || statId <= 0) {
      res.status(400).json({ error: { code: "INVALID", message: "A stat row is missing" } });
      return;
    }
    const games = optionalStat(row?.gamesPlayed, 200);
    const points = optionalStat(row?.pointsPerGame, 100);
    const rebounds = optionalStat(row?.reboundsPerGame, 100);
    const assists = optionalStat(row?.assistsPerGame, 100);
    const steals = optionalStat(row?.stealsPerGame, 100);
    const blocks = optionalStat(row?.blocksPerGame, 100);
    const fieldGoal = optionalStat(row?.fieldGoalPct, 100);
    if ([games, points, rebounds, assists, steals, blocks, fieldGoal].some((value) => value === undefined)) {
      res.status(400).json({ error: { code: "INVALID", message: "Stat numbers need to be between 0 and 100, games up to 200" } });
      return;
    }
    parsedStats.push({
      id: statId,
      games: games ?? null,
      points: points ?? null,
      rebounds: rebounds ?? null,
      assists: assists ?? null,
      steals: steals ?? null,
      blocks: blocks ?? null,
      fieldGoal: fieldGoal ?? null,
    });
  }

  const found = await db.execute(sql`SELECT id FROM players WHERE id = ${id} LIMIT 1`);
  if (!found.rows[0]) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Player not found" } });
    return;
  }

  await db.execute(sql`
    UPDATE players
    SET
      display_name = ${name},
      position = ${position}::text,
      height_cm = ${heightCm}::int,
      weight_kg = ${weightKg}::int,
      hometown = ${hometown || null}::text,
      country = ${country || null}::text,
      jersey_number = ${jersey || null}::text,
      birth_date = ${birthDate}::date,
      extended_profile = CASE
        WHEN ${bio}::text = '' THEN COALESCE(extended_profile, '{}'::jsonb) - 'bio'
        ELSE COALESCE(extended_profile, '{}'::jsonb) || jsonb_build_object('bio', ${bio}::text)
      END,
      updated_at = now()
    WHERE id = ${id}
  `);

  for (const stat of parsedStats) {
    const updated = await db.execute(sql`
      UPDATE player_season_stats
      SET
        games_played = ${stat.games}::int,
        points_per_game = ${stat.points}::numeric,
        rebounds_per_game = ${stat.rebounds}::numeric,
        assists_per_game = ${stat.assists}::numeric,
        steals_per_game = ${stat.steals}::numeric,
        blocks_per_game = ${stat.blocks}::numeric,
        fg_pct = ${stat.fieldGoal}::numeric
      WHERE id = ${stat.id} AND player_id = ${id}
      RETURNING id
    `);
    if (!updated.rows[0]) {
      res.status(400).json({ error: { code: "INVALID", message: "One of those stat rows is not for this player" } });
      return;
    }
  }

  res.json({ ok: true });
});

adminEditsRouter.patch("/teams/:id", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user?.isAdmin) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const id = Number(req.params.id);
  const name = clean(req.body?.name, 120);
  const abbreviation = clean(req.body?.abbreviation, 12).toUpperCase();
  if (!Number.isInteger(id) || id <= 0 || !name || abbreviation.length < 2) {
    res.status(400).json({ error: { code: "INVALID", message: "Team name and abbreviation are required" } });
    return;
  }

  const wins = optionalStat(req.body?.wins, 100);
  const losses = optionalStat(req.body?.losses, 100);
  const season = clean(req.body?.season, 20);
  if (wins === undefined || losses === undefined) {
    res.status(400).json({ error: { code: "INVALID", message: "Wins and losses need to be from 0 to 100" } });
    return;
  }

  const found = await db.execute(sql`SELECT id FROM teams WHERE id = ${id} LIMIT 1`);
  if (!found.rows[0]) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Team not found" } });
    return;
  }

  await db.execute(sql`
    UPDATE teams
    SET name = ${name}, abbreviation = ${abbreviation}
    WHERE id = ${id}
  `);

  if (season && wins != null && losses != null) {
    const seasonRow = await db.execute(sql`
      SELECT s.id
      FROM seasons s
      JOIN teams t ON t.league_id = s.league_id
      WHERE t.id = ${id} AND s.season_label = ${season}
      LIMIT 1
    `);
    const seasonId = (seasonRow.rows[0] as { id?: number } | undefined)?.id;
    if (!seasonId) {
      res.status(400).json({ error: { code: "INVALID", message: "That season was not found for this team" } });
      return;
    }
    await db.execute(sql`
      INSERT INTO team_season_records (team_id, season_id, wins, losses)
      VALUES (${id}, ${seasonId}, ${wins}::int, ${losses}::int)
      ON CONFLICT (team_id, season_id)
      DO UPDATE SET wins = EXCLUDED.wins, losses = EXCLUDED.losses
    `);
  }

  res.json({ ok: true });
});
