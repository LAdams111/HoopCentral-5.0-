import { sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import { getAuthUser } from "./auth.js";

export const claimsRouter = Router();

const PLAYER_FIELDS = [
  "position",
  "height",
  "weight",
  "hometown",
  "country",
  "birthDate",
  "jerseyNumber",
  "bio",
] as const;

function bearerToken(header: string | undefined): string {
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function cleanProposed(kind: "player" | "team", value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const keys = kind === "player" ? PLAYER_FIELDS : (["note"] as const);
  const proposed: Record<string, string> = {};
  for (const key of keys) {
    const text = cleanText(source[key], key === "bio" || key === "note" ? 2000 : 120);
    if (text) proposed[key] = text;
  }
  return proposed;
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
  proof: string;
  proposed: Record<string, string> | null;
  created_at: string;
};

claimsRouter.get("/", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user?.isAdmin) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const result = await db.execute(sql`
    SELECT id, user_email, kind, player_id, player_name, team_slug, team_name, league_slug,
           status, proof, proposed, created_at
    FROM claim_requests
    ORDER BY created_at DESC
    LIMIT 100
  `);
  res.json({ requests: result.rows as ClaimRow[] });
});

claimsRouter.patch("/:id", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user?.isAdmin) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const id = Number(req.params.id);
  const status = req.body?.status;
  if (!Number.isInteger(id) || id <= 0 || (status !== "approved" && status !== "denied")) {
    res.status(400).json({ error: { code: "INVALID", message: "Choose approve or deny" } });
    return;
  }

  const updated = await db.execute(sql`
    UPDATE claim_requests
    SET status = ${status}
    WHERE id = ${id}
    RETURNING id, status
  `);
  const saved = updated.rows[0] as { id: number; status: string } | undefined;
  if (!saved) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Request not found" } });
    return;
  }
  res.json({ ok: true, id: saved.id, status: saved.status });
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

  const proof = cleanText(req.body?.proof, 2000);
  if (proof.length < 8) {
    res.status(400).json({
      error: { code: "INVALID", message: "Add proof so the change can be checked" },
    });
    return;
  }
  const proposed = cleanProposed(kind, req.body?.proposed);

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
    teamSlug = cleanText(req.body?.teamSlug, 160).toLowerCase();
    leagueSlug = cleanText(req.body?.leagueSlug, 160).toLowerCase();
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
    INSERT INTO claim_requests (
      user_id, user_email, kind, player_id, player_name, team_slug, team_name, league_slug, proof, proposed
    )
    VALUES (
      ${user.id},
      ${user.email},
      ${kind},
      ${playerId},
      ${playerName},
      ${teamSlug},
      ${teamName},
      ${leagueSlug},
      ${proof},
      ${JSON.stringify(proposed)}::jsonb
    )
    ON CONFLICT (user_id, kind, player_id, team_slug, league_slug)
    DO UPDATE SET
      user_email = EXCLUDED.user_email,
      proof = EXCLUDED.proof,
      proposed = EXCLUDED.proposed,
      status = 'pending'
    RETURNING id, status
  `);
  const saved = inserted.rows[0] as { id: number; status: string } | undefined;
  res.json({ ok: true, id: saved?.id ?? null, status: saved?.status ?? "pending" });
});
