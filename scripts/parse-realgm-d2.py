#!/usr/bin/env python3
"""One-off parser: extract RealGM 2025-26 D2 team/conference rows into JSON."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(__file__).resolve().parent / "ncaa-d2-realgm-source.md"
OUTPUT = Path(__file__).resolve().parent / "ncaa-d2-current-teams.json"

ROW_RE = re.compile(r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$")


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source file: {SOURCE}")

    teams: list[dict[str, str]] = []
    for line in SOURCE.read_text(encoding="utf-8").splitlines():
        match = ROW_RE.match(line.strip())
        if not match:
            continue
        school, nickname, conference, location = (part.strip() for part in match.groups())
        if school in ("School", "---") or nickname in ("Nickname", "---"):
            continue
        teams.append(
            {
                "school": school,
                "nickname": nickname,
                "conference": conference,
                "location": location,
            }
        )

    OUTPUT.write_text(json.dumps(teams, indent=2), encoding="utf-8")
    conferences = sorted({team["conference"] for team in teams})
    print(f"Wrote {len(teams)} teams across {len(conferences)} conferences to {OUTPUT}")


if __name__ == "__main__":
    main()
