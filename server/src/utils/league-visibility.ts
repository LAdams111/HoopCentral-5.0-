import { SEED_LEAGUES } from "../data/leagues.js";
import { CANONICAL_LEAGUE_NAMES } from "./league-slug.js";
import { isHiddenMontverdeDuplicateSlug } from "./maxpreps-team-aliases.js";

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

const MONTH_PATTERN =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;

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
  /first team all/i,
  /second team all/i,
  /third team all/i,
  /all-conference first team/i,
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
  /left in/i,
  /joined in/i,
  /signed in/i,
  /released in/i,
  /\breleased\b/i,
  /\bwaived\b/i,
  /\bdeparted\b/i,
  /\bnot drafted\b/i,
  /[<>]/,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)['.]?\s*'?\d{2,4}\b/i,
  /'\d{2}\b/,
  /starting five\)/i,
  /\(starting five\)/i,
];

const JUNK_TEAM_SLUG_PATTERNS: RegExp[] = [
  /signed-at-/,
  /missed-most/,
  /\d+-games$/,
  /co-captain/,
  /school-year/,
  /then-moved-to/,
  /left-in-/,
  /joined-in-/,
  /signed-in-/,
  /released-in-/,
  /not-drafted/,
];

/** Softer narrative cues — hide only when the team has a single linked player. */
const SINGLE_PLAYER_NARRATIVE_NAME_PATTERNS: RegExp[] = [
  /\bleft\b/i,
  /\bjoined\b/i,
  /\bsigned\b/i,
  /\breleased\b/i,
  /\bwaived\b/i,
  MONTH_PATTERN,
  /'\d{2}\b/,
  /\b\d{4}\b/,
  /[<>()[\]{}]/,
  /[,;]/,
  /\bpart\s*\d+/i,
  /\b\d+\s*pts?\b/i,
  /\b\d+\s*reb/i,
];

const SINGLE_PLAYER_NARRATIVE_SLUG_PATTERNS: RegExp[] = [
  /left/,
  /joined/,
  /signed/,
  /released/,
  /waived/,
  /jan-/,
  /feb-/,
  /mar-/,
  /apr-/,
  /may-/,
  /jun-/,
  /jul-/,
  /aug-/,
  /sep-/,
  /oct-/,
  /nov-/,
  /dec-/,
];

const REAL_TEAM_NAME_HINTS: RegExp[] = [
  /\buniversity\b/i,
  /\bcollege\b/i,
  /\bclub\b/i,
  /\bbc\b/i,
  /\bfc\b/i,
  /\bteam\b/i,
  /\bschool\b/i,
  /\bstate\b/i,
  /\bnational\b/i,
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

export interface TeamBrowseContext {
  distinctPlayerCount?: number;
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

export function isSinglePlayerNarrativeTeam(team: TeamVisibilityInput): boolean {
  const name = team.name.trim();
  const slug = team.slug.toLowerCase();

  if (REAL_TEAM_NAME_HINTS.some((pattern) => pattern.test(name)) && !/[<>]/.test(name)) {
    return false;
  }

  const nameHit = SINGLE_PLAYER_NARRATIVE_NAME_PATTERNS.some((pattern) => pattern.test(name));
  const slugHit = SINGLE_PLAYER_NARRATIVE_SLUG_PATTERNS.some((pattern) => pattern.test(slug));
  return nameHit || slugHit;
}

export function isJunkTeam(team: TeamVisibilityInput): boolean {
  return isJunkTeamName(team.name) || isJunkTeamSlug(team.slug);
}

export function isBrowsableTeam(
  team: TeamVisibilityInput,
  context: TeamBrowseContext = {},
): boolean {
  if (isHiddenMontverdeDuplicateSlug(team.slug)) return false;
  if (isJunkTeam(team)) return false;

  if (context.distinctPlayerCount === 1 && isSinglePlayerNarrativeTeam(team)) {
    return false;
  }

  return true;
}

export function junkTeamReason(
  team: TeamVisibilityInput,
  context: TeamBrowseContext = {},
): string | null {
  if (isJunkTeamName(team.name)) return "junk team name";
  if (isJunkTeamSlug(team.slug)) return "junk team slug";
  if (context.distinctPlayerCount === 1 && isSinglePlayerNarrativeTeam(team)) {
    return "single-player narrative team";
  }
  return null;
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
