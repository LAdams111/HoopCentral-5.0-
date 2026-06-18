import { eq } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import { leagues } from "../db/schema/index.js";
import { normalizeSlugParam } from "./slug.js";
import {
  canonicalLeagueName,
  leagueGenderForSlug,
  resolveIngestLeagueSlug,
  resolvePublicLeagueSlug,
} from "./league-slug.js";

type LeagueRow = typeof leagues.$inferSelect;

async function leagueExists(
  database: DbClient,
  slug: string,
): Promise<boolean> {
  const [row] = await database
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, slug))
    .limit(1);
  return Boolean(row);
}

/** Resolve ingest target; keep men's data on legacy `ncaa` until migration creates `ncaa-m`. */
export async function resolveOperationalIngestLeague(
  database: DbClient,
  source: string,
  slug: string,
  name: string,
): Promise<{ slug: string; name: string }> {
  const targetSlug = resolveIngestLeagueSlug(source, slug);

  if (targetSlug === "ncaa-m") {
    const hasNcaaM = await leagueExists(database, "ncaa-m");
    if (!hasNcaaM && (await leagueExists(database, "ncaa"))) {
      return { slug: "ncaa", name };
    }
  }

  return {
    slug: targetSlug,
    name: canonicalLeagueName(targetSlug, name),
  };
}

/** Resolve read API slug; `ncaa-m` falls back to legacy `ncaa` row pre-migration. */
export async function findLeagueRowBySlug(
  database: DbClient | typeof db,
  slug: string,
): Promise<LeagueRow | null> {
  const normalized = resolvePublicLeagueSlug(normalizeSlugParam(slug));

  const [direct] = await database
    .select()
    .from(leagues)
    .where(eq(leagues.slug, normalized))
    .limit(1);
  if (direct) return direct;

  if (normalized === "ncaa-m") {
    const [legacy] = await database
      .select()
      .from(leagues)
      .where(eq(leagues.slug, "ncaa"))
      .limit(1);
    if (legacy) return legacy;
  }

  return null;
}

export function displaySlugForLeagueRow(
  requestedSlug: string,
  rowSlug: string,
): string {
  const normalized = resolvePublicLeagueSlug(normalizeSlugParam(requestedSlug));
  if (normalized === "ncaa-m" && rowSlug === "ncaa") return "ncaa-m";
  return rowSlug;
}

export function genderForLeagueSlug(slug: string): string | null {
  return leagueGenderForSlug(slug);
}
