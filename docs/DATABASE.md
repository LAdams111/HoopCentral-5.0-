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
    │   ├── 0001_production_player_schema.sql
    │   └── meta/
    │       └── _journal.json
    └── schema/
        ├── leagues.ts
        ├── seasons.ts
        ├── teams.ts
        ├── players.ts
        └── index.ts
scripts/
└── seed.ts                     # Sample data loader
```

## Core tables

### `leagues`

| Column | Type | Notes |
|--------|------|-------|
| id | serial | Primary key |
| name | text | Display name (e.g. NBA, WNBA) |
| slug | text | Unique URL identifier |

### `teams`

| Column | Type | Notes |
|--------|------|-------|
| id | serial | Primary key |
| name | text | Full name |
| abbreviation | text | e.g. LAL, IND |
| league_id | integer | FK → leagues |

### `seasons`

| Column | Type | Notes |
|--------|------|-------|
| id | serial | Primary key |
| league_id | integer | FK → leagues |
| season_label | text | Unique per league (e.g. `2024-25`) |

### `players`

| Column | Type | Notes |
|--------|------|-------|
| id | serial | Primary key |
| slug | text | Unique URL identifier |
| display_name | text | Full name |
| current_team_id | integer | FK → teams (current team) |
| position | text | e.g. Point Guard |
| height_cm | integer | Height in centimeters |
| weight_kg | integer | Weight in kilograms |
| birth_date | date | Date of birth |
| hometown | text | Birthplace / hometown |
| headshot_url | text | Image URL |
| profile_views | integer | Profile view counter |
| created_at | timestamptz | Row created |
| updated_at | timestamptz | Last updated |

## Commands

Run from the **repository root**:

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:push` | Push schema directly (dev only — skips migration history) |
| `npm run db:seed` | Load 5 sample players, teams, leagues, seasons |
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

`railway.toml` runs database setup before the API starts:

| Phase | Command |
|-------|---------|
| Release | `npm run db:migrate && npm run db:seed` |
| Start | `npm run db:migrate && npm run db:seed && npm run start` |

Migrations read `process.env.DATABASE_URL` (injected when Postgres is linked to the service).

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

| Entity | Count | Details |
|--------|-------|---------|
| Leagues | 2 | NBA, WNBA |
| Teams | 5 | LAL, GSW, DEN, SAS, IND |
| Seasons | 2 | NBA 2024-25, WNBA 2024 |
| Players | 5 | LeBron James, Stephen Curry, Nikola Jokic, Victor Wembanyama, Caitlin Clark |

The seed is idempotent: it skips if players already exist unless `FORCE_SEED=true`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `FORCE_SEED` | No | Set to `true` to force re-seed |
