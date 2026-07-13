import { SEED_LEAGUES } from "../data/leagues.js";
import { CANONICAL_LEAGUE_NAMES } from "./league-slug.js";

/** Minimum teams for a discovered (non-whitelisted) league to appear publicly. */
export const MIN_PUBLIC_TEAM_COUNT = 4;

/** Discovered leagues with fewer teams require zero junk teams. */
export const MIN_TEAM_COUNT_FOR_JUNK_TOLERANCE = 8;

/** Hide if more than this share of teams look like parser junk. */
export const MAX_JUNK_TEAM_RATIO = 0.25;

const WHITELISTED_SLUGS = new Set<string>([
  ...SEED_LEAGUES.map((league) => league.slug),
  "ncaa-m",
  "ncaa-d3",
  "naia",
  "juco",
  ...Object.keys(CANONICAL_LEAGUE_NAMES),
]);

const WHITELISTED_SLUG_PREFIXES = ["ncaa-"];

const JUNK_TEAM_NAME_PATTERNS: RegExp[] = [
  /signed at/i,
  /^in feb/i,
  /missed most/i,
  /then moved to/i,
  /\d+\s*games\b/i,
  /school year/i,
  /co[- ]?captain/i,
  /\bteam captain\b/i,
  /all[- ]?american/i,
  /all[- ]?conference/i,
  /all[- ]?star/i,
  /\bmvp\b/i,
  /\baward\b/i,
  /\bhonou?r\b/i,
  /\bredshirt\b/i,
  /\btransfer(?:red|s)?\b/i,
  /led team/i,
  /games played/i,
  /walk[- ]?on/i,
  /player of the year/i,
  /first team/i,
  /second team/i,
  /third team/i,
  /\bunanimous\b/i,
  /team leader/i,
  /points scored/i,
  /rebounds leader/i,
  /academic team/i,
  /conference player/i,
  /most improved/i,
  /defensive player/i,
  /freshman of the year/i,
  /senior captain/i,
  /junior captain/i,
  /sophomore captain/i,
  /named to/i,
  /selected to/i,
  /earned\b/i,
  /received\b.*\baward\b/i,
];

const JUNK_TEAM_SLUG_PATTERNS: RegExp[] = [
  /signed-at-/,
  /missed-most/,
  /\d+-games$/,
  /co-captain/,
  /school-year/,
  /then-moved-to/,
];

const JUNK_LEAGUE_NAME_PATTERNS: RegExp[] = [
  /then moved to/i,
  /\d+\s*games\b/i,
  /school year/i,
  /signed at/i,
  /missed most/i,
];

export interface LeagueVisibilityInput {
  slug: string;
  name: string;
}

export interface TeamVisibilityInput {
  name: string;
  slug: string;
}

export function isWhitelistedLeagueSlug(slug: string): boolean {
  const normalized = slug.toLowerCase();
  if (WHITELISTED_SLUGS.has(normalized)) return true;
  return WHITELISTED_SLUG_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function isJunkTeamName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  return JUNK_TEAM_NAME_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isJunkTeamSlug(slug: string): boolean {
  const normalized = slug.toLowerCase();
  return JUNK_TEAM_SLUG_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isJunkTeam(team: TeamVisibilityInput): boolean {
  return isJunkTeamName(team.name) || isJunkTeamSlug(team.slug);
}

export function isJunkLeagueName(name: string, _slug: string): boolean {
  const trimmed = name.trim();
  return JUNK_LEAGUE_NAME_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function evaluateLeagueVisibility(
  league: LeagueVisibilityInput,
  teams: TeamVisibilityInput[],
): { public: boolean; reason: string } {
  if (isWhitelistedLeagueSlug(league.slug)) {
    return { public: true, reason: "whitelisted" };
  }

  if (isJunkLeagueName(league.name, league.slug)) {
    return { public: false, reason: "junk league name" };
  }

  if (teams.length === 0) {
    return { public: false, reason: "no teams" };
  }

  const junkTeams = teams.filter(isJunkTeam);
  const realTeamCount = teams.length - junkTeams.length;
  const junkRatio = junkTeams.length / teams.length;

  if (teams.length < MIN_PUBLIC_TEAM_COUNT) {
    return { public: false, reason: `only ${teams.length} team(s)` };
  }

  if (junkRatio > MAX_JUNK_TEAM_RATIO) {
    return {
      public: false,
      reason: `${junkTeams.length}/${teams.length} junk teams`,
    };
  }

  if (teams.length < MIN_TEAM_COUNT_FOR_JUNK_TOLERANCE && junkTeams.length > 0) {
    return {
      public: false,
      reason: `small league with ${junkTeams.length} junk team(s)`,
    };
  }

  if (realTeamCount < MIN_PUBLIC_TEAM_COUNT) {
    return {
      public: false,
      reason: `only ${realTeamCount} real team(s) after junk filter`,
    };
  }

  return { public: true, reason: "passed quality bar" };
}

export function isLeaguePubliclyVisible(
  league: LeagueVisibilityInput,
  teams: TeamVisibilityInput[],
): boolean {
  return evaluateLeagueVisibility(league, teams).public;
}
