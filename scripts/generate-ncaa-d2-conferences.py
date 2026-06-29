#!/usr/bin/env python3
"""Regenerate client/src/lib/ncaa-d2-conferences.ts from RealGM 2025-26 team list."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(__file__).resolve().parent / "ncaa-d2-current-teams.json"
DB_ALIASES = Path(__file__).resolve().parent / "ncaa-d2-db-aliases.json"
OUTPUT = ROOT / "client/src/lib/ncaa-d2-conferences.ts"

CONFERENCE_DISPLAY: dict[str, str] = {
    "california-collegiate-athletic-association": "California Collegiate Athletic Association",
    "central-atlantic-collegiate-conference": "Central Atlantic Collegiate Conference",
    "central-intercollegiate-athletic-association": "Central Intercollegiate Athletic Association",
    "conference-carolinas": "Conference Carolinas",
    "division-ii-independent-conference": "Independent",
    "east-coast-conference": "East Coast Conference",
    "great-american-conference": "Great American Conference",
    "great-lakes-intercollegiate-athletic-conference": "Great Lakes Intercollegiate Athletic Conference",
    "great-lakes-valley-conference": "Great Lakes Valley Conference",
    "great-midwest-athletic-conference": "Great Midwest Athletic Conference",
    "great-northwest-athletic-conference": "Great Northwest Athletic Conference",
    "gulf-south-conference": "Gulf South Conference",
    "lone-star-conference": "Lone Star Conference",
    "mid-america-intercollegiate-athletics-association": "Mid-America Intercollegiate Athletics Association",
    "mountain-east-conference": "Mountain East Conference",
    "northeast-10-conference": "Northeast-10 Conference",
    "northern-sun-intercollegiate-conference": "Northern Sun Intercollegiate Conference",
    "pacific-west-conference": "Pacific West Conference",
    "peach-belt-conference": "Peach Belt Conference",
    "pennsylvania-state-athletic-conference": "Pennsylvania State Athletic Conference",
    "rocky-mountain-athletic-conference": "Rocky Mountain Athletic Conference",
    "south-atlantic-conference": "South Atlantic Conference",
    "southern-intercollegiate-athletic-conference": "Southern Intercollegiate Athletic Conference",
    "sunshine-state-conference": "Sunshine State Conference",
}


def slugify(value: str) -> str:
    normalized = (
        value.replace("'", "")
        .replace(".", "")
        .replace("&", " and ")
        .strip()
        .lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", normalized)
    return slug.strip("-")


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=True)


def fmt_string_list(values: list[str]) -> str:
    if not values:
        return "[]"
    lines = ",\n".join(f"    {js_string(value)}" for value in values)
    return f"[\n{lines},\n  ]"


def add_alias(aliases: set[str], value: str | None) -> None:
    if not value:
        return
    cleaned = value.strip()
    if not cleaned:
        return
    aliases.add(cleaned)
    slug = slugify(cleaned)
    if slug:
        aliases.add(slug)


def school_aliases(school: str, nickname: str) -> tuple[set[str], set[str]]:
    slugs: set[str] = set()
    names: set[str] = set()

    add_alias(names, school)
    add_alias(slugs, school)

    if nickname:
        add_alias(names, nickname)
        add_alias(slugs, nickname)
        add_alias(names, f"{school} {nickname}")
        add_alias(slugs, f"{school} {nickname}")

    school_no_paren = re.sub(r"\s*\([^)]*\)", "", school).strip()
    if school_no_paren != school:
        add_alias(names, school_no_paren)
        add_alias(slugs, school_no_paren)

    for old, new in (
        ("St.", "Saint"),
        ("St ", "Saint "),
        (" - ", " "),
        ("University of ", ""),
    ):
        if old in school:
            variant = school.replace(old, new).strip()
            add_alias(names, variant)
            add_alias(slugs, variant)

    return slugs, names


def load_db_aliases() -> tuple[dict[str, str], set[str]]:
    if not DB_ALIASES.exists():
        return {}, set()
    payload = json.loads(DB_ALIASES.read_text(encoding="utf-8"))
    aliases = {
        str(key).strip().lower(): str(value).strip().lower()
        for key, value in payload.get("aliases", {}).items()
    }
    current_slugs = {str(slug).strip().lower() for slug in payload.get("currentSlugs", [])}
    return aliases, current_slugs


def main() -> None:
    teams = json.loads(SOURCE.read_text(encoding="utf-8"))
    db_aliases, current_slugs = load_db_aliases()
    by_conference: dict[str, list[dict[str, str]]] = defaultdict(list)

    for team in teams:
        conference_slug = slugify(team["conference"])
        by_conference[conference_slug].append(team)

    conferences: list[dict[str, object]] = []
    school_to_conference: dict[str, str] = {}

    for conference_slug in sorted(by_conference.keys(), key=lambda slug: CONFERENCE_DISPLAY.get(slug, slug)):
        members = by_conference[conference_slug]
        team_slugs: set[str] = set()
        team_names: set[str] = set()
        canonical_schools: list[str] = []

        for member in sorted(members, key=lambda row: row["school"].lower()):
            school = member["school"]
            nickname = member.get("nickname", "")
            canonical_schools.append(school)
            slugs, names = school_aliases(school, nickname)
            team_slugs.update(slugs)
            team_names.update(names)
            school_to_conference[slugify(school)] = conference_slug

        for alias, canonical in db_aliases.items():
            if school_to_conference.get(canonical) == conference_slug:
                add_alias(team_slugs, alias)
                add_alias(team_names, alias)

        display_name = CONFERENCE_DISPLAY.get(conference_slug, members[0]["conference"])
        conferences.append(
            {
                "slug": conference_slug,
                "name": display_name,
                "teamSlugs": sorted(team_slugs),
                "teamNames": sorted(team_names),
                "canonicalSchools": sorted(set(canonical_schools)),
            }
        )

    conference_blocks = []
    for conference in conferences:
        conference_blocks.append(
            f"""  {{
    slug: {js_string(conference["slug"])},
    name: {js_string(conference["name"])},
    teamSlugs: {fmt_string_list(conference["teamSlugs"])},
    teamNames: {fmt_string_list(conference["teamNames"])},
    canonicalSchools: {fmt_string_list(conference["canonicalSchools"])},
  }}"""
        )

    school_map_lines = ",\n".join(
        f"  {js_string(school)}: {js_string(conference_slug)}"
        for school, conference_slug in sorted(school_to_conference.items())
    )

    alias_map_lines = ",\n".join(
        f"  {js_string(alias)}: {js_string(canonical)}"
        for alias, canonical in sorted(db_aliases.items())
    )

    current_slug_lines = ",\n".join(
        f"  {js_string(slug)}" for slug in sorted(current_slugs)
    )

    content = f"""// Auto-generated from RealGM 2025-26 NCAA Division II team list.
// Regenerate with:
//   python3 scripts/parse-realgm-d2.py
//   python3 scripts/build-ncaa-d2-db-aliases.py
//   python3 scripts/generate-ncaa-d2-conferences.py
// Generated: {date.today().isoformat()}

export interface NcaaD2ConferenceMeta {{
  slug: string;
  name: string;
  teamSlugs: readonly string[];
  teamNames: readonly string[];
  canonicalSchools: readonly string[];
}}

export const NCAA_D2_CONFERENCES: readonly NcaaD2ConferenceMeta[] = [
{",".join(conference_blocks)},
] as const;

const CANONICAL_SCHOOL_TO_CONFERENCE: Record<string, string> = {{
{school_map_lines}
}};

const DB_ALIAS_TO_CANONICAL_SCHOOL: Record<string, string> = {{
{alias_map_lines}
}};

export const NCAA_D2_CURRENT_TEAM_SLUGS = new Set<string>([
{current_slug_lines}
]);

export const OTHER_NCAA_D2_CONFERENCE_SLUG = "other";

function nameToSlug(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}}

function normalizeName(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/&/g, " and ")
    .replace(/\\s+/g, " ");
}}

function slugMatches(teamSlug: string, conferenceSlug: string): boolean {{
  return Boolean(teamSlug && conferenceSlug && teamSlug === conferenceSlug);
}}

function resolveCanonicalSchool(team: {{ name: string; abbreviation: string; slug: string }}): string | undefined {{
  const slug = team.slug.trim().toLowerCase();
  const nameSlug = nameToSlug(team.name);
  const abbrev = team.abbreviation.trim().toLowerCase();
  const nameKey = normalizeName(team.name);

  for (const key of [slug, nameSlug, abbrev, nameKey]) {{
    if (!key) continue;
    const canonical = DB_ALIAS_TO_CANONICAL_SCHOOL[key];
    if (canonical) return canonical;
  }}

  const stripped = nameToSlug(team.name.replace(/\\s*\\([^)]*\\)/g, "").trim());
  return stripped || undefined;
}}

export function isCurrentNcaaD2Team(team: {{ name: string; abbreviation: string; slug: string }}): boolean {{
  const canonical = resolveCanonicalSchool(team);
  if (canonical && CANONICAL_SCHOOL_TO_CONFERENCE[canonical]) return true;

  for (const conference of NCAA_D2_CONFERENCES) {{
    if (teamMatchesConference(team, conference)) return true;
  }}

  return false;
}}

function teamMatchesConference(
  team: {{ name: string; abbreviation: string; slug: string }},
  conference: NcaaD2ConferenceMeta,
): boolean {{
  const slug = team.slug.trim().toLowerCase();
  const nameSlug = nameToSlug(team.name);
  const normalizedTeamName = normalizeName(team.name);

  for (const conferenceSlug of conference.teamSlugs) {{
    if (slugMatches(slug, conferenceSlug)) return true;
    if (nameSlug && slugMatches(nameSlug, conferenceSlug)) return true;
  }}

  for (const conferenceName of conference.teamNames) {{
    const normalizedConferenceName = normalizeName(conferenceName);
    if (normalizedConferenceName === normalizedTeamName) return true;
    if (normalizedConferenceName.startsWith(`${{normalizedTeamName}} `)) return true;
    if (normalizedTeamName.startsWith(`${{normalizedConferenceName}} `)) return true;
  }}

  const canonical = resolveCanonicalSchool(team);
  if (canonical && CANONICAL_SCHOOL_TO_CONFERENCE[canonical] === conference.slug) {{
    return true;
  }}

  return false;
}}

export function conferenceForNcaaD2Team(
  team: {{ name: string; abbreviation: string; slug: string }},
): string {{
  if (!isCurrentNcaaD2Team(team)) {{
    return OTHER_NCAA_D2_CONFERENCE_SLUG;
  }}

  const canonical = resolveCanonicalSchool(team);
  if (canonical && CANONICAL_SCHOOL_TO_CONFERENCE[canonical]) {{
    return CANONICAL_SCHOOL_TO_CONFERENCE[canonical];
  }}

  for (const conference of NCAA_D2_CONFERENCES) {{
    if (teamMatchesConference(team, conference)) {{
      return conference.slug;
    }}
  }}
  return OTHER_NCAA_D2_CONFERENCE_SLUG;
}}

export function getNcaaD2Conference(slug: string): NcaaD2ConferenceMeta | undefined {{
  return NCAA_D2_CONFERENCES.find((conference) => conference.slug === slug);
}}

export interface NcaaD2ConferenceGroup<T> {{
  conference: NcaaD2ConferenceMeta | {{ slug: string; name: string }};
  teams: T[];
}}

function pickPreferredDuplicateTeam<T extends {{ name: string; abbreviation: string; slug: string }}>(
  current: T,
  candidate: T,
): T {{
  const currentSlug = current.slug.trim().toLowerCase();
  const candidateSlug = candidate.slug.trim().toLowerCase();

  if (candidateSlug.length !== currentSlug.length) {{
    return candidateSlug.length > currentSlug.length ? candidate : current;
  }}

  return candidateSlug.localeCompare(currentSlug) < 0 ? candidate : current;
}}

function dedupeKeyForTeam(team: {{ name: string; abbreviation: string; slug: string }}): string {{
  const canonical = resolveCanonicalSchool(team) ?? normalizeName(team.name.replace(/\\s*\\([^)]*\\)/g, "").trim());
  if (canonical) return `canonical:${{canonical}}`;
  const normalized = normalizeName(team.name.replace(/\\s*\\([^)]*\\)/g, "").trim());
  if (normalized) return `name:${{normalized}}`;
  return `slug:${{team.slug.trim().toLowerCase()}}`;
}}

function dedupeTeamsBySchool<T extends {{ name: string; abbreviation: string; slug: string }}>(
  teams: T[],
): T[] {{
  const byKey = new Map<string, T>();

  for (const team of teams) {{
    const key = dedupeKeyForTeam(team);
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickPreferredDuplicateTeam(existing, team) : team);
  }}

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}}

export function groupNcaaD2TeamsByConference<T extends {{ name: string; abbreviation: string; slug: string }}>(
  teams: T[],
): NcaaD2ConferenceGroup<T>[] {{
  const buckets = new Map<string, T[]>();

  for (const team of teams) {{
    const conferenceSlug = conferenceForNcaaD2Team(team);
    const existing = buckets.get(conferenceSlug) ?? [];
    existing.push(team);
    buckets.set(conferenceSlug, existing);
  }}

  const groups: NcaaD2ConferenceGroup<T>[] = NCAA_D2_CONFERENCES.map((conference) => ({{
    conference,
    teams: dedupeTeamsBySchool(buckets.get(conference.slug) ?? []),
  }})).filter((group) => group.teams.length > 0);

  const otherTeams = dedupeTeamsBySchool(buckets.get(OTHER_NCAA_D2_CONFERENCE_SLUG) ?? []);
  if (otherTeams.length > 0) {{
    groups.push({{
      conference: {{ slug: OTHER_NCAA_D2_CONFERENCE_SLUG, name: "Other" }},
      teams: otherTeams,
    }});
  }}

  return groups;
}}
"""

    OUTPUT.write_text(content, encoding="utf-8")
    print(f"Wrote {len(conferences)} conferences ({len(teams)} current teams) to {OUTPUT}")


if __name__ == "__main__":
    main()
