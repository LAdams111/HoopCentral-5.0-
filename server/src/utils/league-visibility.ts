import { SEED_LEAGUES } from "../data/leagues.js";
import { CANONICAL_LEAGUE_NAMES } from "./league-slug.js";
import { isHiddenMontverdeDuplicateSlug } from "./maxpreps-team-aliases.js";
import { isHiddenOsbaTrilliumAliasSlug } from "./osba-trillium-team-aliases.js";

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
  /then moved\b/i,
  /then joined\b/i,
  /then went to\b/i,
  /then signed\b/i,
  /then he enrolled\b/i,
  /at the beginning\b/i,
  /played shortly\b/i,
  /played briefly\b/i,
  /played brefly\b/i,
  /played mostly\b/i,
  /played also\b/i,
  /played the season\b/i,
  /^played\b/i,
  /left at the beginning\b/i,
  /only pre[- ]?season\b/i,
  /mid[- ]?season joined\b/i,
  /\bloaned to\b/i,
  /^loaned to\b/i,
  /^started the season\b/i,
  /started the season with\b/i,
  /but dnp\b/i,
  /supposed to attend\b/i,
  /injured in\b/i,
  /enrolled in\b/i,
  /replaced .+ at\b/i,
  // Transaction / bio notes mis-parsed as club names
  /^was signed by\b/i,
  /^was tested by\b/i,
  /^was tested at\b/i,
  /^was activated by\b/i,
  /^was suspended\b/i,
  /^was going to\b/i,
  /^was about to\b/i,
  /^tried to enroll\b/i,
  /^plays also at\b/i,
  /^plays in\b/i,
  /\bhad also (a )?licen[cs]e\b/i,
  /\bdecided to go pro\b/i,
  /\breturned home due to\b/i,
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

/** Long bio-sentence team names (verbs + enough words) even if a real school name is embedded. */
const NARRATIVE_SENTENCE_CUES =
  /\b(then|joined|joining|join|played|plays|play|shortly|briefly|brefly|beginning|season|loaned|moved|signed|signing|left|went|going|enrolled|enroll|injured|attended|attend|replaced|dnp|mostly|tested|activated|suspended|license|licence|decided|returned)\b/i;

const JUNK_TEAM_SLUG_PATTERNS: RegExp[] = [
  /signed-at-/,
  /missed-most/,
  /\d+-games$/,
  /co-captain/,
  /school-year/,
  /then-moved-to/,
  /then-joined/,
  /then-went-to/,
  /at-the-beginning/,
  /played-shortly/,
  /played-briefly/,
  /played-brefly/,
  /played-mostly/,
  /played-also/,
  /left-at-the-beginning/,
  /only-pre-season/,
  /mid-season-joined/,
  /loaned-to/,
  /started-the-season/,
  /supposed-to-attend/,
  /injured-in/,
  /enrolled-in/,
  /left-in-/,
  /joined-in-/,
  /signed-in-/,
  /released-in-/,
  /not-drafted/,
  /^was-signed-by/,
  /^was-tested-by/,
  /^was-tested-at/,
  /^was-activated-by/,
  /^was-suspended/,
  /^was-going-to/,
  /^was-about-to/,
  /^tried-to-enroll/,
  /^plays-also-at/,
  /^plays-in-/,
  /had-also-(a-)?licen[cs]e/,
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
  id?: number;
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
  if (JUNK_TEAM_NAME_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;

  // Bio sentences mis-parsed as team names (often embed "University" / "College").
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 8 && NARRATIVE_SENTENCE_CUES.test(trimmed)) return true;

  return false;
}

export function isJunkTeamSlug(slug: string): boolean {
  const normalized = slug.toLowerCase();
  return JUNK_TEAM_SLUG_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isSinglePlayerNarrativeTeam(team: TeamVisibilityInput): boolean {
  const name = team.name.trim();
  const slug = team.slug.toLowerCase();

  // Hard junk / bio-sentence names already handled by isJunkTeamName.
  // Do not exempt long narrative strings just because they embed "University".
  const wordCount = name.split(/\s+/).filter(Boolean).length;
  const looksLikeRealShortName =
    wordCount <= 6 &&
    REAL_TEAM_NAME_HINTS.some((pattern) => pattern.test(name)) &&
    !/[<>]/.test(name) &&
    !NARRATIVE_SENTENCE_CUES.test(name);

  if (looksLikeRealShortName) {
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
  if (isHiddenOsbaTrilliumAliasSlug(team.slug)) return false;
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
