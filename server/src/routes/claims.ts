import { sql } from "drizzle-orm";
import express, { Router } from "express";
import { db, pool } from "../db/index.js";
import { parseBirthDate, parseClaimPosition, parseHeightCm, parseWeightKg } from "../utils/claim-measurements.js";
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

function cleanProposed(kind: "player" | "team" | "identity" | "team-identity", value: unknown): Record<string, string> {
  if (kind === "identity" || kind === "team-identity" || !value || typeof value !== "object" || Array.isArray(value)) return {};
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
  has_photo: boolean;
  has_id: boolean;
  created_at: string;
};

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function imageType(bytes: Buffer): string | null {
  if (bytes.length < 12 || bytes.length > MAX_PHOTO_BYTES) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

claimsRouter.get("/", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user?.isAdmin) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const result = await db.execute(sql`
    SELECT id, user_email, kind, player_id, player_name, team_slug, team_name, league_slug,
           status, proof, proposed, (photo IS NOT NULL) AS has_photo,
           (id_document IS NOT NULL) AS has_id, created_at
    FROM claim_requests
    ORDER BY created_at DESC
    LIMIT 100
  `);
  res.json({ requests: result.rows as ClaimRow[] });
});

function proposedRecord(value: unknown): Record<string, string> {
  try {
    const source = typeof value === "string" ? JSON.parse(value) : value;
    if (!source || typeof source !== "object" || Array.isArray(source)) return {};
    const proposed: Record<string, string> = {};
    for (const [key, item] of Object.entries(source as Record<string, unknown>)) {
      if (typeof item === "string" && item.trim()) proposed[key] = item.trim();
    }
    return proposed;
  } catch {
    return {};
  }
}

async function applyPlayerClaim(playerId: number, proposed: Record<string, string>): Promise<void> {
  const position = proposed.position ? parseClaimPosition(proposed.position) : null;
  const heightCm = proposed.height ? parseHeightCm(proposed.height) : null;
  const weightKg = proposed.weight ? parseWeightKg(proposed.weight) : null;
  const hometown = proposed.hometown?.slice(0, 120) || null;
  const country = proposed.country?.slice(0, 80) || null;
  const jersey = proposed.jerseyNumber?.slice(0, 8) || null;
  const birthDate = proposed.birthDate ? parseBirthDate(proposed.birthDate) : null;
  const bio = proposed.bio?.slice(0, 2000) || "";

  await db.execute(sql`
    UPDATE players
    SET
      position = COALESCE(${position}, position),
      height_cm = COALESCE(${heightCm}, height_cm),
      weight_kg = COALESCE(${weightKg}, weight_kg),
      hometown = COALESCE(${hometown}, hometown),
      country = COALESCE(${country}, country),
      jersey_number = COALESCE(${jersey}, jersey_number),
      birth_date = COALESCE(${birthDate}::date, birth_date),
      extended_profile = CASE
        WHEN ${bio}::text = '' THEN extended_profile
        ELSE COALESCE(extended_profile, '{}'::jsonb) || jsonb_build_object('bio', ${bio}::text)
      END,
      updated_at = now()
    WHERE id = ${playerId}
  `);
}

export async function applyStoredApprovals(): Promise<number> {
  const waiting = await db.execute(sql`
    SELECT id, player_id, proposed
    FROM claim_requests
    WHERE status = 'approved'
      AND kind = 'player'
      AND player_id > 0
      AND applied_at IS NULL
  `);
  let applied = 0;
  for (const row of waiting.rows as { id: number; player_id: number; proposed: unknown }[]) {
    await applyPlayerClaim(row.player_id, proposedRecord(row.proposed));
    await db.execute(sql`UPDATE claim_requests SET applied_at = now() WHERE id = ${row.id}`);
    applied += 1;
  }
  return applied;
}

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

  if (status === "approved") {
    const current = await db.execute(sql`
      SELECT kind, (id_document IS NOT NULL) AS has_id
      FROM claim_requests
      WHERE id = ${id}
    `);
    const row = current.rows[0] as { kind?: string; has_id?: boolean } | undefined;
    if ((row?.kind === "identity" || row?.kind === "team-identity") && !row.has_id) {
      res.status(400).json({ error: { code: "INVALID", message: "This claim needs an ID photo before it can be approved" } });
      return;
    }
  }

  const updated = await db.execute(sql`
    UPDATE claim_requests
    SET status = ${status}
    WHERE id = ${id}
    RETURNING id, status, kind, player_id, proposed
  `);
  const saved = updated.rows[0] as {
    id: number;
    status: string;
    kind: string;
    player_id: number;
    proposed: unknown;
  } | undefined;
  if (!saved) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Request not found" } });
    return;
  }

  if (saved.status === "approved" && saved.kind === "player" && saved.player_id > 0) {
    await applyPlayerClaim(saved.player_id, proposedRecord(saved.proposed));
    await db.execute(sql`UPDATE claim_requests SET applied_at = now() WHERE id = ${saved.id}`);
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
  if (kind !== "player" && kind !== "team" && kind !== "identity" && kind !== "team-identity") {
    res.status(400).json({ error: { code: "INVALID", message: "Choose a player or a team" } });
    return;
  }

  const proof = cleanText(req.body?.proof, 2000);
  const proposed = cleanProposed(kind, req.body?.proposed);

  let playerId = 0;
  let playerName: string | null = null;
  let teamSlug = "";
  let teamName: string | null = null;
  let leagueSlug = "";

  if (kind === "player" || kind === "identity") {
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
      status = 'pending',
      applied_at = NULL,
      id_document = CASE WHEN EXCLUDED.kind IN ('identity', 'team-identity') THEN NULL ELSE claim_requests.id_document END,
      id_document_type = CASE WHEN EXCLUDED.kind IN ('identity', 'team-identity') THEN NULL ELSE claim_requests.id_document_type END
    RETURNING id, status
  `);
  const saved = inserted.rows[0] as { id: number; status: string } | undefined;
  res.json({ ok: true, id: saved?.id ?? null, status: saved?.status ?? "pending" });
});

claimsRouter.post(
  "/:id/photo",
  express.raw({
    limit: "2mb",
    type: ["image/jpeg", "image/png", "image/webp", "application/octet-stream"],
  }),
  async (req, res) => {
    const user = await getAuthUser(bearerToken(req.header("authorization")));
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
      return;
    }

    const id = Number(req.params.id);
    const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const photoType = imageType(bytes);
    if (!Number.isInteger(id) || id <= 0 || !photoType) {
      res.status(400).json({ error: { code: "INVALID", message: "Use a JPG, PNG, or WebP photo" } });
      return;
    }

    const updated = await pool.query(
      `UPDATE claim_requests
       SET photo = $1, photo_type = $2
       WHERE id = $3 AND user_id = $4
       RETURNING id`,
      [bytes, photoType, id, user.id],
    );
    if (!updated.rowCount) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Request not found" } });
      return;
    }
    res.json({ ok: true });
  },
);

claimsRouter.post(
  "/:id/id",
  express.raw({
    limit: "2mb",
    type: ["image/jpeg", "image/png", "image/webp", "application/octet-stream"],
  }),
  async (req, res) => {
    const user = await getAuthUser(bearerToken(req.header("authorization")));
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
      return;
    }

    const id = Number(req.params.id);
    const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const photoType = imageType(bytes);
    if (!Number.isInteger(id) || id <= 0 || !photoType) {
      res.status(400).json({ error: { code: "INVALID", message: "Use a JPG, PNG, or WebP photo of the ID" } });
      return;
    }

    const updated = await pool.query(
      `UPDATE claim_requests
       SET id_document = $1, id_document_type = $2
       WHERE id = $3 AND user_id = $4 AND kind IN ('identity', 'team-identity')
       RETURNING id`,
      [bytes, photoType, id, user.id],
    );
    if (!updated.rowCount) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Claim not found" } });
      return;
    }
    res.json({ ok: true });
  },
);

claimsRouter.get("/:id/id", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user?.isAdmin) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(404).end();
    return;
  }
  const found = await pool.query(`SELECT id_document, id_document_type FROM claim_requests WHERE id = $1`, [id]);
  const row = found.rows[0] as { id_document?: Buffer; id_document_type?: string } | undefined;
  if (!row?.id_document) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", row.id_document_type || "image/jpeg");
  res.setHeader("Cache-Control", "private, no-store");
  res.send(row.id_document);
});

claimsRouter.get("/:id/photo", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user?.isAdmin) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(404).end();
    return;
  }
  const found = await pool.query(`SELECT photo, photo_type FROM claim_requests WHERE id = $1`, [id]);
  const row = found.rows[0] as { photo?: Buffer; photo_type?: string } | undefined;
  if (!row?.photo) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", row.photo_type || "image/jpeg");
  res.setHeader("Cache-Control", "private, max-age=60");
  res.send(row.photo);
});

claimsRouter.post("/:id/use-photo", async (req, res) => {
  const user = await getAuthUser(bearerToken(req.header("authorization")));
  if (!user?.isAdmin) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: { code: "INVALID", message: "Request is required" } });
    return;
  }

  const found = await pool.query(
    `SELECT kind, player_id, photo, photo_type FROM claim_requests WHERE id = $1`,
    [id],
  );
  const row = found.rows[0] as
    | { kind?: string; player_id?: number; photo?: Buffer; photo_type?: string }
    | undefined;
  const playerId = Number(row?.player_id);
  if (row?.kind !== "player" || !Number.isInteger(playerId) || playerId <= 0 || !row.photo) {
    res.status(400).json({ error: { code: "INVALID", message: "This request has no player photo" } });
    return;
  }

  await pool.query(
    `INSERT INTO player_photos (player_id, photo, photo_type, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (player_id) DO UPDATE SET
       photo = EXCLUDED.photo,
       photo_type = EXCLUDED.photo_type,
       updated_at = now()`,
    [playerId, row.photo, row.photo_type || "image/jpeg"],
  );

  const host = req.get("host") || "www.hoopcentral.net";
  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  const photoUrl = `${proto}://${host}/api/players/${playerId}/photo.jpg?v=${Date.now()}`;
  await pool.query(`UPDATE players SET headshot_url = $1 WHERE id = $2`, [photoUrl, playerId]);
  res.json({ ok: true, headshotUrl: photoUrl });
});
