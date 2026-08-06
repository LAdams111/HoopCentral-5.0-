/** True when a season row has no meaningful box score (live-scrape placeholder). */
export function isEmptySeasonStat(row: {
  gamesPlayed: number | null;
  pointsPerGame: string | null;
  reboundsPerGame: string | null;
  assistsPerGame: string | null;
  stealsPerGame: string | null;
  blocksPerGame: string | null;
  fieldGoalPct: string | null;
  threePointPct: string | null;
  freeThrowPct: string | null;
}): boolean {
  if ((row.gamesPlayed ?? 0) > 0) return false;

  const numericFields = [
    row.pointsPerGame,
    row.reboundsPerGame,
    row.assistsPerGame,
    row.stealsPerGame,
    row.blocksPerGame,
  ];

  for (const value of numericFields) {
    if (value == null || value === "" || value === "—") continue;
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed !== 0) return false;
  }

  if (row.fieldGoalPct != null && row.fieldGoalPct !== "" && row.fieldGoalPct !== "—") {
    return false;
  }
  if (row.threePointPct != null && row.threePointPct !== "" && row.threePointPct !== "—") {
    return false;
  }
  if (row.freeThrowPct != null && row.freeThrowPct !== "" && row.freeThrowPct !== "—") {
    return false;
  }

  return true;
}
