/**
 * Reassign MaxPreps HS season stats to the correct team slug/name from CSV athlete URLs.
 * Fixes merged squads (e.g. Montverde Purple → separate team) without touching non-MaxPreps data.
 *
 * Usage:
 *   CSV_FILE=/path/to/maxpreps_merged_all_data.csv npm run db:fix-maxpreps-squad-teams -- --dry-run
 *   CSV_FILE=/path/to/maxpreps_merged_all_data.csv npm run db:fix-maxpreps-squad-teams
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { and, eq, inArray, sql } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../server/src/db/index.js";
import {
  leagues,
  playerIdentities,
  playerSeasonStats,
  players,
  seasons,
  teams,
} from "../server/src/db/schema/index.js";
import {
  maxprepsSeasonToLabel,
  teamIdentityFromCsvRow,
} from "../server/src/utils/maxpreps-team-identity.js";
import { normalizeSlugParam } from "../server/src/utils/slug.js";
import { isPostgresUniqueViolation } from "../server/src/utils/postgres.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MAXPREPS_SOURCE = "maxpreps-hs-basketball";
const HS_LEAGUE_SLUG = "high-school";
const BATCH_SIZE = 500;

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

function mapCsvRecord(header: string[], values: string[]): CsvRow | null {
  if (values.length !== header.length) return null;
  const row: CsvRow = {};
  for (let i = 0; i < header.length; i += 1) {
    row[header[i]!] = values[i] ?? "";
  }
  return row;
}

interface SeasonAssignment {
  careerId: string;
  seasonLabel: string;
  teamSlug: string;
}

async function ensureTeam(
  leagueId: number,
  identity: { teamSlug: string; teamName: string; abbreviation: string },
  teamCache: Map<string, number>,
  dryRun: boolean,
): Promise<number> {
  const slug = normalizeSlugParam(identity.teamSlug);
  const cached = teamCache.get(slug);
  if (cached != null) return cached;

  const [existing] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(and(eq(teams.leagueId, leagueId), eq(teams.slug, slug)))
    .limit(1);

  if (existing) {
    if (existing.name !== identity.teamName && !dryRun) {
      await db
        .update(teams)
        .set({ name: identity.teamName })
        .where(eq(teams.id, existing.id));
    }
    teamCache.set(slug, existing.id);
    return existing.id;
  }

  if (dryRun) {
    teamCache.set(slug, -1);
    return -1;
  }

  try {
    const [inserted] = await db
      .insert(teams)
      .values({
        leagueId,
        slug,
        name: identity.teamName,
        abbreviation: identity.abbreviation,
      })
      .returning({ id: teams.id });
    teamCache.set(slug, inserted!.id);
    return inserted!.id;
  } catch (error) {
    if (!isPostgresUniqueViolation(error)) throw error;
    const [raced] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.leagueId, leagueId), eq(teams.slug, slug)))
      .limit(1);
    if (!raced) throw error;
    teamCache.set(slug, raced.id);
    return raced.id;
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const csvPath =
    process.env.CSV_FILE?.trim() ||
    path.resolve(__dirname, "../../NCAAD1Scraper/maxpreps_merged_all_data.csv");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const [hsLeague] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, HS_LEAGUE_SLUG))
    .limit(1);

  if (!hsLeague) {
    console.error("high-school league not found.");
    process.exit(1);
  }

  console.log(`Scanning CSV: ${csvPath}`);
  const assignments = new Map<string, SeasonAssignment>();
  const teamDefs = new Map<
    string,
    { teamSlug: string; teamName: string; abbreviation: string }
  >();

  const stream = createReadStream(csvPath, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let header: string[] | null = null;
  let rowsRead = 0;

  for await (const line of lines) {
    if (!line.trim()) continue;
    if (!header) {
      header = parseCsvLine(line);
      continue;
    }
    const row = mapCsvRecord(header, parseCsvLine(line));
    if (!row) continue;
    rowsRead += 1;

    const year = (row.year ?? "").trim();
    if (!year) continue;
    const seasonLabel = maxprepsSeasonToLabel(year);
    if (!seasonLabel) continue;

    const careerId = (row.career_id ?? "").trim();
    if (!careerId) continue;

    const identity = teamIdentityFromCsvRow({
      athleteUrl: row.athlete_url ?? "",
      schoolName: row.school_name ?? "",
      schoolCity: row.school_city ?? "",
      state: row.state ?? "",
      schoolState: row.school_state ?? "",
    });
    if (!identity) continue;

    teamDefs.set(identity.teamSlug, identity);
    const key = `${careerId}:${seasonLabel}`;
    assignments.set(key, {
      careerId,
      seasonLabel,
      teamSlug: identity.teamSlug,
    });
  }

  console.log(`CSV rows read: ${rowsRead.toLocaleString()}`);
  console.log(`Season assignments: ${assignments.size.toLocaleString()}`);
  console.log(`Distinct teams: ${teamDefs.size.toLocaleString()}`);

  const teamCache = new Map<string, number>();
  const existingNameBySlug = new Map<string, string>();
  const existingTeamRows = await db
    .select({ id: teams.id, slug: teams.slug, name: teams.name })
    .from(teams)
    .where(eq(teams.leagueId, hsLeague.id));
  for (const row of existingTeamRows) {
    const slug = normalizeSlugParam(row.slug);
    teamCache.set(slug, row.id);
    existingNameBySlug.set(slug, row.name);
  }
  console.log(`Existing HS teams loaded: ${existingTeamRows.length.toLocaleString()}`);

  let teamsCreated = 0;
  for (const def of teamDefs.values()) {
    const before = teamCache.has(def.teamSlug);
    await ensureTeam(hsLeague.id, def, teamCache, dryRun);
    if (!before && teamCache.has(def.teamSlug)) teamsCreated += 1;
  }
  console.log(`Teams created/verified: ${teamsCreated.toLocaleString()}`);

  console.log("Loading MaxPreps identity map…");
  const identityRows = await db
    .select({
      externalId: playerIdentities.externalId,
      playerId: playerIdentities.playerId,
    })
    .from(playerIdentities)
    .where(eq(playerIdentities.source, MAXPREPS_SOURCE));
  const playerByCareer = new Map(identityRows.map((r) => [r.externalId, r.playerId]));
  console.log(`Identities loaded: ${playerByCareer.size.toLocaleString()}`);

  const seasonRows = await db
    .select({ id: seasons.id, label: seasons.seasonLabel })
    .from(seasons)
    .where(eq(seasons.leagueId, hsLeague.id));
  const seasonIdByLabel = new Map(seasonRows.map((r) => [r.label, r.id]));
  console.log(`HS seasons loaded: ${seasonRows.length.toLocaleString()}`);

  let examined = 0;
  let moved = 0;
  let alreadyCorrect = 0;
  let missingPlayer = 0;
  let missingStat = 0;

  const assignmentList = [...assignments.values()].filter((a) =>
    playerByCareer.has(a.careerId),
  );
  console.log(`Assignments with ingested players: ${assignmentList.length.toLocaleString()}`);

  const pendingMoves: Array<{
    statId: number;
    targetTeamId: number;
    playerId: number;
    careerId: string;
    seasonLabel: string;
    teamSlug: string;
  }> = [];

  for (let offset = 0; offset < assignmentList.length; offset += BATCH_SIZE) {
    const batch = assignmentList.slice(offset, offset + BATCH_SIZE);
    const playerSeasonPairs: Array<{ playerId: number; seasonId: number; teamSlug: string; careerId: string; seasonLabel: string }> = [];

    for (const a of batch) {
      examined += 1;
      const playerId = playerByCareer.get(a.careerId);
      if (!playerId) {
        missingPlayer += 1;
        continue;
      }
      const seasonId = seasonIdByLabel.get(a.seasonLabel);
      if (!seasonId) continue;
      playerSeasonPairs.push({
        playerId,
        seasonId,
        teamSlug: a.teamSlug,
        careerId: a.careerId,
        seasonLabel: a.seasonLabel,
      });
    }

    if (playerSeasonPairs.length === 0) continue;

    const playerIds = [...new Set(playerSeasonPairs.map((p) => p.playerId))];
    const statRows = await db
      .select({
        id: playerSeasonStats.id,
        playerId: playerSeasonStats.playerId,
        seasonId: playerSeasonStats.seasonId,
        teamId: playerSeasonStats.teamId,
      })
      .from(playerSeasonStats)
      .where(
        and(
          eq(playerSeasonStats.leagueId, hsLeague.id),
          inArray(playerSeasonStats.playerId, playerIds),
        ),
      );

    const statByKey = new Map<string, (typeof statRows)[0]>();
    for (const s of statRows) {
      statByKey.set(`${s.playerId}:${s.seasonId}`, s);
    }

    for (const pair of playerSeasonPairs) {
      const stat = statByKey.get(`${pair.playerId}:${pair.seasonId}`);
      if (!stat) {
        missingStat += 1;
        continue;
      }

      const targetTeamId = teamCache.get(pair.teamSlug);
      if (targetTeamId == null) continue;
      if (stat.teamId === targetTeamId || (dryRun && targetTeamId === -1)) {
        alreadyCorrect += 1;
        continue;
      }

      if (dryRun) {
        moved += 1;
        if (moved <= 20) {
          console.log(
            `[dry-run] move ${pair.careerId} ${pair.seasonLabel} → ${pair.teamSlug}`,
          );
        }
        continue;
      }

      pendingMoves.push({
        statId: stat.id,
        targetTeamId,
        playerId: pair.playerId,
        careerId: pair.careerId,
        seasonLabel: pair.seasonLabel,
        teamSlug: pair.teamSlug,
      });
      moved += 1;
    }

    if (offset > 0 && offset % 50000 === 0) {
      console.log(`  … processed ${offset.toLocaleString()} assignments`);
    }
  }

  if (!dryRun && pendingMoves.length > 0) {
    console.log(`Applying ${pendingMoves.length.toLocaleString()} stat reassignments…`);
    const APPLY_CHUNK = 500;
    for (let i = 0; i < pendingMoves.length; i += APPLY_CHUNK) {
      const chunk = pendingMoves.slice(i, i + APPLY_CHUNK);
      const statIds = chunk.map((m) => m.statId);
      const targetTeamIds = chunk.map((m) => m.targetTeamId);
      await db.execute(sql`
        UPDATE player_season_stats AS pss
        SET team_id = v.target_team_id
        FROM (
          SELECT *
          FROM unnest(
            ${sql.raw(`ARRAY[${statIds.join(",")}]::int[]`)},
            ${sql.raw(`ARRAY[${targetTeamIds.join(",")}]::int[]`)}
          ) AS t(stat_id, target_team_id)
        ) AS v
        WHERE pss.id = v.stat_id
      `);
      if ((i + APPLY_CHUNK) % 2000 === 0 || i + APPLY_CHUNK >= pendingMoves.length) {
        console.log(
          `  … applied ${Math.min(i + APPLY_CHUNK, pendingMoves.length).toLocaleString()} / ${pendingMoves.length.toLocaleString()}`,
        );
      }
    }

    const latestTeamByPlayer = new Map<number, number>();
    for (const move of pendingMoves) {
      latestTeamByPlayer.set(move.playerId, move.targetTeamId);
    }
    const playerUpdates = [...latestTeamByPlayer.entries()];
    console.log(`Updating ${playerUpdates.length.toLocaleString()} player current teams…`);
    for (let i = 0; i < playerUpdates.length; i += APPLY_CHUNK) {
      const chunk = playerUpdates.slice(i, i + APPLY_CHUNK);
      const playerIds = chunk.map(([id]) => id);
      const teamIds = chunk.map(([, teamId]) => teamId);
      await db.execute(sql`
        UPDATE players AS p
        SET current_team_id = v.team_id, updated_at = NOW()
        FROM (
          SELECT *
          FROM unnest(
            ${sql.raw(`ARRAY[${playerIds.join(",")}]::int[]`)},
            ${sql.raw(`ARRAY[${teamIds.join(",")}]::int[]`)}
          ) AS t(player_id, team_id)
        ) AS v
        WHERE p.id = v.player_id
      `);
    }
  }

  if (!dryRun) {
    console.log("Syncing player stints from season stats…");
    await db.execute(sql`
      DELETE FROM player_stints AS ps
      USING player_season_stats AS pss, player_stints AS keep
      WHERE ps.player_id = pss.player_id
        AND ps.season_id = pss.season_id
        AND ps.league_id = pss.league_id
        AND ps.team_id != pss.team_id
        AND pss.league_id = ${hsLeague.id}
        AND keep.player_id = pss.player_id
        AND keep.team_id = pss.team_id
        AND keep.league_id = pss.league_id
        AND keep.season_id = pss.season_id
        AND keep.id != ps.id
    `);
    const stintSync = await db.execute(sql`
      UPDATE player_stints AS ps
      SET team_id = pss.team_id
      FROM player_season_stats AS pss
      WHERE ps.player_id = pss.player_id
        AND ps.season_id = pss.season_id
        AND ps.league_id = pss.league_id
        AND ps.team_id != pss.team_id
        AND pss.league_id = ${hsLeague.id}
    `);
    console.log(`Stints synced: ${Number(stintSync.rowCount ?? 0).toLocaleString()}`);
  }

  if (!dryRun) {
    const renameTargets = [...teamDefs.values()].filter((def) => {
      const teamId = teamCache.get(def.teamSlug);
      if (teamId == null || teamId < 0) return false;
      return existingNameBySlug.get(def.teamSlug) !== def.teamName;
    });
    console.log(`Renaming ${renameTargets.length.toLocaleString()} teams with outdated names…`);
    const RENAME_CHUNK = 200;
    for (let i = 0; i < renameTargets.length; i += RENAME_CHUNK) {
      const chunk = renameTargets.slice(i, i + RENAME_CHUNK);
      await Promise.all(
        chunk.map((def) => {
          const teamId = teamCache.get(def.teamSlug)!;
          return db
            .update(teams)
            .set({
              name: def.teamName,
              abbreviation: def.abbreviation,
            })
            .where(eq(teams.id, teamId));
        }),
      );
      if (i + RENAME_CHUNK >= renameTargets.length || (i + RENAME_CHUNK) % 1000 === 0) {
        console.log(
          `  … renamed ${Math.min(i + RENAME_CHUNK, renameTargets.length).toLocaleString()} / ${renameTargets.length.toLocaleString()}`,
        );
      }
    }
  }

  console.log("");
  console.log(`Examined:        ${examined.toLocaleString()}`);
  console.log(`Already correct: ${alreadyCorrect.toLocaleString()}`);
  console.log(`Moved:           ${moved.toLocaleString()}`);
  console.log(`Missing player:  ${missingPlayer.toLocaleString()}`);
  console.log(`Missing stat:    ${missingStat.toLocaleString()}`);
  if (dryRun) console.log("\nDry run — no changes made.");

  await closeDatabaseConnection();
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    console.error("Fix failed:", err);
    process.exit(1);
  });
}
