export interface CollegeConferenceMeta {
  slug: string;
  name: string;
  teamSlugs: readonly string[];
  teamNames: readonly string[];
  canonicalSchools?: readonly string[];
}

export interface CollegeConferenceConfig {
  conferences: readonly CollegeConferenceMeta[];
  canonicalSchoolToConference: Readonly<Record<string, string>>;
  dbAliasToCanonicalSchool: Readonly<Record<string, string>>;
  currentTeamSlugs?: ReadonlySet<string>;
  otherConferenceSlug?: string;
  /** When false, all teams are matched to conferences (no "current roster" gate). */
  requireCurrentTeam?: boolean;
}

export interface CollegeConferenceGroup<T> {
  conference: CollegeConferenceMeta | { slug: string; name: string };
  teams: T[];
}

export function createCollegeConferenceGrouper(config: CollegeConferenceConfig) {
  const OTHER_SLUG = config.otherConferenceSlug ?? "other";

  function nameToSlug(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[''.]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function normalizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[''.]/g, "")
      .replace(/&/g, " and ")
      .replace(/\s+/g, " ");
  }

  function slugMatches(teamSlug: string, conferenceSlug: string): boolean {
    return Boolean(teamSlug && conferenceSlug && teamSlug === conferenceSlug);
  }

  function resolveCanonicalSchool(team: {
    name: string;
    abbreviation: string;
    slug: string;
  }): string | undefined {
    const slug = team.slug.trim().toLowerCase();
    const nameSlug = nameToSlug(team.name);
    const abbrev = team.abbreviation.trim().toLowerCase();
    const nameKey = normalizeName(team.name);

    for (const key of [slug, nameSlug, abbrev, nameKey]) {
      if (!key) continue;
      const canonical = config.dbAliasToCanonicalSchool[key];
      if (canonical) return canonical;
    }

    const stripped = nameToSlug(team.name.replace(/\s*\([^)]*\)/g, "").trim());
    return stripped || undefined;
  }

  function teamMatchesConference(
    team: { name: string; abbreviation: string; slug: string },
    conference: CollegeConferenceMeta,
  ): boolean {
    const slug = team.slug.trim().toLowerCase();
    const nameSlug = nameToSlug(team.name);
    const normalizedTeamName = normalizeName(team.name);

    for (const conferenceSlug of conference.teamSlugs) {
      if (slugMatches(slug, conferenceSlug)) return true;
      if (nameSlug && slugMatches(nameSlug, conferenceSlug)) return true;
    }

    for (const conferenceName of conference.teamNames) {
      const normalizedConferenceName = normalizeName(conferenceName);
      if (normalizedConferenceName === normalizedTeamName) return true;
      if (normalizedConferenceName.startsWith(`${normalizedTeamName} `)) return true;
      if (normalizedTeamName.startsWith(`${normalizedConferenceName} `)) return true;
    }

    const canonical = resolveCanonicalSchool(team);
    if (canonical && config.canonicalSchoolToConference[canonical] === conference.slug) {
      return true;
    }

    return false;
  }

  function isKnownTeam(team: { name: string; abbreviation: string; slug: string }): boolean {
    if (config.requireCurrentTeam === false) return true;

    const currentSlugs = config.currentTeamSlugs;
    if (currentSlugs?.size) {
      const slug = team.slug.trim().toLowerCase();
      if (currentSlugs.has(slug)) return true;
    }

    const canonical = resolveCanonicalSchool(team);
    if (canonical && config.canonicalSchoolToConference[canonical]) return true;

    for (const conference of config.conferences) {
      if (teamMatchesConference(team, conference)) return true;
    }

    return false;
  }

  function conferenceForTeam(team: { name: string; abbreviation: string; slug: string }): string {
    if (!isKnownTeam(team)) return OTHER_SLUG;

    const canonical = resolveCanonicalSchool(team);
    if (canonical && config.canonicalSchoolToConference[canonical]) {
      return config.canonicalSchoolToConference[canonical];
    }

    for (const conference of config.conferences) {
      if (teamMatchesConference(team, conference)) return conference.slug;
    }

    return OTHER_SLUG;
  }

  function getConference(slug: string): CollegeConferenceMeta | undefined {
    return config.conferences.find((conference) => conference.slug === slug);
  }

  function pickPreferredDuplicateTeam<T extends { name: string; abbreviation: string; slug: string }>(
    current: T,
    candidate: T,
  ): T {
    const currentSlug = current.slug.trim().toLowerCase();
    const candidateSlug = candidate.slug.trim().toLowerCase();

    if (candidateSlug.length !== currentSlug.length) {
      return candidateSlug.length > currentSlug.length ? candidate : current;
    }

    return candidateSlug.localeCompare(currentSlug) < 0 ? candidate : current;
  }

  function dedupeKeyForTeam(team: { name: string; abbreviation: string; slug: string }): string {
    const canonical =
      resolveCanonicalSchool(team) ??
      normalizeName(team.name.replace(/\s*\([^)]*\)/g, "").trim());
    if (canonical) return `canonical:${canonical}`;
    const normalized = normalizeName(team.name.replace(/\s*\([^)]*\)/g, "").trim());
    if (normalized) return `name:${normalized}`;
    return `slug:${team.slug.trim().toLowerCase()}`;
  }

  function dedupeTeamsBySchool<T extends { name: string; abbreviation: string; slug: string }>(
    teams: T[],
  ): T[] {
    const byKey = new Map<string, T>();

    for (const team of teams) {
      const key = dedupeKeyForTeam(team);
      const existing = byKey.get(key);
      byKey.set(key, existing ? pickPreferredDuplicateTeam(existing, team) : team);
    }

    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  function groupTeamsByConference<T extends { name: string; abbreviation: string; slug: string }>(
    teams: T[],
  ): CollegeConferenceGroup<T>[] {
    const buckets = new Map<string, T[]>();

    for (const team of teams) {
      const conferenceSlug = conferenceForTeam(team);
      const existing = buckets.get(conferenceSlug) ?? [];
      existing.push(team);
      buckets.set(conferenceSlug, existing);
    }

    const groups: CollegeConferenceGroup<T>[] = config.conferences
      .map((conference) => ({
        conference,
        teams: dedupeTeamsBySchool(buckets.get(conference.slug) ?? []),
      }))
      .filter((group) => group.teams.length > 0);

    const otherTeams = dedupeTeamsBySchool(buckets.get(OTHER_SLUG) ?? []);
    if (otherTeams.length > 0) {
      groups.push({
        conference: { slug: OTHER_SLUG, name: "Other" },
        teams: otherTeams,
      });
    }

    return groups;
  }

  return {
    OTHER_SLUG,
    conferenceForTeam,
    getConference,
    groupTeamsByConference,
    isKnownTeam,
  };
}
