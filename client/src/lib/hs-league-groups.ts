import {
  allHsProvinceSlugs,
  HS_CANADA_REGION_SLUG,
  isCanadianHsTeamSlug,
  isKnownHsProvinceSlug,
  provinceNameFromSlug,
  provinceSlugFromTeamSlug,
} from "./hs-ca-provinces";
import {
  allHsStateSlugs,
  HS_OTHER_STATE_SLUG,
  HS_USA_REGION_SLUG,
  isKnownHsStateSlug,
  stateNameFromSlug,
  stateSlugFromTeamSlug,
} from "./hs-us-states";

export const HS_LEAGUE_SLUG = "high-school";
export const HS_GIRLS_LEAGUE_SLUG = "high-school-w";

const HS_LEAGUE_SLUGS = new Set([HS_LEAGUE_SLUG, HS_GIRLS_LEAGUE_SLUG]);

export { HS_CANADA_REGION_SLUG, HS_USA_REGION_SLUG };

export interface HsStateGroup<T extends { slug: string }> {
  state: { slug: string; name: string };
  teams: T[];
}

export interface HsProvinceGroup<T extends { slug: string }> {
  province: { slug: string; name: string };
  teams: T[];
}

export interface HsRegionGroup {
  region: { slug: string; name: string };
  teamCount: number;
}

export function isHighSchoolLeague(slug: string): boolean {
  return HS_LEAGUE_SLUGS.has(slug.trim().toLowerCase());
}

export function groupHighSchoolTeamsByState<T extends { slug: string }>(
  teams: T[],
): HsStateGroup<T>[] {
  const usTeams = teams.filter((team) => !isCanadianHsTeamSlug(team.slug));
  const byState = new Map<string, T[]>();

  for (const slug of allHsStateSlugs()) {
    byState.set(slug, []);
  }

  for (const team of usTeams) {
    const stateSlug = stateSlugFromTeamSlug(team.slug);
    const bucket = byState.get(stateSlug) ?? byState.get(HS_OTHER_STATE_SLUG)!;
    bucket.push(team);
  }

  return allHsStateSlugs()
    .map((stateSlug) => ({
      state: { slug: stateSlug, name: stateNameFromSlug(stateSlug) },
      teams: byState.get(stateSlug) ?? [],
    }))
    .filter((group) => group.teams.length > 0);
}

export function groupHighSchoolTeamsByProvince<T extends { slug: string }>(
  teams: T[],
): HsProvinceGroup<T>[] {
  const caTeams = teams.filter((team) => isCanadianHsTeamSlug(team.slug));
  const byProvince = new Map<string, T[]>();

  for (const slug of allHsProvinceSlugs()) {
    byProvince.set(slug, []);
  }

  for (const team of caTeams) {
    const provinceSlug = provinceSlugFromTeamSlug(team.slug);
    if (!provinceSlug) continue;
    const bucket = byProvince.get(provinceSlug);
    if (bucket) bucket.push(team);
  }

  return allHsProvinceSlugs()
    .map((provinceSlug) => ({
      province: { slug: provinceSlug, name: provinceNameFromSlug(provinceSlug) },
      teams: byProvince.get(provinceSlug) ?? [],
    }))
    .filter((group) => group.teams.length > 0);
}

export function getHighSchoolRegions(allTeams: { slug: string }[]): HsRegionGroup[] {
  if (allTeams.length <= 0) return [];
  const usCount = allTeams.filter((team) => !isCanadianHsTeamSlug(team.slug)).length;
  const caCount = allTeams.filter((team) => isCanadianHsTeamSlug(team.slug)).length;
  return [
    { region: { slug: HS_USA_REGION_SLUG, name: "United States" }, teamCount: usCount },
    { region: { slug: HS_CANADA_REGION_SLUG, name: "Canada" }, teamCount: caCount },
  ];
}

export function getHighSchoolRegion(slug: string): { slug: string; name: string } | undefined {
  const normalized = slug.trim().toLowerCase();
  if (normalized === HS_USA_REGION_SLUG) {
    return { slug: HS_USA_REGION_SLUG, name: "United States" };
  }
  if (normalized === HS_CANADA_REGION_SLUG) {
    return { slug: HS_CANADA_REGION_SLUG, name: "Canada" };
  }
  return undefined;
}

export function isKnownHsAreaSlug(areaSlug: string): boolean {
  return isKnownHsStateSlug(areaSlug) || isKnownHsProvinceSlug(areaSlug);
}

export function hsAreaNameFromSlug(areaSlug: string): string {
  if (isKnownHsProvinceSlug(areaSlug)) return provinceNameFromSlug(areaSlug);
  return stateNameFromSlug(areaSlug);
}
