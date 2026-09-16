import demoData from "@/data/lebronGameLogsDemo.json";

export type DemoGameLogEntry = {
  date: string;
  homeAway: string;
  opponent: string;
  result: string;
  gs: boolean;
  mp: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  fg: string;
  fg3: string;
  ft: string;
  plusMinus: string;
  playoffs?: boolean;
};

const DEMO_PLAYER_SLUG = "lebron-james";
const DEMO_SEASONS = new Set(["2023-24", "2024-25"]);

const seasons = demoData.seasons as Record<string, DemoGameLogEntry[]>;

export function isLebronGameLogDemoPlayer(player: {
  name: string;
  slug?: string | null;
}): boolean {
  if (player.slug === DEMO_PLAYER_SLUG) return true;
  return player.name.trim().toLowerCase() === "lebron james";
}

export function hasDemoGameLogForSeason(seasonLabel: string): boolean {
  return DEMO_SEASONS.has(seasonLabel) && (seasons[seasonLabel]?.length ?? 0) > 0;
}

export function getDemoGameLogForSeason(seasonLabel: string): DemoGameLogEntry[] {
  return seasons[seasonLabel] ?? [];
}

export const demoGameLogSourceNote = demoData.sourceNote as string;
