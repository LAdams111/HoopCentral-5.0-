import { sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import { getAuthUser } from "./auth.js";

export const favoritesRouter = Router();

function bearerToken(header: string | undefined): string {
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

type FavoriteRow = {
  kind: string;
  player_id: number;
  player_name: string | null;
  headshot_url: string | null;
  team_slug: string;
  team_name: string | null;
  league_slug: string;
  abbreviation: string | null;
};

favoritesRouter.get("/", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const result = await db.execute(sql`
    SELECT kind, player_id, player_name, headshot_url, team_slug, team_name, league_slug, abbreviation
    FROM user_favorites
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
    LIMIT 200
  `);
  const rows = result.rows as FavoriteRow[];
  res.json({
    players: rows
      .filter((row) => row.kind === "player" && row.player_id > 0)
      .map((row) => ({
        id: row.player_id,
        name: row.player_name || "Player",
        headshotUrl: row.headshot_url || "",
      })),
    teams: rows
      .filter((row) => row.kind === "team" && row.team_slug)
      .map((row) => ({
        slug: row.team_slug,
        name: row.team_name || row.team_slug,
        leagueSlug: row.league_slug || undefined,
        abbreviation: row.abbreviation || undefined,
      })),
  });
});

favoritesRouter.post("/", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const kind = req.body?.kind;
  let playerId = 0;
  let playerName: string | null = null;
  let headshotUrl: string | null = null;
  let teamSlug = "";
  let teamName: string | null = null;
  let leagueSlug = "";
  let abbreviation: string | null = null;

  if (kind === "player") {
    playerId = Number(req.body?.playerId);
    if (!Number.isInteger(playerId) || playerId <= 0) {
      res.status(400).json({ error: { code: "INVALID", message: "Player is required" } });
      return;
    }
    const found = await db.execute(sql`
      SELECT display_name, headshot_url
      FROM players
      WHERE id = ${playerId}
      LIMIT 1
    `);
    const row = found.rows[0] as { display_name?: string; headshot_url?: string | null } | undefined;
    if (!row?.display_name) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Player not found" } });
      return;
    }
    playerName = row.display_name;
    headshotUrl = row.headshot_url ?? null;
  } else if (kind === "team") {
    teamSlug = clean(req.body?.slug, 160).toLowerCase();
    leagueSlug = clean(req.body?.leagueSlug, 160).toLowerCase();
    if (!teamSlug) {
      res.status(400).json({ error: { code: "INVALID", message: "Team is required" } });
      return;
    }
    const found = await db.execute(sql`
      SELECT t.name, t.slug, t.abbreviation, l.slug AS league_slug
      FROM teams t
      JOIN leagues l ON l.id = t.league_id
      WHERE t.slug = ${teamSlug}
        AND (${leagueSlug} = '' OR l.slug = ${leagueSlug} OR (${leagueSlug} = 'ncaa-m' AND l.slug = 'ncaa'))
      LIMIT 1
    `);
    const row = found.rows[0] as
      | { name?: string; slug?: string; abbreviation?: string | null; league_slug?: string }
      | undefined;
    if (!row?.slug) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Team not found" } });
      return;
    }
    teamName = row.name ?? teamSlug;
    teamSlug = row.slug;
    leagueSlug = row.league_slug ?? leagueSlug;
    abbreviation = row.abbreviation ?? null;
  } else {
    res.status(400).json({ error: { code: "INVALID", message: "Choose a player or a team" } });
    return;
  }

  const removed = await db.execute(sql`
    DELETE FROM user_favorites
    WHERE user_id = ${user.id}
      AND kind = ${kind}
      AND player_id = ${playerId}
      AND team_slug = ${teamSlug}
      AND league_slug = ${leagueSlug}
    RETURNING id
  `);
  if (removed.rows.length > 0) {
    res.json({ favorited: false });
    return;
  }

  await db.execute(sql`
    INSERT INTO user_favorites (
      user_id, kind, player_id, player_name, headshot_url, team_slug, team_name, league_slug, abbreviation
    )
    VALUES (
      ${user.id},
      ${kind},
      ${playerId},
      ${playerName}::text,
      ${headshotUrl}::text,
      ${teamSlug},
      ${teamName}::text,
      ${leagueSlug},
      ${abbreviation}::text
    )
    ON CONFLICT (user_id, kind, player_id, team_slug, league_slug)
    DO NOTHING
  `);
  res.json({ favorited: true });
});
