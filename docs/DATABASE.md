# Hoop Central — Database

PostgreSQL is the source of truth for all player, team, league, and season data. The API reads exclusively from the database via Drizzle ORM.

## Stack

| Layer | Technology |
|-------|------------|
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM |
| Driver | `pg` connection pool |
| Migrations | Drizzle Kit |

## Connection

The server reads `process.env.DATABASE_URL` (Railway injects this when Postgres is linked).

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Connection module: `server/src/db/connection.ts`

```typescript
import { db, pool, checkDatabaseConnection } from "./db/index.js";
```

## Project layout

```
server/
├── drizzle.config.cjs          # Drizzle Kit configuration
└── src/db/
    ├── connection.ts           # Pool + Drizzle client + health check
    ├── index.ts                # Public exports
    ├── migrations/             # Versioned SQL migrations
    │   ├── 0000_initial_schema.sql
    │   └── meta/
    │       └── _journal.json
    └── schema/
        ├── enums.ts
        ├── leagues.ts          # leagues table
        ├── seasons.ts          # seasons table
        ├── teams.ts            # teams table
        ├── players.ts          # players table
        ├── player-details.ts   # biographical, stints, stats, awards
        └── index.ts
scripts/
└── seed.ts                     # Sample data loader
```

## Core tables

### `leagues`
Basketball leagues (NBA, WNBA, etc.).

| Column | Type | Notes |
|--------|------|-------|
| id | serial | Primary key |
| slug | text | Unique URL identifier |
| name | text | Display name |
| country | text | Optional |
| is_active | integer | 1 = active |

### `seasons`
Season labels per league (e.g. `2024-25`).

| Column | Type | Notes |
|--------|------|-------|
| id | serial | Primary key |
| league_id | integer | FK → leagues |
| label | text | Unique per league |
| start_date / end_date | date | Optional |

### `teams`
Teams belonging to a league.

| Column | Type | Notes |
|--------|------|-------|
| id | serial | Primary key |
| league_id | integer | FK → leagues |
| slug | text | URL identifier |
| name | text | Full name |
| abbreviation | text | e.g. LAL |
| city | text | Optional |

### `players`
Canonical player records.

| Column | Type | Notes |
|--------|------|-------|
| id | serial | Primary key |
| slug | text | Unique URL identifier |
| display_name | text | Full name |
| current_team_id | integer | FK → teams |
| status | enum | active / retired / deceased |
| profile_views | integer | Homepage "Most Viewed" counter |
| headshot_url | text | Image URL |

### Supporting tables (Phase 1)
- `player_biographical` — birth date, height, weight, position, jersey
- `player_stints` — team/league/season career history
- `player_season_stats` — per-season stat lines
- `player_awards` — awards and honors

## Commands

Run from the **repository root**:

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:push` | Push schema directly (dev only — skips migration history) |
| `npm run db:seed` | Load sample NBA players, teams, leagues, seasons |
| `npm run db:setup` | Migrate + seed (used by Railway release step) |
| `npm run db:studio` | Open Drizzle Studio GUI |

### Local first-time setup

```bash
docker compose up -d
cp .env.example .env
npm run db:migrate
npm run db:seed
```

### Railway deploy

Railway runs `npm run db:setup` on each deploy (see `railway.toml`):
1. Applies migrations (`db:migrate`)
2. Seeds if the database is empty (`db:seed`)

Set `FORCE_SEED=true` to wipe and re-seed.

### Creating a new migration

After editing files in `server/src/db/schema/`:

```bash
npm run db:generate
npm run db:migrate
```

## Health check

`GET /api/health` verifies database connectivity:

**Connected (200)**
```json
{
  "status": "ok",
  "database": "connected",
  "latencyMs": 12,
  "timestamp": "2026-06-10T12:00:00.000Z"
}
```

**Disconnected (503)**
```json
{
  "status": "error",
  "database": "disconnected",
  "error": "connection refused",
  "timestamp": "2026-06-10T12:00:00.000Z"
}
```

Railway uses this endpoint as the deploy health check.

## Seed data

`scripts/seed.ts` loads:
- 1 NBA league
- 12 NBA teams
- Multiple seasons (derived from player stats)
- 12 sample players with biographical info, career stints, season stats, and awards

The seed is idempotent: it skips if players already exist unless `FORCE_SEED=true`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `FORCE_SEED` | No | Set to `true` to force re-seed |
