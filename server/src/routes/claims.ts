import { sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import { getAuthUser } from "./auth.js";

export const claimsRouter = Router();

function bearerToken(header: string | undefined): string {
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

type ClaimRow = {
  id: number;
  user_email: string | null;
  kind: string;
  player_id: number | null;
  player_name: string | null;
  team_slug: string;
  team_name: string | null;
  league_slug: string;
  status: string;
  created_at: string;
};

claimsRouter.get("/", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user?.isAdmin) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const result = await db.execute(sql`
    SELECT id, user_email, kind, player_id, player_name, team_slug, team_name, league_slug, status, created_at
    FROM claim_requests
    ORDER BY created_at DESC
    LIMIT 100
  `);
  res.json({ requests: result.rows as ClaimRow[] });
});

claimsRouter.post("/", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const kind = req.body?.kind;
  if (kind !== "player" && kind !== "team") {
    res.status(400).json({ error: { code: "INVALID", message: "Choose a player or a team" } });
    return;
  }

  let playerId = 0;
  let playerName: string | null = null;
  let teamSlug = "";
  let teamName: string | null = null;
  let leagueSlug = "";

  if (kind === "player") {
    playerId = Number(req.body?.playerId);
    if (!Number.isInteger(playerId) || playerId <= 0) {
      res.status(400).json({ error: { code: "INVALID", message: "Player is required" } });
      return;
    }
    const found = await db.execute(sql`SELECT display_name FROM players WHERE id = ${playerId} LIMIT 1`);
    const row = found.rows[0] as { display_name?: string } | undefined;
    if (!row?.display_name) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Player not found" } });
      return;
    }
    playerName = row.display_name;
  } else {
    teamSlug = String(req.body?.teamSlug ?? "").trim().toLowerCase();
    leagueSlug = String(req.body?.leagueSlug ?? "").trim().toLowerCase();
    if (!teamSlug) {
      res.status(400).json({ error: { code: "INVALID", message: "Team is required" } });
      return;
    }
    const found = await db.execute(sql`
      SELECT t.name, t.slug, l.slug AS league_slug
      FROM teams t
      JOIN leagues l ON l.id = t.league_id
      WHERE t.slug = ${teamSlug}
        AND (${leagueSlug} = '' OR l.slug = ${leagueSlug} OR (${leagueSlug} = 'ncaa-m' AND l.slug = 'ncaa'))
      LIMIT 1
    `);
    const row = found.rows[0] as { name?: string; slug?: string; league_slug?: string } | undefined;
    if (!row?.slug) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Team not found" } });
      return;
    }
    teamName = row.name ?? teamSlug;
    teamSlug = row.slug;
    leagueSlug = row.league_slug ?? leagueSlug;
  }

  const inserted = await db.execute(sql`
    INSERT INTO claim_requests (user_id, user_email, kind, player_id, player_name, team_slug, team_name, league_slug)
    VALUES (
      ${user.id},
      ${user.email},
      ${kind},
      ${playerId},
      ${playerName},
      ${teamSlug},
      ${teamName},
      ${leagueSlug}
    )
    ON CONFLICT (user_id, kind, player_id, team_slug, league_slug)
    DO UPDATE SET status = claim_requests.status
    RETURNING id, status
  `);
  const saved = inserted.rows[0] as { id: number; status: string } | undefined;
  res.json({ ok: true, id: saved?.id ?? null, status: saved?.status ?? "pending" });
});
