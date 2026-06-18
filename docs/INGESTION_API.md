# Ingestion API

This document describes the backend API contract for future scraper services writing player season data into Hoop Central.

For identity matching rules and database design, see [INGESTION.md](./INGESTION.md).

## Endpoint

```
POST /api/ingest/player-season
```

Backend-only. Not exposed in the frontend.

### Authentication

If `INGEST_API_KEY` is set in the environment, every request must include:

```
x-ingest-api-key: <INGEST_API_KEY>
```

If `INGEST_API_KEY` is not set, the endpoint is open (intended for local development only).

## Request body

```json
{
  "source": "nba",
  "externalId": "2544",
  "player": {
    "displayName": "LeBron James",
    "birthDate": "1984-12-30",
    "position": "F",
    "heightCm": 206,
    "weightKg": 113,
    "hometown": "Akron, Ohio",
    "headshotUrl": "https://example.com/lebron.jpg"
  },
  "league": {
    "slug": "nba",
    "name": "NBA"
  },
  "team": {
    "slug": "los-angeles-lakers",
    "name": "Los Angeles Lakers",
    "abbreviation": "LAL"
  },
  "season": {
    "label": "2024-25"
  },
  "stats": {
    "gamesPlayed": 70,
    "pointsPerGame": 24.4,
    "reboundsPerGame": 7.8,
    "assistsPerGame": 8.2,
    "stealsPerGame": 1.0,
    "blocksPerGame": 0.6,
    "fieldGoalPct": 51.3
  }
}
```

### Required fields

| Field | Type | Notes |
|-------|------|-------|
| `source` | string | Scraper source name (e.g. `nba`, `ncaa`) |
| `externalId` | string | Player ID in that source |
| `player.displayName` | string | Canonical display name |
| `league.slug` | string | Lowercase league slug |
| `league.name` | string | League display name |
| `team.slug` | string | Team slug |
| `team.name` | string | Team name |
| `team.abbreviation` | string | Team abbreviation |
| `season.label` | string | Season label (e.g. `2024-25`, `2024`) |
| `stats.gamesPlayed` | number | Games played |
| `stats.pointsPerGame` | number | Points per game |
| `stats.reboundsPerGame` | number | Rebounds per game |
| `stats.assistsPerGame` | number | Assists per game |

Optional player fields: `birthDate`, `position`, `heightCm`, `weightKg`, `hometown`, `headshotUrl`.

Optional stats fields: `stealsPerGame`, `blocksPerGame`, `fieldGoalPct`. Older scraper payloads without these fields remain valid; existing steals, blocks, and FG% values are left unchanged on update when omitted.

### NCAA Division I league slugs

| Slug | Name | Gender | Used by |
|------|------|--------|---------|
| `ncaa` | NCAA Division I | male | **Live men's scraper** (`usbasket-ncaa-d1`) — unchanged |
| `ncaa-w` | NCAA Division I (Women) | female | Future women's scraper |

**Backward compatibility:** the men's scraper keeps sending `"league": { "slug": "ncaa", "name": "NCAA Division I" }` and data stays in the `ncaa` league. No payload changes required.

Women's ingest uses `source: "usbasket-ncaa-d1-w"` with `"slug": "ncaa-w"`, or `"slug": "ncaa-w"` explicitly.

If gender/league cannot be determined, data defaults to the legacy `ncaa` league.

## Completion status

```
GET /api/ingest/completion-status?source=usbasket-ncaa-d1
GET /api/ingest/completion-status?source=usbasket-ncaa-d1&league=ncaa-m
```

Optional `league` query param filters returned season rows to a specific league slug (`ncaa-m`, `ncaa-w`, or legacy alias `ncaa` → men's).

## Response

```json
{
  "ok": true,
  "playerId": 1,
  "created": {
    "player": false,
    "league": false,
    "team": false,
    "season": false,
    "stint": false,
    "stats": false
  }
}
```

Each `created.*` flag is `true` when a new row was inserted for that entity, `false` when an existing row was found or updated.

## Behavior

1. Validate required fields.
2. Find or create player via `(source, externalId)` in `player_identities`.
3. Update player profile fields from the payload.
4. Find or create league by `slug`.
5. Find or create team by `slug` within the league.
6. Find or create season by `league_id` + `season.label`.
7. Upsert `player_stints` for `(player_id, team_id, league_id, season_id)`.
8. Upsert `player_season_stats` for `(player_id, team_id, league_id, season_id)`.

All steps run in a single database transaction.

## Idempotency rules

| Entity | Unique key | Repeat behavior |
|--------|------------|-----------------|
| Player identity | `(source, external_id)` | Returns existing player |
| League | `slug` | Returns existing league |
| Team | `slug` | Returns existing team (must match same league) |
| Season | `(league_id, season_label)` | Returns existing season |
| Stint | `(player_id, team_id, league_id, season_id)` | No duplicate inserted |
| Season stats | `(player_id, team_id, league_id, season_id)` | Updates stat values |

Sending the same payload twice should not create duplicate rows. The second call returns `created` flags mostly `false` and updates stats if values changed.

## Example: existing seed player

LeBron James is seeded with `source: "seed"` and `externalId: "2544"`.

```bash
curl -X POST http://localhost:3001/api/ingest/player-season \
  -H "Content-Type: application/json" \
  -d '{
    "source": "seed",
    "externalId": "2544",
    "player": {
      "displayName": "LeBron James",
      "birthDate": "1984-12-30",
      "position": "F",
      "heightCm": 206,
      "weightKg": 113,
      "hometown": "Akron, Ohio"
    },
    "league": { "slug": "nba", "name": "NBA" },
    "team": {
      "slug": "los-angeles-lakers",
      "name": "Los Angeles Lakers",
      "abbreviation": "LAL"
    },
    "season": { "label": "2024-25" },
    "stats": {
      "gamesPlayed": 70,
      "pointsPerGame": 24.4,
      "reboundsPerGame": 7.8,
      "assistsPerGame": 8.2,
      "stealsPerGame": 1.0,
      "blocksPerGame": 0.6,
      "fieldGoalPct": 51.3
    }
  }'
```

Expected first call: `playerId` matches seed player, most `created` flags `false`, `stats` may be `false` if row already exists from seed.

## Future scraper architecture

```
┌─────────────┐     POST /api/ingest/player-season     ┌──────────────────┐
│  NBA        │ ──────────────────────────────────────►│                  │
│  Scraper    │                                        │  Hoop Central    │
└─────────────┘                                        │  API + Database  │
                                                       │                  │
┌─────────────┐     POST /api/ingest/player-season     │                  │
│  NCAA       │ ──────────────────────────────────────►│                  │
│  Scraper    │                                        └──────────────────┘
└─────────────┘
```

Each league scraper runs independently as a separate service or job. Scrapers:

1. Fetch raw data from an external source.
2. Normalize it into the ingestion payload shape.
3. POST one season row at a time (or batch endpoints may be added later).
4. Rely on identity matching — never insert directly into `players`.

Scrapers should use a stable `source` string per data provider and the provider's native `externalId`. Cross-league players (e.g. NCAA → NBA) will eventually be linked through fuzzy matching or manual identity aliasing — not yet implemented.

## Errors

| Status | Code | When |
|--------|------|------|
| 400 | `INVALID_BODY` | Missing or invalid fields |
| 401 | `UNAUTHORIZED` | Missing or wrong `x-ingest-api-key` |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
