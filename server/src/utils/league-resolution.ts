import { eq } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import { leagues } from "../db/schema/index.js";
import { normalizeSlugParam } from "./slug.js";
import {
  LEGACY_NCAA_MENS_SLUG,
  NCAA_WOMENS_SLUG,
  canonicalLeagueName,
  isWomensNcaaIngest,
  leagueGenderForSlug,
  resolveIngestLeagueSlug,
  resolvePublicLeagueSlug,
} from "./league-slug.js";

type LeagueRow = typeof leagues.$inferSelect;

export interface ResolvedIngestLeague {
  slug: string;
  name: string;
  gender: string | null;
}

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

/**
 * Route ingest to the correct league:
 * - Women's (explicit ncaa-w or women's source) → ncaa-w when that league exists
 * - Everything else NCAA → legacy ncaa (the league the men's scraper has always used)
 */
export async function resolveOperationalIngestLeague(
  database: DbClient,
  source: string,
  slug: string,
  name: string,
): Promise<ResolvedIngestLeague> {
  const normalized = normalizeSlugParam(slug);
  const targetSlug = resolveIngestLeagueSlug(source, normalized);

  if (targetSlug === NCAA_WOMENS_SLUG && (await leagueExists(database, NCAA_WOMENS_SLUG))) {
    return {
      slug: NCAA_WOMENS_SLUG,
      name: canonicalLeagueName(NCAA_WOMENS_SLUG, name),
      gender: "female",
    };
  }

  if (
    targetSlug === LEGACY_NCAA_MENS_SLUG &&
    (await leagueExists(database, LEGACY_NCAA_MENS_SLUG))
  ) {
    return {
      slug: LEGACY_NCAA_MENS_SLUG,
      name,
      gender: "male",
    };
  }

  if (isWomensNcaaIngest(source, normalized)) {
    return {
      slug: NCAA_WOMENS_SLUG,
      name: canonicalLeagueName(NCAA_WOMENS_SLUG, name),
      gender: "female",
    };
  }

  return {
    slug: targetSlug,
    name: canonicalLeagueName(targetSlug, name),
    gender: leagueGenderForSlug(targetSlug),
  };
}

/** Resolve read API slug; men's pages use legacy ncaa row when ncaa-m is requested. */
export async function findLeagueRowBySlug(
  database: DbClient | typeof db,
  slug: string,
): Promise<LeagueRow | null> {
  const normalized = resolvePublicLeagueSlug(normalizeSlugParam(slug));

  if (normalized === "ncaa-m") {
    const [legacy] = await database
      .select()
      .from(leagues)
      .where(eq(leagues.slug, LEGACY_NCAA_MENS_SLUG))
      .limit(1);
    if (legacy) return legacy;

    const [ncaaM] = await database
      .select()
      .from(leagues)
      .where(eq(leagues.slug, "ncaa-m"))
      .limit(1);
    if (ncaaM) return ncaaM;
  }

  const [direct] = await database
    .select()
    .from(leagues)
    .where(eq(leagues.slug, normalized))
    .limit(1);
  return direct ?? null;
}

export function displaySlugForLeagueRow(
  requestedSlug: string,
  rowSlug: string,
): string {
  const normalized = resolvePublicLeagueSlug(normalizeSlugParam(requestedSlug));
  if (
    normalized === "ncaa-m" &&
    (rowSlug === LEGACY_NCAA_MENS_SLUG || rowSlug === "ncaa-m")
  ) {
    return "ncaa-m";
  }
  return rowSlug;
}

export function genderForLeagueRow(
  displaySlug: string,
  row: Pick<LeagueRow, "slug" | "gender">,
): string | null {
  if (row.gender) return row.gender;
  return leagueGenderForSlug(displaySlug);
}
