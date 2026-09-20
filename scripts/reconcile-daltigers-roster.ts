/**
 * Align Dal 2025-26 DB rows with official daltigers.ca roster scrape.
 *
 * - Remove u-sports Dal season rows for players not on the official roster
 * - Remove same-season 0-GP CCAA/other placeholders for official Dal players
 *
 *   npx tsx --tsconfig server/tsconfig.json scripts/reconcile-daltigers-roster.ts
 *   npx tsx --tsconfig server/tsconfig.json scripts/reconcile-daltigers-roster.ts --apply
 */
import "../server/src/load-env.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const SEASON =
  process.argv.find((a) => a.startsWith("--season="))?.slice("--season=".length)?.trim() ||
  "2025-26";
const JSON_PATH = path.resolve(__dirname, `data/daltigers-mbkb-${SEASON}.json`);

const NAME_SUFFIX = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameTokens(s: string): string[] {
  return normName(s)
    .split(/\s+/)
    .filter((t) => t && !NAME_SUFFIX.has(t));
}

function namesMatch(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return false;
  if (ta.join(" ") === tb.join(" ")) return true;
  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return shorter.every((t) => longer.includes(t));
}

async function main(): Promise<void> {
  console.log(APPLY ? "Mode: APPLY" : "Mode: DRY RUN");
  const payload = JSON.parse(readFileSync(JSON_PATH, "utf8")) as {
    players: { name: string; externalId: string }[];
  };
  const officialNames = payload.players.map((p) => p.name);
  const officialIds = new Set(payload.players.map((p) => p.externalId));

  const [leagueRow] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.slug, "u-sports"))
    .limit(1);
  if (!leagueRow) throw new Error("u-sports league missing");

  const [seasonRow] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.leagueId, leagueRow.id), eq(seasons.seasonLabel, SEASON)))
    .limit(1);
  if (!seasonRow) throw new Error(`season ${SEASON} missing`);

  const dalTeams = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.leagueId, leagueRow.id),
        inArray(teams.slug, ["dalhousie-university", "dalhousie"]),
      ),
    );
  const dalTeamIds = dalTeams.map((t) => t.id);

  const dalRows = await db
    .select({
      pssId: playerSeasonStats.id,
      playerId: players.id,
      displayName: players.displayName,
      gamesPlayed: playerSeasonStats.gamesPlayed,
      externalId: playerIdentities.externalId,
    })
    .from(playerSeasonStats)
    .innerJoin(players, eq(players.id, playerSeasonStats.playerId))
    .leftJoin(
      playerIdentities,
      and(
        eq(playerIdentities.playerId, players.id),
        eq(playerIdentities.source, "daltigers_mbkb"),
      ),
    )
    .where(
      and(
        inArray(playerSeasonStats.teamId, dalTeamIds),
        eq(playerSeasonStats.seasonId, seasonRow.id),
      ),
    );

  const officialPlayerIds = new Set<number>();
  for (const row of dalRows) {
    const byIdentity = row.externalId ? officialIds.has(row.externalId) : false;
    const byName = officialNames.some((n) => namesMatch(n, row.displayName));
    if (byIdentity || byName) officialPlayerIds.add(row.playerId);
  }

  const removeDalPssIds: number[] = [];
  for (const row of dalRows) {
    if (!officialPlayerIds.has(row.playerId)) {
      removeDalPssIds.push(row.pssId);
      console.log(`  Remove Dal row (not on official roster): ${row.displayName}`);
    }
  }

  let placeholderRows: { rows?: unknown[] } = { rows: [] };
  if (officialPlayerIds.size > 0) {
    placeholderRows = await db.execute(sql`
      SELECT pss.id AS pss_id, p.display_name, l.slug AS league, t.name AS team, pss.games_played
      FROM player_season_stats pss
      JOIN players p ON p.id = pss.player_id
      JOIN seasons s ON s.id = pss.season_id
      JOIN leagues l ON l.id = pss.league_id
      JOIN teams t ON t.id = pss.team_id
      WHERE s.season_label = ${SEASON}
        AND p.id IN (${sql.join([...officialPlayerIds].map((id) => sql`${id}`), sql`, `)})
        AND coalesce(pss.games_played, 0) = 0
        AND NOT (l.slug = 'u-sports' AND t.slug IN ('dalhousie-university', 'dalhousie'))
    `);
  }

  const removePlaceholderIds: number[] = [];
  for (const row of (placeholderRows.rows ?? placeholderRows) as {
    pss_id: number;
    display_name: string;
    league: string;
    team: string;
  }[]) {
    removePlaceholderIds.push(row.pss_id);
    console.log(
      `  Remove placeholder ${row.league} row: ${row.display_name} @ ${row.team}`,
    );
  }

  const allRemoveIds = [...new Set([...removeDalPssIds, ...removePlaceholderIds])];
  console.log(`Total player_season_stats rows to delete: ${allRemoveIds.length}`);

  if (APPLY && allRemoveIds.length > 0) {
    for (const playerId of officialPlayerIds) {
      await db.execute(sql`
        DELETE FROM player_stints ps
        USING seasons s, leagues l, teams t
        WHERE ps.player_id = ${playerId}
          AND ps.season_id = s.id
          AND s.season_label = ${SEASON}
          AND ps.league_id = l.id
          AND ps.team_id = t.id
          AND NOT (l.slug = 'u-sports' AND t.slug IN ('dalhousie-university', 'dalhousie'))
      `);
    }

    await db
      .delete(playerSeasonStats)
      .where(inArray(playerSeasonStats.id, allRemoveIds));
  }

  console.log(APPLY ? "Done." : "Dry run complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => closeDatabaseConnection());
