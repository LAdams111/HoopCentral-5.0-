import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import { leagues, teams } from "../db/schema/index.js";
import {
  buildNcaaTeamMergeGroups,
  loadNcaaTeamAliasReport,
} from "../utils/ncaa-team-alias-report.js";
import { mergeTeamInto, type MergeTeamsResult } from "./merge-teams.service.js";

export interface CollegeTeamRow {
  id: number;
  slug: string;
  name: string;
  stints: number;
  stats: number;
}

export interface CollegeDuplicateMergePlan {
  leagueSlug: string;
  keepTeamId: number;
  keepSlug: string;
  keepName: string;
  duplicateTeamIds: number[];
  duplicateSlugs: string[];
}

export interface CollegeDuplicateMergeResult {
  plan: CollegeDuplicateMergePlan;
  merges: MergeTeamsResult[];
  nameUpdated: boolean;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NCAA_MANUAL_ALIASES_PATH = path.resolve(
  __dirname,
  "../../../scripts/ncaa-manual-aliases.json",
);

const TARGET_LEAGUE_SLUGS = [
  "ncaa",
  "ncaa-d2",
  "ncaa-d3",
  "ncaa-w",
  "naia",
  "juco",
  "ccaa",
  "u-sports",
] as const;

class UnionFind {
  private parent = new Map<number, number>();

  find(id: number): number {
    if (!this.parent.has(id)) this.parent.set(id, id);
    const parent = this.parent.get(id)!;
    if (parent !== id) this.parent.set(id, this.find(parent));
    return this.parent.get(id)!;
  }

  union(a: number, b: number): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }
}

function loadNcaaManualAliasSlugPairs(): Array<[string, string]> {
  const raw = readFileSync(NCAA_MANUAL_ALIASES_PATH, "utf8");
  const manual = JSON.parse(raw) as Record<string, string>;
  const pairs: Array<[string, string]> = [];

  for (const [alias, canonical] of Object.entries(manual)) {
    pairs.push([alias.trim().replace(/\s+/g, "-"), canonical.trim()]);
    pairs.push([alias.trim().replace(/\s+/g, "-"), canonical.trim().replace(/\s+/g, "-")]);
  }

  return pairs;
}

function teamScore(team: CollegeTeamRow): number {
  return (
    team.stats * 1000 +
    team.stints * 10 +
    (/\bUniversity\b/i.test(team.name) ? 8 : 0) +
    (/\bCollege\b/i.test(team.name) ? 4 : 0) -
    (/\bSt\./i.test(team.name) ? 4 : 0) -
    (team.name.includes(";") ? 20 : 0)
  );
}

export function pickKeepTeam(group: CollegeTeamRow[]): CollegeTeamRow {
  return group.reduce((best, current) =>
    teamScore(current) > teamScore(best) ? current : best,
  );
}

export function pickBestDisplayName(group: CollegeTeamRow[]): string {
  const sorted = [...group].sort((a, b) => teamScore(b) - teamScore(a));
  return sorted[0]?.name ?? group[0]?.name ?? "";
}

function linkSlugVariants(
  uf: UnionFind,
  bySlug: Map<string, CollegeTeamRow>,
  slugA: string,
  slugB: string,
): void {
  const a = bySlug.get(slugA);
  const b = bySlug.get(slugB);
  if (a && b) uf.union(a.id, b.id);
}

function normalizeDuplicateName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|university|college|of|coll|univ)\b/g, " ")
    .replace(/\bst\b/g, "state")
    .replace(/\s+/g, " ")
    .trim();
}

function isUnsafeBareStatePair(a: CollegeTeamRow, b: CollegeTeamRow): boolean {
  const stTeam = a.slug.match(/^(.+)-st$/) ? a : b.slug.match(/^(.+)-st$/) ? b : null;
  if (!stTeam) return false;
  const other = stTeam.id === a.id ? b : a;
  const base = stTeam.slug.replace(/-st$/, "");
  if (other.slug !== base) return false;
  return !normalizeDuplicateName(stTeam.name).includes("state");
}

function looseDuplicateName(name: string): string {
  return normalizeDuplicateName(name)
    .replace(
      /\b(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function sharesSlugStem(a: string, b: string): boolean {
  const stemA = a.split("-")[0] ?? "";
  const stemB = b.split("-")[0] ?? "";
  return stemA.length >= 4 && stemA === stemB;
}

function linkByLooseName(uf: UnionFind, teamsInLeague: CollegeTeamRow[]): void {
  const byLoose = new Map<string, CollegeTeamRow[]>();
  for (const team of teamsInLeague) {
    const key = looseDuplicateName(team.name);
    if (key.length < 4) continue;
    const bucket = byLoose.get(key) ?? [];
    bucket.push(team);
    byLoose.set(key, bucket);
  }

  for (const bucket of byLoose.values()) {
    if (bucket.length <= 1) continue;
    for (let i = 0; i < bucket.length; i += 1) {
      for (let j = i + 1; j < bucket.length; j += 1) {
        if (isUnsafeBareStatePair(bucket[i], bucket[j])) continue;
        if (!sharesSlugStem(bucket[i].slug, bucket[j].slug)) continue;
        uf.union(bucket[i].id, bucket[j].id);
      }
    }
  }
}

function linkByNormalizedName(uf: UnionFind, teamsInLeague: CollegeTeamRow[]): void {
  const byName = new Map<string, CollegeTeamRow[]>();
  for (const team of teamsInLeague) {
    const key = normalizeDuplicateName(team.name);
    if (key.length < 4) continue;
    const bucket = byName.get(key) ?? [];
    bucket.push(team);
    byName.set(key, bucket);
  }

  for (const bucket of byName.values()) {
    if (bucket.length <= 1) continue;
    for (let i = 0; i < bucket.length; i += 1) {
      for (let j = i + 1; j < bucket.length; j += 1) {
        if (isUnsafeBareStatePair(bucket[i], bucket[j])) continue;
        uf.union(bucket[i].id, bucket[j].id);
      }
    }
  }
}

function linkSunyAbbreviations(uf: UnionFind, teamsInLeague: CollegeTeamRow[]): void {
  const sunyTeams = teamsInLeague.filter((team) => team.slug.startsWith("suny-"));
  for (let i = 0; i < sunyTeams.length; i += 1) {
    for (let j = i + 1; j < sunyTeams.length; j += 1) {
      const slugA = sunyTeams[i].slug.slice(5);
      const slugB = sunyTeams[j].slug.slice(5);
      if (slugA.startsWith(slugB) || slugB.startsWith(slugA)) {
        uf.union(sunyTeams[i].id, sunyTeams[j].id);
      }
    }
  }
}

function buildDuplicateGroups(
  leagueSlug: string,
  teamsInLeague: CollegeTeamRow[],
): CollegeTeamRow[][] {
  const bySlug = new Map(teamsInLeague.map((team) => [team.slug, team]));
  const uf = new UnionFind();

  for (const team of teamsInLeague) {
    const stateUniversityMatch = team.slug.match(/^(.+)-state-university$/);
    if (stateUniversityMatch) {
      const base = stateUniversityMatch[1];
      linkSlugVariants(uf, bySlug, team.slug, `${base}-st`);
      if (bySlug.get(base) && !bySlug.get(`${base}-st`)) {
        linkSlugVariants(uf, bySlug, team.slug, base);
      }
    }

    const stateUniversityAtMatch = team.slug.match(/^(.+)-state-university-at-(.+)$/);
    if (stateUniversityAtMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${stateUniversityAtMatch[1]}-st`);
      linkSlugVariants(uf, bySlug, team.slug, stateUniversityAtMatch[1]);
    }

    const genericUniversityMatch = team.slug.match(/^(.+)-university$/);
    if (genericUniversityMatch && !team.slug.endsWith("-state-university")) {
      linkSlugVariants(uf, bySlug, team.slug, genericUniversityMatch[1]);
    }

    const stateMatch = team.slug.match(/^(.+)-state$/);
    if (stateMatch && !team.slug.endsWith("-state-university")) {
      linkSlugVariants(uf, bySlug, team.slug, `${stateMatch[1]}-st`);
    }

    const universityMatch = team.slug.match(/^university-of-(.+)$/);
    if (universityMatch) {
      linkSlugVariants(uf, bySlug, team.slug, universityMatch[1]);
    }

    const theUniversityMatch = team.slug.match(/^the-(.+)-university$/);
    if (theUniversityMatch) {
      linkSlugVariants(uf, bySlug, team.slug, theUniversityMatch[1]);
    }

    const instituteMatch = team.slug.match(/^(.+)-institute-of-technology$/);
    if (instituteMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${instituteMatch[1]}-tech`);
    }

    const collegeMatch = team.slug.match(/^(.+)-college$/);
    if (collegeMatch) {
      linkSlugVariants(uf, bySlug, team.slug, collegeMatch[1]);
    }

    const collegeOfMatch = team.slug.match(/^college-of-(.+)$/);
    if (collegeOfMatch) {
      linkSlugVariants(uf, bySlug, team.slug, collegeOfMatch[1]);
      linkSlugVariants(uf, bySlug, team.slug, `${collegeOfMatch[1]}-jc`);
    }

    const embeddedCollegeOfMatch = team.slug.match(/^(.+)-college-of-(.+)$/);
    if (embeddedCollegeOfMatch) {
      linkSlugVariants(uf, bySlug, team.slug, embeddedCollegeOfMatch[1]);
    }

    const collMatch = team.slug.match(/^(.+)-coll$/);
    if (collMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${collMatch[1]}-college`);
    }

    const abbrevCollegeMatch = team.slug.match(/^(.+)-c$/);
    if (abbrevCollegeMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${abbrevCollegeMatch[1]}-college`);
      linkSlugVariants(uf, bySlug, team.slug, `${abbrevCollegeMatch[1]}-university`);
    }

    const ccMatch = team.slug.match(/^(.+)-cc$/);
    if (ccMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${ccMatch[1]}-college`);
      linkSlugVariants(uf, bySlug, team.slug, ccMatch[1]);
    }

    const jcMatch = team.slug.match(/^(.+)-jc$/);
    if (jcMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${jcMatch[1]}-college`);
      linkSlugVariants(uf, bySlug, team.slug, jcMatch[1]);
    }

    const coMatch = team.slug.match(/^(.+)-co$/);
    if (coMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${coMatch[1]}-county-community-college`);
      linkSlugVariants(uf, bySlug, team.slug, `${coMatch[1]}-county-college`);
    }

    const communityCollegeMatch = team.slug.match(/^(.+)-community-college(?:-[a-z])?$/);
    if (communityCollegeMatch) {
      const base = communityCollegeMatch[1];
      linkSlugVariants(uf, bySlug, team.slug, base);
      linkSlugVariants(uf, bySlug, team.slug, `${base}-college`);
      linkSlugVariants(uf, bySlug, team.slug, `${base}-cc`);
      linkSlugVariants(uf, bySlug, team.slug, `${base}-jc`);
    }

    const stateCommunityCollegeMatch = team.slug.match(/^(.+)-state-community-college$/);
    if (stateCommunityCollegeMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${stateCommunityCollegeMatch[1]}-st`);
    }

    const areaCommunityCollegeMatch = team.slug.match(/^(.+)-area-community-college$/);
    if (areaCommunityCollegeMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${areaCommunityCollegeMatch[1]}-area`);
      linkSlugVariants(uf, bySlug, team.slug, areaCommunityCollegeMatch[1]);
    }

    const countyCollegeMatch = team.slug.match(/^(.+)-county-(?:community-)?college$/);
    if (countyCollegeMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${countyCollegeMatch[1]}-co`);
      linkSlugVariants(uf, bySlug, team.slug, countyCollegeMatch[1]);
    }

    const technicalCollegeMatch = team.slug.match(/^(.+)-technical-college$/);
    if (technicalCollegeMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${technicalCollegeMatch[1]}-tech`);
    }

    const techUniversityMatch = team.slug.match(/^(.+)-technological-university$/);
    if (techUniversityMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${techUniversityMatch[1]}-tech`);
    }

    const techUnivMatch = team.slug.match(/^(.+)-tech-university$/);
    if (techUnivMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${techUnivMatch[1]}-tech`);
    }

    const internationalUniversityMatch = team.slug.match(/^(.+)-international-university$/);
    if (internationalUniversityMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${internationalUniversityMatch[1]}-university`);
    }

    const academyMatch = team.slug.match(/^(.+)-academy$/);
    if (academyMatch && !team.slug.startsWith("u-s-")) {
      linkSlugVariants(uf, bySlug, team.slug, academyMatch[1]);
    }

    const polytechnicMatch = team.slug.match(/^(.+)-polytechnic-institute$/);
    if (polytechnicMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${polytechnicMatch[1]}-poly`);
    }

    const sunyStateNyMatch = team.slug.match(/^(.+)-state-university-of-new-york$/);
    if (sunyStateNyMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${sunyStateNyMatch[1]}-st`);
    }

    const sunyAtMatch = team.slug.match(/^state-university-of-new-york-at-(.+)$/);
    if (sunyAtMatch) {
      linkSlugVariants(uf, bySlug, team.slug, sunyAtMatch[1]);
      linkSlugVariants(uf, bySlug, team.slug, `${sunyAtMatch[1]}-st`);
    }

    const uniAtMatch = team.slug.match(/^university-at-(.+)$/);
    if (uniAtMatch) {
      linkSlugVariants(uf, bySlug, team.slug, uniAtMatch[1]);
    }

    const uncAtMatch = team.slug.match(/^(?:unc-)?(?:the-)?university-of-north-carolina-at-(.+)$/);
    if (uncAtMatch) {
      linkSlugVariants(uf, bySlug, team.slug, uncAtMatch[1]);
    }

    const uniOfAtMatch = team.slug.match(/^university-of-(.+)-at-(.+)$/);
    if (uniOfAtMatch) {
      linkSlugVariants(uf, bySlug, team.slug, uniOfAtMatch[2]);
    }

    const commMatch = team.slug.match(/^(.+)-comm$/);
    if (commMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${commMatch[1]}-commonwealth-university`);
    }

    const baptMatch = team.slug.match(/^(.+)-bapt$/);
    if (baptMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${baptMatch[1]}-baptist-college`);
    }

    const collegeOfTheMatch = team.slug.match(/^college-of-the-(.+)$/);
    if (collegeOfTheMatch) {
      linkSlugVariants(uf, bySlug, team.slug, collegeOfTheMatch[1]);
      linkSlugVariants(uf, bySlug, team.slug, `${collegeOfTheMatch[1]}-cc`);
    }

    if (team.slug === "u-s-coast-guard-academy") {
      linkSlugVariants(uf, bySlug, team.slug, "coast-guard");
    }
    if (team.slug === "u-s-air-force-academy") {
      linkSlugVariants(uf, bySlug, team.slug, "air-force");
    }

    const abbrevUnivMatch = team.slug.match(/^(.+)-u$/);
    if (abbrevUnivMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${abbrevUnivMatch[1]}-university`);
    }

    const theCollegeMatch = team.slug.match(/^the-(.+)-college$/);
    if (theCollegeMatch) {
      linkSlugVariants(uf, bySlug, team.slug, theCollegeMatch[1]);
    }

    const uniTheMatch = team.slug.match(/^university-of-the-(.+)$/);
    if (uniTheMatch) {
      linkSlugVariants(uf, bySlug, team.slug, uniTheMatch[1]);
    }

    const collegeStateMatch = team.slug.match(/^(.+)-college-([a-z]{2})$/);
    if (collegeStateMatch) {
      linkSlugVariants(
        uf,
        bySlug,
        team.slug,
        `${collegeStateMatch[1]}-${collegeStateMatch[2]}`,
      );
    }

    const uniStateMatch = team.slug.match(/^(.+)-university-([a-z]{2})$/);
    if (uniStateMatch) {
      linkSlugVariants(
        uf,
        bySlug,
        team.slug,
        `${uniStateMatch[1]}-${uniStateMatch[2]}`,
      );
    }

    const stateCollegeMatch = team.slug.match(/^(.+)-state-college$/);
    if (stateCollegeMatch) {
      linkSlugVariants(uf, bySlug, team.slug, `${stateCollegeMatch[1]}-st`);
      if (!bySlug.get(`${stateCollegeMatch[1]}-st`)) {
        linkSlugVariants(uf, bySlug, team.slug, stateCollegeMatch[1]);
      }
    }

    const techAbbrevMatch = team.slug.match(/^(.+)-tech$/);
    if (techAbbrevMatch) {
      linkSlugVariants(
        uf,
        bySlug,
        team.slug,
        `${techAbbrevMatch[1]}-technical-community-college`,
      );
    }

    const sunyMatch = team.slug.match(/^suny-(.+)$/);
    if (sunyMatch) {
      linkSlugVariants(uf, bySlug, team.slug, sunyMatch[1]);
    }

    const sunyStateUniversityMatch = team.slug.match(/^suny-(.+)-state-university$/);
    if (sunyStateUniversityMatch) {
      linkSlugVariants(
        uf,
        bySlug,
        team.slug,
        `${sunyStateUniversityMatch[1]}-st`,
      );
    }

    const adolphusCollegeMatch = team.slug.match(/^(.+)-adolphus-college$/);
    if (adolphusCollegeMatch) {
      linkSlugVariants(uf, bySlug, team.slug, adolphusCollegeMatch[1]);
    }

    if (team.slug === "sewanee-the-university-of-the-south") {
      linkSlugVariants(uf, bySlug, team.slug, "sewanee");
    }

    if (team.slug === "university-of-northwestern-mn") {
      linkSlugVariants(uf, bySlug, team.slug, "northwestern");
    }

    if (team.slug === "william-pater") {
      linkSlugVariants(uf, bySlug, team.slug, "william-paterson-university");
    }

    if (team.slug === "montreat-anderson-college") {
      linkSlugVariants(uf, bySlug, team.slug, "montreat-college");
    }

    if (team.slug === "calumet-college-of-saint-joseph") {
      linkSlugVariants(uf, bySlug, team.slug, "calumet-college");
    }

    if (team.slug === "montana-technological-university") {
      linkSlugVariants(uf, bySlug, team.slug, "montana-tech-university");
    }

    if (team.slug === "ky-christian") {
      linkSlugVariants(uf, bySlug, team.slug, "kentucky-christian-university");
    }

    if (team.slug === "haskell-university") {
      linkSlugVariants(uf, bySlug, team.slug, "haskell-indian-nations-university");
    }

    if (team.slug === "university-of-mobile") {
      linkSlugVariants(uf, bySlug, team.slug, "mobile-al");
    }

    if (team.slug === "alfred-state-college-state-university-ny") {
      linkSlugVariants(uf, bySlug, team.slug, "alfred-st");
    }

    if (team.slug === "lake-region-state-college") {
      linkSlugVariants(uf, bySlug, team.slug, "lake-region");
    }

    if (team.slug === "marion-military-institute") {
      linkSlugVariants(uf, bySlug, team.slug, "marion-mi");
    }

    if (team.slug === "the-pennsylvania-state-university") {
      linkSlugVariants(uf, bySlug, team.slug, "penn-state");
    }
  }

  linkByNormalizedName(uf, teamsInLeague);
  linkByLooseName(uf, teamsInLeague);
  linkSunyAbbreviations(uf, teamsInLeague);

  for (const team of teamsInLeague) {
    if (team.slug.endsWith("-united-states")) {
      linkSlugVariants(uf, bySlug, team.slug, team.slug.replace(/-united-states$/, ""));
    }
  }

  if (leagueSlug === "ncaa") {
    for (const [alias, canonical] of loadNcaaManualAliasSlugPairs()) {
      linkSlugVariants(uf, bySlug, alias, canonical);
    }

    const report = loadNcaaTeamAliasReport();
    for (const group of buildNcaaTeamMergeGroups(report)) {
      const ids = group.slugVariants
        .map((slug) => bySlug.get(slug)?.id)
        .filter((id): id is number => id != null);
      for (let i = 1; i < ids.length; i += 1) {
        uf.union(ids[0], ids[i]);
      }
    }
  }

  const grouped = new Map<number, CollegeTeamRow[]>();
  for (const team of teamsInLeague) {
    const root = uf.find(team.id);
    const bucket = grouped.get(root) ?? [];
    bucket.push(team);
    grouped.set(root, bucket);
  }

  return [...grouped.values()].filter((group) => group.length > 1);
}

async function loadLeagueTeams(
  leagueSlug: string,
  database: DbClient,
): Promise<{ leagueId: number; teams: CollegeTeamRow[] } | null> {
  const [league] = await database
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, leagueSlug))
    .limit(1);
  if (!league) return null;

  const rows = await database.execute(sql`
    SELECT
      t.id,
      t.slug,
      t.name,
      COALESCE(ps.stints, 0)::int AS stints,
      COALESCE(pss.stats, 0)::int AS stats
    FROM teams t
    LEFT JOIN (
      SELECT team_id, COUNT(*)::int AS stints
      FROM player_stints
      GROUP BY team_id
    ) ps ON ps.team_id = t.id
    LEFT JOIN (
      SELECT team_id, COUNT(*)::int AS stats
      FROM player_season_stats
      GROUP BY team_id
    ) pss ON pss.team_id = t.id
    WHERE t.league_id = ${league.id}
  `);

  return {
    leagueId: league.id,
    teams: rows.rows as CollegeTeamRow[],
  };
}

export async function findCollegeDuplicateMergePlans(
  leagueSlugs: readonly string[] = TARGET_LEAGUE_SLUGS,
  database: DbClient = db,
): Promise<CollegeDuplicateMergePlan[]> {
  const plans: CollegeDuplicateMergePlan[] = [];

  for (const leagueSlug of leagueSlugs) {
    const loaded = await loadLeagueTeams(leagueSlug, database);
    if (!loaded) continue;

    for (const group of buildDuplicateGroups(leagueSlug, loaded.teams)) {
      const keep = pickKeepTeam(group);
      const duplicates = group.filter((team) => team.id !== keep.id);
      if (duplicates.length === 0) continue;

      plans.push({
        leagueSlug,
        keepTeamId: keep.id,
        keepSlug: keep.slug,
        keepName: pickBestDisplayName(group),
        duplicateTeamIds: duplicates.map((team) => team.id),
        duplicateSlugs: duplicates.map((team) => team.slug),
      });
    }
  }

  return plans.sort((a, b) => a.keepName.localeCompare(b.keepName));
}

export async function executeCollegeDuplicateMergePlan(
  plan: CollegeDuplicateMergePlan,
  groupTeams: CollegeTeamRow[],
  database: DbClient = db,
): Promise<CollegeDuplicateMergeResult> {
  const merges: MergeTeamsResult[] = [];
  let keepTeamId = plan.keepTeamId;

  for (const duplicateId of plan.duplicateTeamIds) {
    const result = await mergeTeamInto(duplicateId, keepTeamId, database);
    merges.push(result);
    keepTeamId = result.keptTeamId;
  }

  const bestName = pickBestDisplayName(groupTeams);
  const [current] = await database
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.id, keepTeamId))
    .limit(1);

  let nameUpdated = false;
  if (current && current.name !== bestName) {
    await database
      .update(teams)
      .set({ name: bestName })
      .where(eq(teams.id, keepTeamId));
    nameUpdated = true;
  }

  return { plan: { ...plan, keepTeamId, keepName: bestName }, merges, nameUpdated };
}

export async function mergeAllCollegeDuplicateTeams(
  leagueSlugs: readonly string[] = TARGET_LEAGUE_SLUGS,
  database: DbClient = db,
): Promise<CollegeDuplicateMergeResult[]> {
  const results: CollegeDuplicateMergeResult[] = [];

  for (const leagueSlug of leagueSlugs) {
    const loaded = await loadLeagueTeams(leagueSlug, database);
    if (!loaded) continue;

    for (const group of buildDuplicateGroups(leagueSlug, loaded.teams)) {
      const keep = pickKeepTeam(group);
      const duplicates = group.filter((team) => team.id !== keep.id);
      if (duplicates.length === 0) continue;

      const plan: CollegeDuplicateMergePlan = {
        leagueSlug,
        keepTeamId: keep.id,
        keepSlug: keep.slug,
        keepName: pickBestDisplayName(group),
        duplicateTeamIds: duplicates.map((team) => team.id),
        duplicateSlugs: duplicates.map((team) => team.slug),
      };

      results.push(await executeCollegeDuplicateMergePlan(plan, group, database));
    }
  }

  return results;
}
