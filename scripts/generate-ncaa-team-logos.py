#!/usr/bin/env python3
"""Regenerate client/src/lib/ncaa-team-logos.ts from ESPN core MBB teams (D1 + D2)."""

from __future__ import annotations

import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "client/src/lib/ncaa-team-logos.ts"
MANUAL_ALIASES_PATH = ROOT / "scripts/ncaa-manual-aliases.json"
D2_ALIASES_PATH = ROOT / "scripts/ncaa-d2-db-aliases.json"
CORE_LIST_URL = (
    "https://sports.core.api.espn.com/v2/sports/basketball/leagues/"
    "mens-college-basketball/teams?limit=1000&page={page}"
)
CORE_TEAM_URL = (
    "https://sports.core.api.espn.com/v2/sports/basketball/leagues/"
    "mens-college-basketball/teams/{team_id}"
)


def slugify(value: str) -> str:
    normalized = value.replace("'", "").replace(".", "").strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized)
    return slug.strip("-")


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower().replace("'", "").replace(".", ""))


def school_slug(full_slug: str) -> str | None:
    parts = [part for part in full_slug.split("-") if part]
    if len(parts) <= 1:
        return None
    return "-".join(parts[:-1])


def fmt_record(record: dict[str, str]) -> str:
    return "\n".join(f'  "{key}": "{value}",' for key, value in sorted(record.items()))


def add_slug_alias(by_slug: dict[str, str], alias: str | None, espn_id: str) -> None:
    if not alias:
        return
    cleaned = alias.strip().lower()
    if cleaned:
        by_slug[cleaned] = espn_id


def add_name_alias(by_name: dict[str, str], alias: str | None, espn_id: str) -> None:
    if not alias:
        return
    cleaned = alias.strip()
    if cleaned:
        by_name[cleaned] = espn_id
        normalized = normalize_name(cleaned)
        if normalized:
            by_name[normalized] = espn_id


def load_manual_aliases() -> dict[str, str]:
    if not MANUAL_ALIASES_PATH.exists():
        return {}
    return json.loads(MANUAL_ALIASES_PATH.read_text(encoding="utf-8"))


def load_d2_aliases() -> dict[str, str]:
    if not D2_ALIASES_PATH.exists():
        return {}
    payload = json.loads(D2_ALIASES_PATH.read_text(encoding="utf-8"))
    return {
        str(key).strip().lower(): str(value).strip().lower()
        for key, value in payload.get("aliases", {}).items()
    }


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url) as response:
        return json.load(response)


def fetch_team(team_id: str) -> dict:
    return fetch_json(CORE_TEAM_URL.format(team_id=team_id))


def list_team_ids() -> list[str]:
    team_ids: list[str] = []
    page = 1
    while True:
        data = fetch_json(CORE_LIST_URL.format(page=page))
        for item in data.get("items", []):
            ref = item.get("$ref", "")
            match = re.search(r"/teams/(\d+)", ref)
            if match:
                team_ids.append(match.group(1))
        page_count = data.get("pageCount", page)
        if page >= page_count:
            break
        page += 1
    return team_ids


def resolve_espn_id(by_slug: dict[str, str], canonical_slug: str) -> str | None:
    if canonical_slug in by_slug:
        return by_slug[canonical_slug]
    for slug, espn_id in by_slug.items():
        if slug.startswith(f"{canonical_slug}-") or canonical_slug.startswith(f"{slug}-"):
            return espn_id
    return None


def main() -> None:
    manual_aliases = load_manual_aliases()
    d2_aliases = load_d2_aliases()
    team_ids = list_team_ids()

    teams: list[dict] = []
    with ThreadPoolExecutor(max_workers=24) as pool:
        futures = {pool.submit(fetch_team, team_id): team_id for team_id in team_ids}
        for future in as_completed(futures):
            teams.append(future.result())

    by_slug: dict[str, str] = {}
    by_name: dict[str, str] = {}
    by_abbrev: dict[str, str] = {}
    display_name_by_id: dict[str, str] = {}

    for team in teams:
        espn_id = str(team["id"])
        slug = team.get("slug", "").strip().lower()
        display_name = team.get("displayName", "").strip()
        short_name = team.get("shortDisplayName", "").strip()
        location = team.get("location", "").strip()
        nickname = team.get("name", team.get("nickname", "")).strip()
        abbrev = team.get("abbreviation", "").upper()

        if display_name:
            display_name_by_id[espn_id] = display_name

        for alias in (slug, school_slug(slug), slugify(display_name)):
            add_slug_alias(by_slug, alias, espn_id)

        for label in (display_name, short_name, location, nickname):
            add_name_alias(by_name, label, espn_id)
            add_slug_alias(by_slug, slugify(label), espn_id)

        if abbrev:
            by_abbrev[abbrev] = espn_id

    for alias, canonical_slug in manual_aliases.items():
        espn_id = resolve_espn_id(by_slug, canonical_slug)
        if not espn_id:
            continue
        add_slug_alias(by_slug, alias, espn_id)
        add_slug_alias(by_slug, slugify(alias), espn_id)
        add_name_alias(by_name, alias, espn_id)

    for alias, canonical_slug in d2_aliases.items():
        espn_id = resolve_espn_id(by_slug, canonical_slug)
        if not espn_id:
            continue
        add_slug_alias(by_slug, alias, espn_id)
        add_slug_alias(by_slug, slugify(alias), espn_id)
        add_name_alias(by_name, alias, espn_id)

    content = f"""// Auto-generated from ESPN core men's college basketball teams API (D1 + D2).
// Regenerate with: python3 scripts/generate-ncaa-team-logos.py
// Generated: {date.today().isoformat()}

const NCAA_LOGO_FALLBACK =
  "https://upload.wikimedia.org/wikipedia/commons/d/dd/NCAA_logo.svg";

const ESPN_IDS_BY_SLUG: Record<string, string> = {{
{fmt_record(by_slug)}
}};

const ESPN_IDS_BY_NAME: Record<string, string> = {{
{fmt_record(by_name)}
}};

const ESPN_IDS_BY_ABBREV: Record<string, string> = {{
{fmt_record(by_abbrev)}
}};

const ESPN_DISPLAY_NAME_BY_ID: Record<string, string> = {{
{fmt_record(display_name_by_id)}
}};

function nameToSlug(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}}

function normalizeTeamName(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/\\s+/g, " ");
}}

export function resolveNcaaEspnId(
  teamName: string,
  options?: {{ abbreviation?: string; slug?: string }},
): string | undefined {{
  const slug = options?.slug?.trim().toLowerCase();
  if (slug && ESPN_IDS_BY_SLUG[slug]) return ESPN_IDS_BY_SLUG[slug];

  const nameSlug = nameToSlug(teamName);
  if (nameSlug && ESPN_IDS_BY_SLUG[nameSlug]) return ESPN_IDS_BY_SLUG[nameSlug];

  if (ESPN_IDS_BY_NAME[teamName]) return ESPN_IDS_BY_NAME[teamName];

  const normalizedName = normalizeTeamName(teamName);
  if (normalizedName && ESPN_IDS_BY_NAME[normalizedName]) {{
    return ESPN_IDS_BY_NAME[normalizedName];
  }}

  const abbrev = options?.abbreviation?.trim().toUpperCase();
  if (abbrev && ESPN_IDS_BY_ABBREV[abbrev]) return ESPN_IDS_BY_ABBREV[abbrev];

  return undefined;
}}

export function resolveNcaaTeamDisplayName(
  teamName: string,
  options?: {{ abbreviation?: string; slug?: string }},
): string | undefined {{
  const espnId = resolveNcaaEspnId(teamName, options);
  if (!espnId) return undefined;
  return ESPN_DISPLAY_NAME_BY_ID[espnId];
}}

export function ncaaTeamLogoUrl(
  teamName: string,
  options?: {{ abbreviation?: string; slug?: string }},
): string {{
  const espnId = resolveNcaaEspnId(teamName, options);
  if (!espnId) return NCAA_LOGO_FALLBACK;
  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${{espnId}}.png`;
}}
"""

    OUTPUT.write_text(content, encoding="utf-8")
    print(
        f"Wrote {len(teams)} teams "
        f"({len(by_slug)} slug aliases, {len(d2_aliases)} D2 DB aliases) to {OUTPUT}"
    )


if __name__ == "__main__":
    main()
