/**
 * Merge complementary same-name player shards (HS / college / G-League / euro / NBA)
 * that belong to one career but were ingested as separate profiles.
 *
 * Usage:
 *   npx tsx --tsconfig server/tsconfig.json scripts/merge-complementary-player-splits.ts --dry-run
 *   npx tsx --tsconfig server/tsconfig.json scripts/merge-complementary-player-splits.ts --limit 50
 *   npx tsx --tsconfig server/tsconfig.json scripts/merge-complementary-player-splits.ts
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { eq, sql } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import { players } from "../server/src/db/schema/index.js";
import { mergePlayerInto } from "../server/src/services/merge-players.service.js";
import { normalizeDisplayName } from "../server/src/services/player-identity.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const NAME_SUFFIX_RE = /\b(jr|sr|ii|iii|iv|v)\b/g;
const HS_SLUGS = new Set(["high-school", "high-school-w"]);
const COLLEGE_SLUGS = new Set([
  "ncaa",
  "ncaa-w",
  "ncaa-d2",
  "ncaa-d3",
  "naia",
  "juco",
  "ccaa",
  "u-sports",
]);
const NBA_FAMILY = new Set(["nba", "wnba", "g-league"]);

const MAX_CAREER_GAP_YEARS = 8;

const PRIMARY_SOURCES = new Set([
  "balldontlie",
  "basketball-reference",
  "basketball-reference-gleague",
  "basketball-reference-wnba",
  "usbasket-profile",
  "usbasket-ncaa-d1",
  "usbasket-ncaa-d2",
  "usbasket-ncaa-d3",
  "usbasket-juco",
  "usbasket-naia",
  "usbasket-ccaa",
  "usbasket-u-sports",
  "sports-reference-cbb",
  "seed",
]);

/** Orphan shards this script is allowed to absorb into a richer career profile. */
const THIN_OK_SOURCES = new Set([
  "maxpreps-hs-basketball",
  "basketball-reference-gleague",
]);

/**
 * Prefer G-League orphans + HS orphans attached to multi-stage careers.
 * Pure college+hs without NBA/euro is handled by batch-merge-maxpreps-hs.ts.
 */
function clusterLooksLikeCareerSplit(keep: PlayerShard, removes: PlayerShard[]): boolean {
  const removeSources = new Set(removes.flatMap((r) => r.sources));
  if (removeSources.has("basketball-reference-gleague")) return true;
  if (
    removeSources.has("maxpreps-hs-basketball") &&
    (keep.buckets.has("nbaFamily") || keep.buckets.has("otherPro"))
  ) {
    return true;
  }
  return false;
}

type LeagueBucket = "hs" | "college" | "nbaFamily" | "otherPro" | "unknown";

interface PlayerShard {
  id: number;
  displayName: string;
  birthDate: string | null;
  hometown: string | null;
  headshotUrl: string;
  identityCount: number;
  sources: string[];
  leagues: string[];
  seasonKeys: string[]; // season|league|team
  seasonYears: number[];
  buckets: Set<LeagueBucket>;
  richness: number;
}

interface MergePlan {
  nameKey: string;
  keepId: number;
  removeIds: number[];
  displayName: string;
  reason: string;
}

function argNum(name: string): number | undefined {
  const i = process.argv.indexOf(name);
  if (i < 0) return undefined;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) ? n : undefined;
}

function mergeNameKey(displayName: string): string {
  return normalizeDisplayName(displayName)
    .replace(NAME_SUFFIX_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isStrongName(displayName: string): boolean {
  const parts = mergeNameKey(displayName)
    .split(" ")
    .filter((p) => p.length > 0);
  if (parts.length < 2) return false;
  const lastName = parts[parts.length - 1]!;
  if (lastName.length < 3) return false;
  const substantial = parts.filter((p) => p.length >= 3);
  return substantial.length >= 2;
}

function seasonStartYear(label: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(label.trim());
  if (!m) return null;
  return Number.parseInt(m[1]!, 10);
}

function classifyLeague(slug: string): LeagueBucket {
  if (HS_SLUGS.has(slug)) return "hs";
  if (COLLEGE_SLUGS.has(slug)) return "college";
  if (NBA_FAMILY.has(slug)) return "nbaFamily";
  if (!slug || slug === "unknown") return "unknown";
  return "otherPro";
}

function birthDatesCompatible(a: string | null, b: string | null): boolean {
  if (!a || !b) return true;
  return a === b;
}

function richnessScore(p: PlayerShard): number {
  return (
    p.identityCount * 1000 +
    p.seasonKeys.length * 10 +
    (p.birthDate ? 50 : 0) +
    (p.hometown ? 20 : 0) +
    (p.headshotUrl ? 10 : 0) +
    (p.buckets.has("otherPro") ? 30 : 0) +
    (p.buckets.has("college") ? 20 : 0) +
    (p.buckets.has("nbaFamily") ? 25 : 0)
  );
}

function footprintsOverlap(a: PlayerShard, b: PlayerShard): boolean {
  const aKeys = new Set(a.seasonKeys);
  for (const key of b.seasonKeys) {
    if (aKeys.has(key)) return true;
  }
  // Same league+season on different teams still risky for common names
  const aSeasonLeague = new Set(a.seasonKeys.map((k) => k.split("|").slice(0, 2).join("|")));
  for (const key of b.seasonKeys) {
    const sl = key.split("|").slice(0, 2).join("|");
    if (aSeasonLeague.has(sl)) return true;
  }
  return false;
}

function bucketsComplementary(shards: PlayerShard[]): boolean {
  const occupied = new Map<LeagueBucket, number>();
  for (const shard of shards) {
    for (const bucket of shard.buckets) {
      if (bucket === "unknown") continue;
      occupied.set(bucket, (occupied.get(bucket) ?? 0) + 1);
    }
  }
  // Need at least two different career stages represented
  const stages = [...occupied.keys()].filter((b) => b !== "unknown");
  if (stages.length < 2) return false;

  // One shard per career stage — multiple HS orphans with the same name are almost always different people
  for (const count of occupied.values()) {
    if (count > 1) return false;
  }
  return true;
}

function isThinShard(shard: PlayerShard): boolean {
  const stages = [...shard.buckets].filter((b) => b !== "unknown");
  if (stages.length !== 1) return false;
  if (shard.identityCount > 2) return false;
  if (shard.seasonKeys.length > 4) return false;
  // Only merge known "orphan shard" sources — not random usbasket stubs
  if (shard.sources.length === 0) return false;
  return shard.sources.every((s) => THIN_OK_SOURCES.has(s));
}

function isStrongKeep(shard: PlayerShard): boolean {
  const hasPrimary = shard.sources.some((s) => PRIMARY_SOURCES.has(s));
  if (!hasPrimary) return false;

  // Must look like a real college/pro career, not a lone foreign junk row
  const hasUsPath =
    shard.buckets.has("college") ||
    shard.buckets.has("nbaFamily") ||
    (shard.buckets.has("otherPro") && shard.identityCount >= 2 && shard.seasonKeys.length >= 4);
  return hasUsPath;
}

function timelineOk(keep: PlayerShard, removes: PlayerShard[]): boolean {
  const shards = [keep, ...removes];
  const years = shards.flatMap((s) => s.seasonYears).sort((a, b) => a - b);
  if (years.length === 0) return true;
  if (years[years.length - 1]! - years[0]! > 30) return false;

  const keepYears = keep.seasonYears;
  if (keepYears.length === 0) return false;
  const keepMin = Math.min(...keepYears);
  const keepMax = Math.max(...keepYears);

  for (const remove of removes) {
    if (remove.seasonYears.length === 0) continue;
    const remMin = Math.min(...remove.seasonYears);
    const remMax = Math.max(...remove.seasonYears);

    // Father/son: HS career starts long after keep career already ended
    if (remove.buckets.has("hs") && remMin - keepMax > 2) return false;

    // HS should lead into college/pro within a few years
    if (remove.buckets.has("hs")) {
      const gap = keepMin - (remMax + 1);
      if (gap > MAX_CAREER_GAP_YEARS) return false;
      if (gap < -2) return false; // HS mostly after keep started
    }

    // G-League orphan should sit near the keep career window
    if (remove.buckets.has("nbaFamily")) {
      if (remMin - keepMax > MAX_CAREER_GAP_YEARS) return false;
      if (keepMin - remMax > MAX_CAREER_GAP_YEARS) return false;
    }
  }
  return true;
}

function hometownCompatible(a: string | null, b: string | null): boolean {
  if (!a || !b) return true;
  const na = normalizeDisplayName(a);
  const nb = normalizeDisplayName(b);
  if (na === nb) return true;
  // "Fort Wayne, IN" vs "Fort Wayne Bishop Luers (Fort Wayne, IN)"
  if (na.includes(nb) || nb.includes(na)) return true;
  const aCity = na.split(",")[0]?.trim() ?? na;
  const bCity = nb.split(",")[0]?.trim() ?? nb;
  return aCity.length >= 4 && bCity.length >= 4 && (aCity.includes(bCity) || bCity.includes(aCity));
}

async function loadShards(): Promise<Map<string, PlayerShard[]>> {
  console.log("Loading player career shards…");
  const result = await db.execute<{
    id: number;
    display_name: string;
    birth_date: string | null;
    hometown: string | null;
    headshot_url: string | null;
    identity_count: number;
    sources: string | null;
    leagues: string | null;
    season_keys: string | null;
    season_years: string | null;
  }>(sql`
    SELECT
      p.id,
      p.display_name,
      p.birth_date::text AS birth_date,
      p.hometown,
      p.headshot_url,
      (SELECT COUNT(*)::int FROM player_identities pi WHERE pi.player_id = p.id) AS identity_count,
      (
        SELECT string_agg(DISTINCT pi.source, ',' ORDER BY pi.source)
        FROM player_identities pi
        WHERE pi.player_id = p.id
      ) AS sources,
      (
        SELECT string_agg(DISTINCT l.slug, ',' ORDER BY l.slug)
        FROM player_season_stats pss
        JOIN leagues l ON l.id = pss.league_id
        WHERE pss.player_id = p.id
      ) AS leagues,
      (
        SELECT string_agg(DISTINCT (s.season_label || '|' || l.slug || '|' || t.slug), ',')
        FROM player_season_stats pss
        JOIN seasons s ON s.id = pss.season_id
        JOIN leagues l ON l.id = pss.league_id
        JOIN teams t ON t.id = pss.team_id
        WHERE pss.player_id = p.id
      ) AS season_keys,
      (
        SELECT string_agg(DISTINCT LEFT(s.season_label, 4), ',')
        FROM player_season_stats pss
        JOIN seasons s ON s.id = pss.season_id
        WHERE pss.player_id = p.id
      ) AS season_years
    FROM players p
    WHERE EXISTS (
      SELECT 1 FROM player_identities pi WHERE pi.player_id = p.id
    )
    AND EXISTS (
      SELECT 1 FROM player_season_stats pss WHERE pss.player_id = p.id
    )
  `);

  const rows = result.rows ?? (result as unknown as typeof result.rows);
  const byName = new Map<string, PlayerShard[]>();

  for (const row of rows) {
    if (!isStrongName(row.display_name)) continue;
    const leagues = (row.leagues ?? "").split(",").filter(Boolean);
    if (leagues.length === 0) continue;

    const buckets = new Set<LeagueBucket>();
    for (const slug of leagues) buckets.add(classifyLeague(slug));

    const seasonKeys = (row.season_keys ?? "").split(",").filter(Boolean);
    const seasonYears = (row.season_years ?? "")
      .split(",")
      .map((y) => Number(y))
      .filter((y) => Number.isFinite(y));

    const shard: PlayerShard = {
      id: row.id,
      displayName: row.display_name,
      birthDate: row.birth_date,
      hometown: row.hometown,
      headshotUrl: row.headshot_url ?? "",
      identityCount: row.identity_count,
      sources: (row.sources ?? "").split(",").filter(Boolean),
      leagues,
      seasonKeys,
      seasonYears,
      buckets,
      richness: 0,
    };
    shard.richness = richnessScore(shard);

    const key = mergeNameKey(row.display_name);
    const list = byName.get(key) ?? [];
    list.push(shard);
    byName.set(key, list);
  }

  console.log(`Indexed ${rows.length} players into ${byName.size} name keys.`);
  return byName;
}

function buildPlans(byName: Map<string, PlayerShard[]>): MergePlan[] {
  const plans: MergePlan[] = [];

  for (const [nameKey, shards] of byName) {
    // Only exact small clusters — large same-name groups are too ambiguous
    if (shards.length < 2 || shards.length > 4) continue;

    const sorted = [...shards].sort((a, b) => b.richness - a.richness);
    const keep = sorted.find(isStrongKeep);
    if (!keep) continue;

    const births = sorted.map((s) => s.birthDate).filter(Boolean) as string[];
    if (new Set(births).size > 1) continue;

    const candidates = sorted.filter((s) => s.id !== keep.id);
    if (!candidates.every((s) => hometownCompatible(keep.hometown, s.hometown))) continue;
    if (!candidates.every((s) => birthDatesCompatible(keep.birthDate, s.birthDate))) continue;

    let overlap = false;
    const cluster = [keep, ...candidates];
    for (let i = 0; i < cluster.length && !overlap; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        if (footprintsOverlap(cluster[i]!, cluster[j]!)) {
          overlap = true;
          break;
        }
      }
    }
    if (overlap) continue;
    if (!bucketsComplementary(cluster)) continue;

    const thinRemoves = candidates.filter(
      (s) => isThinShard(s) && keep.richness >= s.richness + 20,
    );
    if (thinRemoves.length === 0) continue;

    // Without a shared birth date, only merge a single thin shard into the keep
    const hasSharedBirth =
      Boolean(keep.birthDate) && thinRemoves.every((s) => s.birthDate === keep.birthDate);
    const removes = hasSharedBirth ? thinRemoves : thinRemoves.slice(0, 1);

    const finalRemoves = removes.filter((remove) => {
      if (!remove.buckets.has("hs")) return true;
      if (hasSharedBirth) return true;
      // HS without matching DOB requires hometown agreement on both sides
      return Boolean(
        keep.hometown &&
          remove.hometown &&
          hometownCompatible(keep.hometown, remove.hometown),
      );
    });
    if (finalRemoves.length === 0) continue;
    if (!timelineOk(keep, finalRemoves)) continue;
    if (!clusterLooksLikeCareerSplit(keep, finalRemoves)) continue;

    const stages = [...new Set(cluster.flatMap((s) => [...s.buckets]))]
      .filter((b) => b !== "unknown")
      .sort()
      .join("+");

    plans.push({
      nameKey,
      keepId: keep.id,
      removeIds: finalRemoves.map((s) => s.id),
      displayName: keep.displayName,
      reason: `${stages}; keep #${keep.id} (${keep.seasonKeys.length} seasons, ${keep.identityCount} ids)`,
    });
  }

  return plans.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const limit = argNum("--limit");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const byName = await loadShards();
  let plans = buildPlans(byName);
  if (limit != null) plans = plans.slice(0, limit);

  console.log(`\nFound ${plans.length} complementary split cluster(s)${limit != null ? ` (limit ${limit})` : ""}.`);
  for (const plan of plans.slice(0, 80)) {
    console.log(
      `  ${plan.displayName}: keep #${plan.keepId} <- merge [${plan.removeIds.join(", ")}] (${plan.reason})`,
    );
  }
  if (plans.length > 80) console.log(`  …and ${plans.length - 80} more`);

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    await closeDatabaseConnection();
    return;
  }

  let merged = 0;
  let failed = 0;
  for (const plan of plans) {
    for (const removeId of plan.removeIds) {
      try {
        const [keepRow] = await db
          .select({ id: players.id })
          .from(players)
          .where(eq(players.id, plan.keepId))
          .limit(1);
        const [removeRow] = await db
          .select({ id: players.id })
          .from(players)
          .where(eq(players.id, removeId))
          .limit(1);
        if (!keepRow || !removeRow) {
          console.log(`  skip ${plan.displayName}: #${removeId} or keep already gone`);
          continue;
        }

        const result = await mergePlayerInto(removeId, plan.keepId);
        merged += 1;
        console.log(
          `Merged #${result.removedPlayerId} -> #${result.keptPlayerId} (${result.displayName}): +${result.identitiesMoved} ids, +${result.statsMoved} stats, +${result.stintsMoved} stints`,
        );
      } catch (err) {
        failed += 1;
        console.error(`Failed ${plan.displayName} #${removeId} -> #${plan.keepId}:`, err);
      }
    }
  }

  console.log(`\nDone. Merged ${merged}; failed ${failed}.`);
  await closeDatabaseConnection();
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch(async (err) => {
    console.error(err);
    await closeDatabaseConnection().catch(() => undefined);
    process.exit(1);
  });
}
