# Hoop Central — Complete Technical Blueprint

**Status:** Architecture (greenfield rebuild)  
**Reference UI:** [hoop-central-production.up.railway.app](https://hoop-central-production.up.railway.app)  
**Vision:** Elite Prospects–style basketball database — search any player, full career history, season stats, team history, multi-league careers.

---

## Executive Summary

Hoop Central is a read-heavy sports reference platform. The public site mirrors your existing production app: a dark, stats-forward homepage, player search, rich profiles with season-by-season tables, league browsing, prospects, draft classes, and team rosters.

The platform is built as **one coordinated system with three deployment roles**:

| Role | Repository | Railway service | Responsibility |
|------|------------|-----------------|----------------|
| **Core platform** | `hoop-central` (single repo) | `web-api` | React UI, REST API, ingestion gateway, admin, DB writes |
| **League scrapers** | One repo per league | `scraper-nba`, `scraper-wnba`, … | Scrape source sites, normalize, POST to core |
| **Data store** | — | PostgreSQL plugin | Single source of truth for all leagues |

PostgreSQL holds canonical players, careers, and stats. Each league scraper is **fully independent** — different language, schedule, source website, failure mode — but all data flows through one **ingestion contract** into the same database. A broken NCAA scraper does not take down the NBA scraper or the public website.

GitHub hosts all repositories. Railway hosts all services inside one project (recommended) so they share networking, secrets, and observability.

---

## Reference Product Analysis (Your Live Site)

Your production deployment at [hoop-central-production.up.railway.app](https://hoop-central-production.up.railway.app) defines the target UX. The rebuild should preserve this look, navigation, and data shape while fixing the underlying architecture for multi-league scale.

### Confirmed pages and routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage — hero, live counters, Most Viewed, Featured Athletes, Favorites |
| `/players` | Player search and directory |
| `/players/:id` | Player profile — bio header, season stats table, career teams |
| `/leagues` | League catalog |
| `/leagues/:league` | League-specific browse (teams, seasons) |
| `/prospects` | Young prospects list |
| `/classes` | Draft classes by birth year |
| `/roster/:team/:season` | Team roster for a season |
| `/scraper` | Admin-only scraper controls |

### Confirmed API surface (to preserve and extend)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/players` | Search / list players |
| `GET /api/players/:id` | Full profile + embedded `stats[]` + `awards[]` |
| `GET /api/featured-players` | Homepage featured section |
| `GET /api/players/count` | Homepage counter |
| `GET /api/teams/count` | Homepage counter |
| `GET /api/teams/all` | Team directory |
| `GET /api/teams/:team/roster/:season` | Roster page |
| `GET /api/leagues` | League list |
| `GET /api/players/prospects` | Prospects page |
| `GET /api/players/birth-year-counts` | Draft classes index |
| `GET /api/players/birth-year/:year` | Players born in year |
| `POST /api/ingest/players` | Scraper ingestion (service auth) |
| `POST /api/scraper/nba` | Trigger NBA scrape (admin) |
| `POST /api/admin/login` | Admin auth |

### Confirmed player profile shape

```json
{
  "id": 2318,
  "name": "LeBron James",
  "position": "Small Forward, Power Forward, ...",
  "team": "Los Angeles Lakers",
  "height": "6'9\"",
  "weight": "249 lbs",
  "jerseyNumber": 0,
  "headshotUrl": "",
  "hometown": "Akron, Ohio",
  "birthDate": "1984-12-30",
  "profileViews": 14029,
  "stats": [
    {
      "season": "2024-25",
      "team": "Los Angeles Lakers",
      "league": "NBA",
      "games_played": 70,
      "pts_per_g": "24.4",
      "trb_per_g": "7.8",
      "ast_per_g": "8.2",
      "fg_pct": "51.3"
    }
  ],
  "awards": []
}
```

### Design language to preserve

- **Aesthetic:** Dark sports-database UI, high information density, card grids for players.
- **Typography:** Oxanium / Outfit / Space Grotesk (display + body).
- **Homepage hero:** "REAL-TIME STATS" label, **HOOPCENTRAL** wordmark, subtitle about tracking stars and prospects.
- **Live counters:** Active Players, Seasons Tracked, Teams (and optional social proof metrics).
- **Sections:** Most Viewed (profile view counts), Featured Athletes, Your Favorites (localStorage).
- **Stack already in production:** Vite + React SPA, TanStack Query, Tailwind CSS, combined frontend + API in one Railway service.

The rebuild keeps this UX exactly. The architectural change is **under the hood**: proper canonical identity, multi-league ingestion from separate scraper repos, and a normalized PostgreSQL schema.

---

## 1. Recommended Technology Stack

### Core platform (`hoop-central` repo)

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Vite 6 + React 19 + TypeScript | Matches your live site; fast dev; SPA fits database UX |
| **Routing** | React Router 7 | Same route structure as production |
| **Styling** | Tailwind CSS 4 + CSS variables | Match existing dark theme tokens |
| **Components** | shadcn/ui + Radix | Accessible tables, dialogs, command palette search |
| **Data fetching** | TanStack Query v5 | Already used in production |
| **Search UI** | cmdk command palette + debounced `/api/players?q=` | Elite Prospects–style instant search |
| **Favorites** | localStorage + optional account later | "Your Favorites" section on homepage |
| **Backend** | Express 5 + TypeScript | Same process as Vite dev server; proven on Railway |
| **ORM** | Drizzle ORM | Type-safe PostgreSQL, SQL control for stats queries |
| **Validation** | Zod | Shared schemas for API + ingestion |
| **Auth (admin)** | Session cookie + bcrypt (admin only) | Matches `/api/admin/login` pattern |
| **File uploads** | Railway volume or S3-compatible bucket | Headshots via signed upload URLs |
| **API docs** | OpenAPI 3.1 + Scalar UI at `/api/docs` | Contract for scraper repos |

### League scraper repos (one per league, separate GitHub repos)

| Layer | Choice | Why |
|-------|--------|-----|
| **Language** | Python 3.12 **or** TypeScript | Python for messy HTML sites; TS when source has clean JSON API |
| **HTTP** | httpx (Python) / undici (TS) | Retries, timeouts |
| **Parsing** | selectolax / BeautifulSoup (Py) | Each league picks what fits |
| **Scheduling** | Railway Cron Job per scraper service | Independent cadence per league |
| **Contract** | `@hoop-central/ingestion-sdk` npm package **or** `hoop-central-ingestion` PyPI package | Identical payload shape across all scrapers |
| **Observability** | Structured JSON logs → Railway | Per-scraper health without coupling |

### Shared infrastructure

| Layer | Choice | Why |
|-------|--------|-----|
| **Database** | PostgreSQL 16 (Railway plugin) | Relational careers, seasons, teams, stats |
| **Cache / queue** | Redis (Railway plugin) | Ingestion job queue, API response cache, rate limits |
| **Search index** | PostgreSQL `tsvector` + `pg_trgm` initially; Meilisearch when >50k players | Avoid premature complexity |
| **Hosting** | Railway (one project, many services) | Your existing deployment model |
| **Source control** | GitHub | Core repo + one repo per scraper |
| **CI/CD** | GitHub Actions per repo | Lint, test, deploy to Railway on merge |

### What we are not using

- Next.js (your SPA pattern is already correct for this product)
- GraphQL (REST matches your existing `/api/*` surface)
- Scrapers in the core repo (you want them isolated per league)
- Multiple databases (one PostgreSQL, coordinated writes)

---

## 2. Recommended Folder Structure

### Repository A — `hoop-central` (core platform, one repo)

Frontend and backend live together. One Railway service serves both.

```
hoop-central/
├── .github/workflows/
│   ├── ci.yml
│   └── deploy-railway.yml
├── client/                          # Vite React SPA (public site)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx             # counters, featured, most viewed, favorites
│   │   │   ├── Players.tsx          # search + directory
│   │   │   ├── PlayerProfile.tsx    # bio, stats table, team history, leagues
│   │   │   ├── Leagues.tsx
│   │   │   ├── LeagueDetail.tsx
│   │   │   ├── Prospects.tsx
│   │   │   ├── Classes.tsx          # birth-year draft classes
│   │   │   ├── Roster.tsx           # /roster/:team/:season
│   │   │   └── ScraperAdmin.tsx     # admin only
│   │   ├── components/
│   │   │   ├── layout/              # nav, footer, search bar
│   │   │   ├── player/              # PlayerCard, StatsTable, CareerTimeline
│   │   │   ├── home/                # Hero, StatCounters, FeaturedGrid
│   │   │   └── ui/                  # shadcn primitives
│   │   ├── hooks/
│   │   ├── lib/api.ts               # typed fetch wrappers
│   │   └── styles/
│   ├── index.html
│   └── vite.config.ts
├── server/                          # Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── players.ts
│   │   │   ├── teams.ts
│   │   │   ├── leagues.ts
│   │   │   ├── ingest.ts            # scraper entry point
│   │   │   ├── admin.ts
│   │   │   └── uploads.ts
│   │   ├── services/
│   │   │   ├── player.service.ts
│   │   │   ├── search.service.ts
│   │   │   ├── ingest.service.ts    # normalize + upsert + identity match
│   │   │   └── identity.service.ts  # cross-league player matching
│   │   ├── db/
│   │   │   ├── schema/              # Drizzle table definitions
│   │   │   └── migrations/
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── scraperAuth.ts       # API key per league
│   │   └── index.ts
│   └── drizzle.config.ts
├── packages/
│   └── ingestion-contract/          # Zod schemas + TypeScript types
│       ├── src/
│       │   ├── player-payload.ts
│       │   ├── batch-payload.ts
│       │   └── enums.ts             # League, Source enums
│       └── package.json
├── docs/
│   ├── ARCHITECTURE.md              # this document
│   ├── ingestion/
│   │   └── INGESTION_CONTRACT.md    # scraper integration guide
│   └── api/
│       └── openapi.yaml
├── scripts/
│   ├── seed.ts
│   └── migrate.ts
├── docker-compose.yml               # local Postgres + Redis
├── railway.toml
├── package.json                     # npm workspaces root
└── README.md
```

**Dev experience:** Vite proxies `/api` → Express on port 3001. Production: Express serves `client/dist` static files and mounts `/api` routes (same as your current Railway deployment pattern).

---

### Repository B — `hoop-central-scraper-nba` (example league repo)

Each league repo is identical in structure, different in source logic.

```
hoop-central-scraper-nba/
├── .github/workflows/deploy.yml
├── src/
│   ├── scrape/
│   │   ├── players.ts               # fetch player list
│   │   ├── stats.ts                 # season stats per player
│   │   ├── bios.ts
│   │   └── teams.ts
│   ├── normalize/
│   │   └── to-ingestion-payload.ts  # map source → contract
│   ├── push/
│   │   └── ingest-client.ts         # POST batches to core API
│   ├── run.ts                       # entry: scrape → normalize → push
│   └── config.ts
├── tests/
├── Dockerfile                       # Railway deploy
├── railway.toml                     # cron schedule
├── requirements.txt                 # if Python
└── README.md                        # source URLs, field mapping notes
```

**Sibling repos (same pattern, separate GitHub repos):**

| Repository | Railway service | Source examples |
|------------|-----------------|-----------------|
| `hoop-central-scraper-nba` | `scraper-nba` | basketball-reference, NBA API, ESPN |
| `hoop-central-scraper-wnba` | `scraper-wnba` | wnba.com, herhoopstats |
| `hoop-central-scraper-gleague` | `scraper-gleague` | gleague.nba.com |
| `hoop-central-scraper-ncaa` | `scraper-ncaa` | sports-reference NCAA |
| `hoop-central-scraper-euroleague` | `scraper-euroleague` | euroleague.net |

Each repo has its own `INGESTION_API_KEY` (scoped to that league's `source` enum). If one repo breaks, others continue independently.

---

### Shared contract distribution

Publish `packages/ingestion-contract` from the core repo as:

- **GitHub npm package** `@hoop-central/ingestion-contract`, or
- **Copied OpenAPI + JSON Schema** in each scraper repo's `vendor/` folder (simpler to start)

Scraper repos never import Drizzle or touch the database directly.

---

## 3. Database Architecture

### Principles

1. **One canonical player** per real person — the public profile URL resolves here.
2. **League source IDs** live in a separate identity table — scrapers only know their own IDs.
3. **Career = stints + season stats** — not one flat stats blob per player.
4. **Every ingested row has provenance** — `source`, `external_id`, `scraped_at`.
5. **League-specific stat columns** use a hybrid: common columns + JSONB overflow.
6. **Idempotent ingestion** — same `(source, external_id)` always upserts, never duplicates.

### Entity relationship

```
leagues
  └── seasons
  └── teams ── team_aliases (external IDs per source)
        └── player_stints ──── players (canonical)
                └── player_season_stats

players ── player_identities (source + external_id → player_id)
       ── player_biographical
       ── player_slugs (URL)
       ── player_merge_log

ingestion_batches ── ingestion_errors
scrape_run_log (per source, written by core on each batch)
```

### Table definitions

#### Taxonomy

**`leagues`**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| slug | text unique | `nba`, `wnba`, `gleague`, `ncaa-d1`, `euroleague` |
| name | text | Display name |
| country | text | Nullable |
| is_active | boolean | |

**`seasons`**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| league_id | FK | |
| label | text | `2024-25` |
| start_date / end_date | date | |

**`teams`**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| league_id | FK | Canonical league membership |
| slug | text | `los-angeles-lakers` |
| name | text | |
| abbreviation | text | `LAL` |
| city | text | |

**`team_aliases`** — maps scraper team codes to canonical teams
| Column | Type | Notes |
|--------|------|-------|
| source | enum | `NBA`, `NCAA`, … |
| external_id | text | `LAL`, `Los Angeles Lakers` |
| team_id | FK | |

---

#### Players and identity

**`players`** — canonical global identity
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | Public `/players/:id` (matches your live site) |
| slug | text unique | Optional SEO: `lebron-james` |
| display_name | text | |
| current_team_id | FK nullable | Denormalized for cards |
| status | enum | `active`, `retired`, `deceased` |
| profile_views | int | Homepage "Most Viewed" |
| headshot_url | text | |
| merged_into_id | FK nullable | Redirect if merged |
| created_at / updated_at | timestamptz | |

**`player_biographical`**
| Column | Type | Notes |
|--------|------|-------|
| player_id | FK unique | |
| birth_date | date | |
| hometown | text | |
| height_cm | int | Store metric; API returns `6'9"` string |
| weight_kg | int | |
| position | text | Free text (matches your live site) |
| shoots | char(1) | L/R/B nullable |
| draft_year / round / pick | int | |
| draft_team_id | FK | |
| bio | text | Long-form |

**`player_identities`** — links league source IDs to canonical player
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| player_id | FK | |
| source | enum | `NBA`, `WNBA`, `GLEAGUE`, `NCAA`, `EUROLEAGUE` |
| external_id | text | Source-native ID |
| external_url | text | |
| last_seen_at | timestamptz | |
| UNIQUE (source, external_id) | | Idempotent ingestion anchor |

**`player_merge_log`** — audit trail for admin merges
| Column | Type | Notes |
|--------|------|-------|
| survivor_id | FK | |
| merged_id | FK | |
| reason | text | |
| merged_by | text | |
| merged_at | timestamptz | |

---

#### Career and stats

**`player_stints`** — team tenure (career history backbone)
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| player_id | FK | |
| team_id | FK | |
| league_id | FK | |
| season_id | FK nullable | |
| jersey_number | text | |
| start_date / end_date | date | |
| stint_type | enum | `standard`, `two_way`, `assignment`, `loan` |
| source | enum | |
| UNIQUE (player_id, team_id, league_id, season_id) | | Prevent duplicate stints |

**`player_season_stats`** — one row per player × team × season × league
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| player_id | FK | |
| stint_id | FK | |
| season_id | FK | |
| league_id | FK | |
| team_id | FK | |
| games_played | int | |
| minutes_per_game | numeric | |
| points_per_game | numeric | |
| rebounds_per_game | numeric | |
| assists_per_game | numeric | |
| steals_per_game | numeric | |
| blocks_per_game | numeric | |
| fg_pct | numeric | |
| fg3_pct | numeric | |
| ft_pct | numeric | |
| stats_extended | jsonb | League-specific extras |
| source | enum | |
| scraped_at | timestamptz | |
| UNIQUE (player_id, team_id, season_id, league_id) | | Upsert key |

**`player_awards`**
| Column | Type | Notes |
|--------|------|-------|
| player_id | FK | |
| season_id | FK nullable | |
| award_name | text | `MVP`, `All-Star`, … |
| league_id | FK | |

**`stat_definitions`** — drives column headers per league in the UI
| Column | Type | Notes |
|--------|------|-------|
| league_id | FK | |
| stat_key | text | `pts_per_g` |
| display_label | text | `PPG` |
| sort_order | int | |

---

#### Operations

**`ingestion_batches`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| source | enum | Which scraper |
| status | enum | `pending`, `processing`, `completed`, `failed` |
| row_count | int | |
| error_count | int | |
| received_at | timestamptz | |

**`ingestion_errors`** — row-level validation failures

**`scrape_run_log`** — last success per source (for admin dashboard)

---

### Indexing

| Index | Purpose |
|-------|---------|
| GIN tsvector on `players.display_name` | Full-text search |
| GIN trgm on `players.display_name` | Fuzzy search |
| `(profile_views DESC)` | Most Viewed homepage |
| `(birth_date)` | Draft classes / prospects |
| Unique `(source, external_id)` on `player_identities` | Idempotent scraper writes |
| `(player_id, season_id)` on `player_season_stats` | Profile page |
| `(team_id, season_id)` on `player_stints` | Roster pages |

### Views (API performance)

**`v_player_career`** — chronological stints with team names and leagues  
**`v_player_profile`** — bio + current team denormalized for card display  
**`v_most_viewed`** — top N players by `profile_views` for homepage

---

## 4. API Architecture

### Design rules

- REST JSON under `/api/*` (preserves your live site contract)
- Public endpoints: no auth
- Ingestion endpoints: `X-API-Key` header, one key per league scraper
- Admin endpoints: session cookie
- Pagination: `?page=1&limit=50` on list endpoints
- Search: `?q=lebron&league=nba`
- Errors: `{ "error": { "code", "message" } }`

### Public read endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/players` | Search/list. Params: `q`, `league`, `team`, `position`, `page`, `limit` |
| GET | `/api/players/:id` | Profile: bio + `stats[]` + `awards[]` + `career[]` |
| GET | `/api/players/count` | Total player count |
| GET | `/api/players/prospects` | Prospects list (age filter) |
| GET | `/api/players/birth-year-counts` | Draft class year histogram |
| GET | `/api/players/birth-year/:year` | Players born in year |
| GET | `/api/featured-players` | Curated or algorithmic featured list |
| GET | `/api/teams` | Team directory |
| GET | `/api/teams/all` | All teams flat list |
| GET | `/api/teams/count` | Team count |
| GET | `/api/teams/:abbrev/roster/:season` | Roster with player cards |
| GET | `/api/leagues` | All leagues |
| GET | `/api/leagues/:slug` | League detail + seasons |
| POST | `/api/players/:id/view` | Increment `profile_views` (Most Viewed) |

### Player profile response (extended from your live shape)

```json
{
  "id": 2318,
  "name": "LeBron James",
  "position": "Small Forward, Power Forward",
  "team": "Los Angeles Lakers",
  "height": "6'9\"",
  "weight": "249 lbs",
  "jerseyNumber": 23,
  "headshotUrl": "/objects/players/2318.jpg",
  "hometown": "Akron, Ohio",
  "birthDate": "1984-12-30",
  "profileViews": 14029,
  "leaguesPlayed": ["NBA"],
  "career": [
    { "team": "Cleveland Cavaliers", "league": "NBA", "fromSeason": "2003-04", "toSeason": "2009-10" },
    { "team": "Miami Heat", "league": "NBA", "fromSeason": "2010-11", "toSeason": "2013-14" },
    { "team": "Los Angeles Lakers", "league": "NBA", "fromSeason": "2018-19", "toSeason": null }
  ],
  "stats": [
    {
      "season": "2024-25",
      "team": "Los Angeles Lakers",
      "league": "NBA",
      "games_played": 70,
      "pts_per_g": "24.4",
      "trb_per_g": "7.8",
      "ast_per_g": "8.2",
      "stl_per_g": "1.0",
      "blk_per_g": "0.6",
      "fg_pct": "51.3"
    }
  ],
  "awards": []
}
```

**`career[]`** is new vs your live API but is the Elite Prospects differentiator — derived from `player_stints`, not manually curated.

**Multi-league example** (future state when NCAA + NBA scrapers both run):

```json
{
  "leaguesPlayed": ["NCAA", "NBA"],
  "career": [
    { "team": "Duke Blue Devils", "league": "NCAA", "fromSeason": "2018-19", "toSeason": "2018-19" },
    { "team": "New Orleans Pelicans", "league": "NBA", "fromSeason": "2019-20", "toSeason": null }
  ],
  "stats": [
    { "season": "2018-19", "team": "Duke Blue Devils", "league": "NCAA", "pts_per_g": "22.6" },
    { "season": "2024-25", "team": "New Orleans Pelicans", "league": "NBA", "pts_per_g": "24.6" }
  ]
}
```

The UI renders stats in **league tabs** (NBA | NCAA | WNBA) using `stat_definitions` for column headers.

### Ingestion endpoints (scraper repos only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ingest/batch` | API key | Submit normalized player batch |
| GET | `/api/ingest/batch/:id` | API key | Check batch processing status |
| GET | `/api/ingest/health` | API key | Scraper connectivity check |

### Admin endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/login` | Admin session |
| GET | `/api/admin/check` | Session validation |
| GET | `/api/admin/ingestion/errors` | Failed rows per source |
| POST | `/api/admin/players/merge` | Merge duplicate players |
| POST | `/api/admin/scraper/trigger/:source` | Manual scrape trigger (optional webhook to scraper) |
| POST | `/api/uploads/request-url` | Signed headshot upload URL |

### Ingestion batch payload (contract all scrapers must follow)

```json
{
  "source": "NBA",
  "scraped_at": "2026-06-10T12:00:00Z",
  "players": [
    {
      "external_id": "2544",
      "display_name": "LeBron James",
      "bio": {
        "birth_date": "1984-12-30",
        "hometown": "Akron, Ohio",
        "height_cm": 206,
        "weight_kg": 113,
        "position": "Small Forward"
      },
      "stints": [
        {
          "team_external_id": "LAL",
          "season_label": "2024-25",
          "jersey_number": "23",
          "stint_type": "standard"
        }
      ],
      "season_stats": [
        {
          "team_external_id": "LAL",
          "season_label": "2024-25",
          "games_played": 70,
          "points_per_game": 24.4,
          "rebounds_per_game": 7.8,
          "assists_per_game": 8.2,
          "steals_per_game": 1.0,
          "blocks_per_game": 0.6,
          "fg_pct": 51.3
        }
      ],
      "awards": []
    }
  ]
}
```

### Ingestion processing pipeline (inside core API)

```
POST /api/ingest/batch
  → validate against Zod schema
  → write ingestion_batches (status: pending)
  → enqueue Redis job
  → return { batchId }

Worker (async):
  for each player in batch:
    → upsert team_aliases / teams if unknown
    → lookup player_identities (source, external_id)
        → found: get canonical player_id
        → not found: run identity matcher
            → high confidence: link to existing player
            → low confidence: create new canonical player
    → upsert player_biographical
    → upsert player_stints
    → upsert player_season_stats
    → upsert player_awards
  → mark batch completed
  → write scrape_run_log
```

Scrapers are stateless. The core platform owns all identity decisions.

---

## 5. Railway Architecture

### One Railway project, many services

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Railway Project: hoop-central                     │
│                                                                       │
│  ┌─────────────────┐         ┌──────────────────────────────────┐  │
│  │    web-api      │         │         PostgreSQL (plugin)       │  │
│  │  Express + Vite │────────▶│   single database, all leagues    │  │
│  │  static build   │         └──────────────────────────────────┘  │
│  └────────┬────────┘                          ▲                       │
│           │                                  │                       │
│           │         ┌────────────────────────┼─────────────────┐    │
│           │         │                        │                 │    │
│  ┌────────▼──────┐  │  ┌──────────────┐  ┌──┴───────────┐  ┌──┴──────────┐
│  │     Redis     │  │  │ scraper-nba  │  │scraper-wnba  │  │scraper-ncaa │
│  │ queue + cache │  │  │  (own repo)  │  │  (own repo)  │  │  (own repo) │
│  └───────────────┘  │  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘
│                     │         │                  │                 │       │
│                     │         └──────────────────┴─────────────────┘       │
│                     │                    POST /api/ingest/batch            │
│                     │                    X-API-Key: per-league secret      │
│                     └────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────┘
```

### Service configuration

| Service | GitHub repo | Deploy trigger | Schedule |
|---------|-------------|----------------|----------|
| `web-api` | `hoop-central` | Push to `main` | Always on |
| `postgres` | — | Railway plugin | Managed |
| `redis` | — | Railway plugin | Managed |
| `scraper-nba` | `hoop-central-scraper-nba` | Push to `main` | Cron: every 6h |
| `scraper-wnba` | `hoop-central-scraper-wnba` | Push to `main` | Cron: every 12h |
| `scraper-gleague` | `hoop-central-scraper-gleague` | Push to `main` | Cron: every 12h |
| `scraper-ncaa` | `hoop-central-scraper-ncaa` | Push to `main` | Cron: daily |
| `scraper-euroleague` | `hoop-central-scraper-euroleague` | Push to `main` | Cron: daily |

Each scraper service is a **Cron Job** or **worker** that runs, pushes data, and exits. It does not need to stay running between scrapes.

### Environment variables

**`web-api` service**
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SESSION_SECRET=...
INGESTION_API_KEY_NBA=...
INGESTION_API_KEY_WNBA=...
INGESTION_API_KEY_NCAA=...
INGESTION_API_KEY_GLEAGUE=...
INGESTION_API_KEY_EUROLEAGUE=...
ADMIN_USERNAME=...
ADMIN_PASSWORD_HASH=...
OBJECT_STORAGE_BUCKET=...
NODE_ENV=production
```

**Each `scraper-*` service**
```
INGESTION_API_URL=https://hoop-central-production.up.railway.app
INGESTION_API_KEY=<matching key for that source>
SCRAPE_MODE=full|incremental
LOG_LEVEL=info
```

Scraper services only need two secrets and their own source-specific config. They do not get `DATABASE_URL`.

### Deploy pipeline

**Core repo (`hoop-central`):**
1. Push to `main`
2. GitHub Actions: lint → typecheck → test → build client → build server
3. Run Drizzle migrations against Railway Postgres
4. Railway deploys `web-api`
5. Health check: `GET /api/health`

**Scraper repos:**
1. Push to `main`
2. GitHub Actions: lint → test → build Docker image
3. Railway deploys scraper service
4. Cron triggers `run.ts` / `run.py`
5. Scraper logs batch ID; core admin dashboard shows last success time

### Failure isolation

| Failure | Impact |
|---------|--------|
| `scraper-ncaa` breaks | NCAA data goes stale; NBA site and API unaffected |
| `web-api` breaks | Site down; scrapers queue failures in logs (no data loss if batches retried) |
| Postgres issue | Everything pauses; scrapers fail gracefully with HTTP errors |
| Bad NBA batch | Batch rejected or quarantined; previous NBA data remains |

### Domain

- Production: `hoop-central-production.up.railway.app` (existing) → custom domain later
- Each scraper: no public domain needed (outbound-only HTTP to core API)

---

## 6. Player Profile Data Model

### What the user sees (Player Profile page)

Matches your live site layout, extended for multi-league:

```
┌─────────────────────────────────────────────────────────────┐
│  [Headshot]   LEBRON JAMES                    profileViews  │
│               Los Angeles Lakers · NBA                      │
│               SF/PF · 6'9" · 249 lbs · #23                  │
│               Born Dec 30, 1984 · Akron, Ohio               │
├─────────────────────────────────────────────────────────────┤
│  CAREER HISTORY                                             │
│  Cleveland Cavaliers (NBA)  2003-04 → 2009-10               │
│  Miami Heat (NBA)           2010-11 → 2013-14               │
│  Cleveland Cavaliers (NBA)  2014-15 → 2017-18               │
│  Los Angeles Lakers (NBA)   2018-19 → present               │
├─────────────────────────────────────────────────────────────┤
│  [ NBA ] [ NCAA ] [ G League ]   ← league tabs              │
│  SEASON STATS                                               │
│  ┌────────┬──────────────────┬────┬─────┬─────┬─────┬───┐  │
│  │ Season │ Team             │ GP │ PPG │ RPG │ APG │...│  │
│  ├────────┼──────────────────┼────┼─────┼─────┼─────┼───┤  │
│  │ 2024-25│ Los Angeles Lakers│ 70 │24.4 │ 7.8 │ 8.2 │   │  │
│  │ 2023-24│ Los Angeles Lakers│ 71 │25.7 │ 7.3 │ 8.3 │   │  │
│  └────────┴──────────────────┴────┴─────┴─────┴─────┴───┘  │
├─────────────────────────────────────────────────────────────┤
│  AWARDS                                                     │
│  MVP · 2008-09, 2009-10, 2011-12, ...                       │
└─────────────────────────────────────────────────────────────┘
```

### Data layers behind the page

| UI section | DB source | Notes |
|------------|-----------|-------|
| Header bio | `players` + `player_biographical` | `team` is current_team denormalized |
| Career history | `player_stints` grouped by team | Collapse consecutive seasons same team |
| Season stats table | `player_season_stats` filtered by active league tab | Sorted season DESC |
| League tabs | Distinct `league_id` from player's stints | Only show tabs with data |
| Awards | `player_awards` | |
| Most viewed | `players.profile_views` | Incremented on profile load |
| Featured / Prospects | Query filters on `birth_date`, performance | Homepage and `/prospects` |

### Player card (search results, rosters, featured grids)

```json
{
  "id": 2318,
  "name": "LeBron James",
  "position": "Small Forward",
  "team": "Los Angeles Lakers",
  "height": "6'9\"",
  "weight": "249 lbs",
  "jerseyNumber": 23,
  "headshotUrl": "",
  "hometown": "Akron, Ohio",
  "birthDate": "1984-12-30",
  "profileViews": 14029
}
```

This matches your existing card shape exactly — no frontend breaking changes needed.

---

## 7. Strategy for the Same Player in Multiple Leagues

This is the core domain challenge. Example: a player appears in NCAA (2018–19), G League (2019), and NBA (2019–present).

### Three-layer identity model

```
Layer 1: Canonical player (players table)
         One row per human. Public profile. Career page.

Layer 2: Source identities (player_identities table)
         NBA ID 2544  ──┐
         NCAA ID 12345 ──┼──▶ player_id: 2318
         G League ID 99 ─┘

Layer 3: Career facts (stints + stats, per source)
         Each scraper writes only its own source rows.
         Core API assembles the unified career view.
```

### Ingestion rule

Scrapers **never send a canonical `player_id`**. They send `(source, external_id)`. The core platform decides which canonical player that maps to.

Your live site already has `player_id: null` on some records — the rebuild makes this linkage explicit and reliable.

### Identity matching algorithm

When a new `(source, external_id)` arrives:

| Step | Action |
|------|--------|
| 1 | Look up `player_identities` — if exists, use that `player_id` |
| 2 | Run matcher on bio fields from incoming payload |
| 3 | Score candidates |

**Matching signals and weights:**

| Signal | Weight |
|--------|--------|
| Exact `display_name` + `birth_date` | 0.50 |
| Name similarity (trigram) + `birth_date` | 0.25 |
| Name + `hometown` + `height_cm` (±2cm) | 0.15 |
| Draft year + pick matches existing player | 0.10 |
| Name only | 0.00 (never auto-merge) |

**Thresholds:**

| Confidence | Action |
|------------|--------|
| ≥ 0.92 | Auto-link: create `player_identities` row pointing to existing canonical player |
| 0.75 – 0.91 | Create new canonical player; flag in admin review queue |
| < 0.75 | Create new canonical player |

### Career assembly across leagues

- Each league scraper writes `player_stints` and `player_season_stats` with its own `source` and `league_id`.
- The profile API queries **all stints for `player_id`**, regardless of source.
- The UI groups stats by league tab but shows **one unified career timeline** sorted by date.
- Team history is derived: unique teams from stints, with tenure ranges.

### G League / two-way / assignment players

Model as **separate stints per team per league**, with overlapping dates allowed:

```
player_id: 100
  stint: Osceola Magic (G League)   2024-25  stint_type: assignment
  stint: Orlando Magic (NBA)          2024-25  stint_type: standard
```

The career timeline shows both rows. Stats appear under their respective league tabs.

### Admin merge (when matcher gets it wrong)

1. Admin selects two canonical players in `/scraper` or dedicated admin UI.
2. `POST /api/admin/players/merge` — survivor absorbs all identities, stints, stats.
3. Loser `players.merged_into_id` set → API redirects `/players/:oldId` → `/players/:newId`.
4. `player_merge_log` records the action.

### Why this matches Elite Prospects

| Elite Prospects behavior | Hoop Central equivalent |
|--------------------------|-------------------------|
| One global player page | `players` canonical row |
| Domestic + international stats tabs | League tabs from `stat_definitions` |
| Career timeline of teams | `player_stints` grouped |
| Stats per season per league | `player_season_stats` |
| Source IDs hidden from public | `player_identities` internal only |

---

## 8. Implementation Roadmap (Single Release Plan)

No version numbers. One product, built in dependency order. Each phase is shippable to production.

### Phase 1 — Core platform skeleton

**Goal:** Empty site running on Railway with your exact UI shell.

- [ ] Initialize `hoop-central` repo (Vite + React + Express + Drizzle)
- [ ] Reproduce homepage: hero, counters (hardcoded), Featured, Most Viewed, Favorites
- [ ] Reproduce navigation: Players, Leagues, Prospects, Classes
- [ ] PostgreSQL schema: leagues, teams, players, biographical, stints, season_stats, identities
- [ ] Seed script: 100 players with stats (manual JSON) to validate UI
- [ ] Deploy to Railway: `web-api` + Postgres
- [ ] GitHub Actions CI/CD

**Done when:** Site looks identical to production homepage; player profile renders from seed data.

---

### Phase 2 — Full read API and all pages

**Goal:** Every public page works against PostgreSQL.

- [ ] `GET /api/players` with search, filters, pagination
- [ ] `GET /api/players/:id` with stats, career, awards
- [ ] `GET /api/teams/:abbrev/roster/:season`
- [ ] `GET /api/leagues`, `/api/players/prospects`, birth-year endpoints
- [ ] `GET /api/featured-players`, count endpoints
- [ ] `POST /api/players/:id/view` for Most Viewed tracking
- [ ] Player profile: career timeline section + league tabs on stats table
- [ ] Roster page, Classes page, Prospects page, League detail page

**Done when:** All routes from your live site work with real DB data; no mock data.

---

### Phase 3 — Ingestion gateway and first scraper

**Goal:** Prove the multi-repo scraper pattern end-to-end.

- [ ] Publish `ingestion-contract` schemas in core repo
- [ ] `POST /api/ingest/batch` with API key auth
- [ ] Redis job queue + async batch processor
- [ ] Identity matcher v1 (rule-based)
- [ ] Admin dashboard: batch status, last scrape time, error log
- [ ] Create `hoop-central-scraper-nba` repo
- [ ] NBA scraper: players + season stats → POST to ingestion API
- [ ] Deploy `scraper-nba` on Railway Cron
- [ ] Admin `/scraper` page: trigger + status

**Done when:** NBA data flows from separate repo into DB; site updates after scrape.

---

### Phase 4 — Multi-league expansion

**Goal:** Players with careers spanning multiple leagues.

- [ ] `stat_definitions` per league (column headers differ NCAA vs NBA)
- [ ] League tabs on player profile (only show leagues with data)
- [ ] Create and deploy scraper repos: WNBA, G League, NCAA, EuroLeague (one at a time)
- [ ] Each scraper gets its own `INGESTION_API_KEY`
- [ ] `team_aliases` mapping per source
- [ ] Admin merge UI for duplicate players
- [ ] Homepage counters reflect live DB totals

**Done when:** At least one player shows stats in two leagues on a single profile page.

---

### Phase 5 — Production hardening

**Goal:** Reliable, fast, operable at scale.

- [ ] Postgres search tuning (tsvector, trgm); add Meilisearch if search latency requires it
- [ ] Redis response cache for hot profiles and homepage
- [ ] Headshot upload pipeline (`/api/uploads/request-url`)
- [ ] Ingestion retry logic in scrapers (failed batches re-submitted)
- [ ] Sentry error tracking on core + scrapers
- [ ] Postgres backup policy + restore runbook
- [ ] Rate limiting on public API
- [ ] OpenAPI docs published for scraper authors

**Done when:** Site handles 6,500+ players with fast search; scrapers recover from failures automatically.

---

### Phase 6 — Elite Prospects parity features

**Goal:** Best-in-class basketball reference.

- [ ] Awards ingestion and display
- [ ] Draft class pages linked to player profiles
- [ ] Team history page per franchise (all seasons)
- [ ] Player comparison view (side-by-side stats)
- [ ] Career trend charts (PPG/RPG/APG over seasons)
- [ ] SEO: player slug URLs (`/players/lebron-james`) with numeric ID redirect
- [ ] Sitemap + JSON-LD structured data
- [ ] Custom domain on Railway

**Done when:** Feature-complete against Elite Prospects checklist for basketball.

---

## Appendix A — UI Component Map

| Page | Key components |
|------|----------------|
| Home | `Hero`, `StatCounters`, `MostViewedGrid`, `FeaturedGrid`, `FavoritesGrid` |
| Players | `SearchBar`, `PlayerCard`, `FilterPanel`, `Pagination` |
| Player Profile | `ProfileHeader`, `CareerTimeline`, `LeagueStatTabs`, `StatsTable`, `AwardsList` |
| Roster | `TeamHeader`, `SeasonSelector`, `RosterTable` |
| Classes | `BirthYearChart`, `PlayerCardGrid` |
| Prospects | `ProspectCard`, age filter |
| Leagues | `LeagueCard`, `SeasonList` |
| Scraper Admin | `BatchLog`, `SourceStatus`, `MergeQueue` |

---

## Appendix B — Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend framework | Vite + React | Matches your live deployment |
| Core repo layout | `client/` + `server/` monorepo | Your requirement: one repo for web + API |
| Scraper layout | Separate GitHub repo per league | Independent failure, different scrape targets |
| Database | Single PostgreSQL | Coordinated career view requires one source of truth |
| Player URL | `/players/:id` (numeric) | Matches live site; slugs added in Phase 6 |
| Ingestion | Push via REST batch API | Scrapers need no DB credentials |
| Identity | Canonical + source IDs | Required for multi-league careers |
| Hosting | Railway one project | Shared secrets, simple ops |

---

## Appendix C — Security

- Scrapers: API key per source, rotated in Railway secrets
- Admin: bcrypt password, HTTP-only session cookie
- Public site: no auth required
- Ingestion endpoint: rate-limited per API key
- Scrapers never receive `DATABASE_URL`
- All admin actions logged in `player_merge_log` and ingestion audit tables

---

## Next Step

When you are ready to begin implementation, start with **Phase 1**: initialize the `hoop-central` repo, reproduce the homepage from your live site, and stand up PostgreSQL on Railway.

No code has been written yet. This document is the complete blueprint.

---

*Document owner: Engineering. Last updated: June 2026.*
