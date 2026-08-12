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


def clean_wiki(value: str) -> str:
    value = re.sub(r"\{\{[^}]+\}\}", "", value)
    value = re.sub(r"\[\[([^|\]]+\|)?([^\]]+)\]\]", r"\2", value)
    value = re.sub(r"<[^>]+>", "", value)
    value = re.sub(r"''+", "", value)
    return re.sub(r"\s+", " ", value).strip()


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

        cols = [clean_wiki(c.strip()) for c in re.split(r"\|\|?", line) if c.strip()]
        if not cols:
            continue

        if not current_school:
            continue

        nickname = cols[0] if len(cols) >= 1 else ""
        conference = cols[-1] if len(cols) >= 2 else ""
        if not conference or conference.lower() == "conference":
            continue

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

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(teams, indent=2), encoding="utf-8")
    conferences = sorted({team["conference"] for team in teams})
    print(f"Wrote {len(teams)} teams across {len(conferences)} conferences to {OUTPUT}")


if __name__ == "__main__":
    main()
