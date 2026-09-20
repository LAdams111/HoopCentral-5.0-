/** Drop duplicate-season placeholder rows (0 GP) when real stats exist for that season. */

export type PublicSeasonStatRow = {
  season: string;
  leagueSlug: string;
  games_played?: number | null;
  gamesPlayed?: number | null;
};

function gamesPlayed(row: PublicSeasonStatRow): number {
  const raw = row.games_played ?? row.gamesPlayed ?? 0;
  return Number.isFinite(raw) ? Number(raw) : 0;
}

function leaguePriority(leagueSlug: string): number {
  const slug = leagueSlug.toLowerCase();
  if (slug === "u-sports") return 0;
  if (slug === "ncaa" || slug.startsWith("ncaa-")) return 1;
  if (slug === "ccaa") return 2;
  if (slug === "juco") return 3;
  if (slug === "naia") return 4;
  if (slug === "high-school") return 5;
  return 9;
}

export function filterPublicPlayerSeasonStats<T extends PublicSeasonStatRow>(
  rows: T[],
): T[] {
  const bySeason = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = bySeason.get(row.season) ?? [];
    bucket.push(row);
    bySeason.set(row.season, bucket);
  }

  const kept: T[] = [];
  for (const group of bySeason.values()) {
    if (group.length === 1) {
      kept.push(group[0]!);
      continue;
    }

    const withGames = group.filter((row) => gamesPlayed(row) > 0);
    if (withGames.length === 1) {
      kept.push(withGames[0]!);
      continue;
    }
    if (withGames.length > 1) {
      kept.push(...withGames);
      continue;
    }

    const sorted = [...group].sort(
      (a, b) => leaguePriority(a.leagueSlug) - leaguePriority(b.leagueSlug),
    );
    kept.push(sorted[0]!);
  }

  return kept.sort((a, b) => b.season.localeCompare(a.season));
}
