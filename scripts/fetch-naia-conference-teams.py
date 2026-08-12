#!/usr/bin/env python3
"""Fetch NAIA school/conference rows from Wikipedia (single page)."""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent / "college-conference-sources" / "naia-current-teams.json"
PAGE = "List_of_NAIA_institutions"
USER_AGENT = "HoopCentralBot/1.0 (college-conference-data; contact@hoopcentral.app)"

KNOWN_NAIA_CONFERENCES = {
    "american midwest conference",
    "appalachian athletic conference",
    "california pacific conference",
    "cascade collegiate conference",
    "chicagoland collegiate athletic conference",
    "continental athletic conference",
    "crossroads league",
    "frontier conference",
    "great plains athletic conference",
    "great southwest athletic conference",
    "hbcu athletic conference",
    "heart of america athletic conference",
    "kansas collegiate athletic conference",
    "mid-south conference",
    "red river athletic conference",
    "river states conference",
    "sooner athletic conference",
    "southern states athletic conference",
    "sun conference",
    "wolverine-hoosier athletic conference",
    "wolverine hoosier athletic conference",
}


def strip_wiki_templates(value: str) -> str:
    previous = None
    while previous != value:
        previous = value
        value = re.sub(r"\{\{[^{}]*\}\}", "", value)
    return value


def clean_wiki(value: str) -> str:
    value = re.sub(r"<ref[^>]*>.*?</ref>", "", value, flags=re.S)
    value = re.sub(r"<ref[^>]*/>", "", value)
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.I)
    value = strip_wiki_templates(value)
    value = re.sub(r"\[\[([^|\]]+\|)?([^\]]+)\]\]", r"\2", value)
    value = re.sub(r"<[^>]+>", "", value)
    value = re.sub(r"''+", "", value)
    return re.sub(r"\s+", " ", value).strip()


def extract_conference(raw: str) -> str:
    value = raw.split("<br", 1)[0]
    value = clean_wiki(value)
    value = re.sub(r"\s*\([^)]*in 20\d\d[^)]*\)\s*", " ", value, flags=re.I)
    return re.sub(r"\s+", " ", value).strip()


def is_valid_conference(name: str) -> bool:
    if not name:
        return False
    lowered = name.lower().strip()
    if lowered in KNOWN_NAIA_CONFERENCES:
        return True
    if any(
        marker in lowered
        for marker in (
            "access-date",
            "url-status",
            "cite web",
            "archive-date",
            "website=",
            "}}",
            "{{",
        )
    ):
        return False
    if lowered.startswith("(") or lowered.endswith("}}"):
        return False
    return lowered.endswith("conference") or lowered == "crossroads league"


def fetch_wikitext(page: str, section: str = "1") -> str:
    params = urllib.parse.urlencode(
        {
            "action": "parse",
            "page": page,
            "prop": "wikitext",
            "section": section,
            "format": "json",
        }
    )
    url = f"https://en.wikipedia.org/w/api.php?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    return data["parse"]["wikitext"]["*"]


def parse_naia_institutions(text: str) -> list[dict[str, str]]:
    teams: list[dict[str, str]] = []
    current_school = ""

    for line in text.splitlines():
        line = line.strip()
        if line.startswith("!scope=row|") or line.startswith("! scope=row|"):
            current_school = clean_wiki(line.split("|", 1)[1])
            continue

        if not line.startswith("|") or line.startswith("|+"):
            continue
        if "---" in line:
            continue

        cols = [c.strip() for c in re.split(r"\|\|", line.lstrip("|")) if c.strip()]
        if not cols:
            continue

        if not current_school:
            continue

        nickname = clean_wiki(cols[0]) if len(cols) >= 1 else ""
        conference = extract_conference(cols[-1]) if len(cols) >= 2 else ""
        if not conference or conference.lower() == "conference":
            continue
        if not is_valid_conference(conference):
            raise SystemExit(f"Invalid NAIA conference parsed for {current_school}: {conference!r}")

        teams.append(
            {
                "school": current_school,
                "nickname": nickname,
                "conference": conference,
            }
        )
        current_school = ""

    return teams


def main() -> None:
    text = fetch_wikitext(PAGE, "1")
    teams = parse_naia_institutions(text)
    if len(teams) < 100:
        raise SystemExit(f"Expected many NAIA teams, got {len(teams)}")

    conferences = sorted({team["conference"] for team in teams})
    if len(conferences) != 20:
        raise SystemExit(f"Expected 20 NAIA conferences, got {len(conferences)}: {conferences}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(teams, indent=2), encoding="utf-8")
    print(f"Wrote {len(teams)} teams across {len(conferences)} conferences to {OUTPUT}")


if __name__ == "__main__":
    main()
