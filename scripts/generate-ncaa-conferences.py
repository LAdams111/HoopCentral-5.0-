#!/usr/bin/env python3
"""Regenerate client/src/lib/ncaa-conferences.ts from ESPN standings (all 32 D1 conferences)."""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "client/src/lib/ncaa-conferences.ts"
MANUAL_ALIASES_PATH = ROOT / "scripts/ncaa-manual-aliases.json"
STANDINGS_URL = (
    "https://site.api.espn.com/apis/v2/sports/basketball/"
    "mens-college-basketball/standings"
)
TEAMS_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/basketball/"
    "mens-college-basketball/teams?limit=500"
)


def slugify(value: str) -> str:
    normalized = value.replace("'", "").replace(".", "").strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized)
    return slug.strip("-")


def school_slug(full_slug: str) -> str | None:
    parts = [part for part in full_slug.split("-") if part]
    if len(parts) <= 1:
        return None
    return "-".join(parts[:-1])


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


def slug_from_team_link(team: dict) -> str | None:
    for link in team.get("links", []):
        href = link.get("href", "")
        match = re.search(r"/team/_/id/\d+/([^/?#]+)", href)
        if match:
            return match.group(1).strip().lower()
    return None


def load_manual_aliases() -> dict[str, str]:
    if not MANUAL_ALIASES_PATH.exists():
        return {}
    return json.loads(MANUAL_ALIASES_PATH.read_text(encoding="utf-8"))


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url) as response:
        return json.load(response)


def build_teams_by_id() -> dict[str, dict]:
    data = fetch_json(TEAMS_URL)
    by_id: dict[str, dict] = {}
    for entry in data["sports"][0]["leagues"][0]["teams"]:
        team = entry["team"]
        by_id[team["id"]] = team
    return by_id


def main() -> None:
    standings = fetch_json(STANDINGS_URL)
    teams_by_id = build_teams_by_id()
    manual_aliases = load_manual_aliases()

    conferences: list[dict[str, object]] = []
    espn_id_to_conference: dict[str, str] = {}
    team_count = 0

    for group in standings.get("children", []):
        name = group.get("name", "").strip()
        if not name or name == "College Basketball Crown":
            continue

        conference_slug = slugify(name)
        team_slugs: set[str] = set()
        team_names: set[str] = set()
        team_abbrevs: set[str] = set()
        team_espn_ids: set[str] = set()

        for entry in group.get("standings", {}).get("entries", []):
            team = entry.get("team", {})
            espn_id = str(team.get("id", "")).strip()
            if not espn_id:
                continue

            team_count += 1
            team_espn_ids.add(espn_id)
            espn_id_to_conference[espn_id] = conference_slug

            full_team = teams_by_id.get(espn_id, {})
            slug = (
                full_team.get("slug", "").strip().lower()
                or slug_from_team_link(team)
                or ""
            )
            display_name = team.get("displayName", "").strip() or full_team.get("displayName", "").strip()
            short_name = team.get("shortDisplayName", "").strip() or full_team.get("shortDisplayName", "").strip()
            location = team.get("location", "").strip() or full_team.get("location", "").strip()
            nickname = team.get("name", "").strip() or full_team.get("nickname", "").strip()
            abbrev = team.get("abbreviation", "").strip().upper() or full_team.get("abbreviation", "").upper()

            if slug:
                team_slugs.add(slug)
                school = school_slug(slug)
                if school:
                    team_slugs.add(school)

            for label in (display_name, short_name, location, nickname):
                add_alias(team_names, label)
                add_alias(team_slugs, label)

            if abbrev:
                team_abbrevs.add(abbrev)

        for alias, canonical_slug in manual_aliases.items():
            espn_id = None
            for candidate in (canonical_slug, slugify(alias)):
                for team in teams_by_id.values():
                    if team.get("slug", "").strip().lower() == candidate:
                        espn_id = team["id"]
                        break
                if espn_id:
                    break
            if espn_id and espn_id in team_espn_ids:
                add_alias(team_slugs, alias)
                add_alias(team_names, alias)

        conferences.append(
            {
                "slug": conference_slug,
                "name": name,
                "teamSlugs": sorted(team_slugs),
                "teamNames": sorted(team_names),
                "teamAbbrevs": sorted(team_abbrevs),
                "teamEspnIds": sorted(team_espn_ids),
            }
        )

    conferences.sort(key=lambda item: str(item["name"]))

    conference_blocks = []
    for conference in conferences:
        conference_blocks.append(
            f"""  {{
    slug: {js_string(conference["slug"])},
    name: {js_string(conference["name"])},
    teamSlugs: {fmt_string_list(conference["teamSlugs"])},
    teamNames: {fmt_string_list(conference["teamNames"])},
    teamAbbrevs: {fmt_string_list(conference["teamAbbrevs"])},
    teamEspnIds: {fmt_string_list(conference["teamEspnIds"])},
  }}"""
        )

    joined_conferences = ",\n".join(conference_blocks)
    espn_id_map_lines = ",\n".join(
        f"  {js_string(espn_id)}: {js_string(conference_slug)}"
        for espn_id, conference_slug in sorted(
            espn_id_to_conference.items(), key=lambda item: int(item[0])
        )
    )

    content = f"""// Auto-generated from ESPN men's college basketball standings.
// Regenerate with: python3 scripts/generate-ncaa-conferences.py
// Generated: {date.today().isoformat()}

import {{ resolveNcaaEspnId }} from "./ncaa-team-logos";

export interface NcaaConferenceMeta {{
  slug: string;
  name: string;
  teamSlugs: readonly string[];
  teamNames: readonly string[];
  teamAbbrevs: readonly string[];
  teamEspnIds: readonly string[];
}}

export const NCAA_M_CONFERENCES: readonly NcaaConferenceMeta[] = [
{joined_conferences},
] as const;

const ESPN_ID_TO_CONFERENCE: Record<string, string> = {{
{espn_id_map_lines}
}};

export const OTHER_NCAA_M_CONFERENCE_SLUG = "other";

function nameToSlug(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}}

function normalizeName(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/\\s+/g, " ");
}}

function slugMatches(teamSlug: string, conferenceSlug: string): boolean {{
  return Boolean(teamSlug && conferenceSlug && teamSlug === conferenceSlug);
}}

function teamMatchesConference(
  team: {{ name: string; abbreviation: string; slug: string }},
  conference: NcaaConferenceMeta,
): boolean {{
  const slug = team.slug.trim().toLowerCase();
  const nameSlug = nameToSlug(team.name);
  const abbrev = team.abbreviation.trim().toUpperCase();
  const normalizedTeamName = normalizeName(team.name);

  for (const conferenceSlug of conference.teamSlugs) {{
    if (slugMatches(slug, conferenceSlug)) return true;
    if (nameSlug && slugMatches(nameSlug, conferenceSlug)) return true;
  }}

  for (const conferenceName of conference.teamNames) {{
    const normalizedConferenceName = normalizeName(conferenceName);
    if (normalizedConferenceName === normalizedTeamName) return true;
    if (normalizedConferenceName.startsWith(`${{normalizedTeamName}} `)) return true;
  }}

  if (abbrev && conference.teamAbbrevs.includes(abbrev)) return true;

  const espnId = resolveNcaaEspnId(team.name, {{
    abbreviation: team.abbreviation,
    slug: team.slug,
  }});
  if (espnId && conference.teamEspnIds.includes(espnId)) return true;

  return false;
}}

export function conferenceForNcaaTeam(
  team: {{ name: string; abbreviation: string; slug: string }},
): string {{
  const espnId = resolveNcaaEspnId(team.name, {{
    abbreviation: team.abbreviation,
    slug: team.slug,
  }});
  if (espnId && ESPN_ID_TO_CONFERENCE[espnId]) {{
    return ESPN_ID_TO_CONFERENCE[espnId];
  }}

  for (const conference of NCAA_M_CONFERENCES) {{
    if (teamMatchesConference(team, conference)) {{
      return conference.slug;
    }}
  }}
  return OTHER_NCAA_M_CONFERENCE_SLUG;
}}

export function getNcaaConference(slug: string): NcaaConferenceMeta | undefined {{
  return NCAA_M_CONFERENCES.find((conference) => conference.slug === slug);
}}

export interface NcaaConferenceGroup<T> {{
  conference: NcaaConferenceMeta | {{ slug: string; name: string }};
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

/** Collapse duplicate DB rows that resolve to the same ESPN school. */
function dedupeTeamsByEspnId<T extends {{ name: string; abbreviation: string; slug: string }}>(
  teams: T[],
): T[] {{
  const byEspnId = new Map<string, T>();
  const withoutEspnId: T[] = [];

  for (const team of teams) {{
    const espnId = resolveNcaaEspnId(team.name, {{
      abbreviation: team.abbreviation,
      slug: team.slug,
    }});

    if (!espnId) {{
      withoutEspnId.push(team);
      continue;
    }}

    const existing = byEspnId.get(espnId);
    byEspnId.set(
      espnId,
      existing ? pickPreferredDuplicateTeam(existing, team) : team,
    );
  }}

  return [...byEspnId.values(), ...withoutEspnId].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}}

export function groupNcaaTeamsByConference<T extends {{ name: string; abbreviation: string; slug: string }}>(
  teams: T[],
): NcaaConferenceGroup<T>[] {{
  const buckets = new Map<string, T[]>();

  for (const team of teams) {{
    const conferenceSlug = conferenceForNcaaTeam(team);
    const existing = buckets.get(conferenceSlug) ?? [];
    existing.push(team);
    buckets.set(conferenceSlug, existing);
  }}

  const groups: NcaaConferenceGroup<T>[] = NCAA_M_CONFERENCES.map((conference) => ({{
    conference,
    teams: dedupeTeamsByEspnId(buckets.get(conference.slug) ?? []),
  }})).filter((group) => group.teams.length > 0);

  const otherTeams = dedupeTeamsByEspnId(buckets.get(OTHER_NCAA_M_CONFERENCE_SLUG) ?? []);
  if (otherTeams.length > 0) {{
    groups.push({{
      conference: {{ slug: OTHER_NCAA_M_CONFERENCE_SLUG, name: "Other" }},
      teams: otherTeams,
    }});
  }}

  return groups;
}}
"""

    OUTPUT.write_text(content, encoding="utf-8")
    print(
        f"Wrote {len(conferences)} conferences ({team_count} ESPN teams, "
        f"{len(espn_id_to_conference)} ESPN ID mappings) to {OUTPUT}"
    )


if __name__ == "__main__":
    main()
