# Hoop Central

Elite Prospects–style basketball player database. Phase 1: core platform with home page, player search, and player profiles.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS + TanStack Query
- **Backend:** Express + TypeScript + Drizzle ORM
- **Database:** PostgreSQL 16

## Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure environment

```bash
cp .env.example .env
```

### 4. Push schema and seed data

```bash
npm run db:push
npm run db:seed
```

### 5. Run dev servers

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001

The Vite dev server proxies `/api` requests to Express.

## Production build (local test)

```bash
npm run build
DATABASE_URL=your_production_url npm run start
```

Express serves the built client from `client/dist` when `NODE_ENV=production`.

## Deploy to Railway

### 1. Connect GitHub repo

In [Railway](https://railway.app), create a new project → **Deploy from GitHub repo** → select `LAdams111/HoopCentral-5.0-`.

Railway reads `railway.toml` automatically:
- **Build:** `npm install && npm run build`
- **Release:** `npm run db:setup` (creates tables + seeds sample players on first deploy)
- **Start:** `npm run start`
- **Health check:** `/api/health`

### 2. Add PostgreSQL

In the same Railway project: **+ New** → **Database** → **PostgreSQL**.

### 3. Link database to web service

Open your web service → **Variables** → **Add Reference** → select the Postgres `DATABASE_URL`.

Railway injects `DATABASE_URL` automatically. No manual copy needed.

### 4. Deploy

Push to `main` on GitHub — Railway redeploys automatically.

On first deploy, the release step runs `db:push` + `db:seed`. Re-deploys skip seeding if players already exist (safe).

### 5. Verify

Visit your Railway URL:
- Homepage loads with player counters and cards
- `/players` search works
- `/players/1` shows a player profile

### Railway troubleshooting

| Problem | Fix |
|---------|-----|
| Site loads but no players | Check deploy logs for release command errors; confirm `DATABASE_URL` is linked |
| Build fails | Check Node 20+ is used (set in `nixpacks.toml`) |
| 502 / crash on start | Check deploy logs; confirm Postgres is running |
| Re-seed database | Set `FORCE_SEED=true` in Railway variables, redeploy, then remove it |

## API endpoints (Phase 1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/players` | Search/list players (`?q=name`) |
| GET | `/api/players/:id` | Player profile with stats |
| GET | `/api/players/count` | Total player count |
| GET | `/api/featured-players` | Featured players for homepage |
| GET | `/api/teams/count` | Total team count |
| GET | `/api/seasons/count` | Total season count |
| POST | `/api/players/:id/view` | Increment profile view count |

## Project structure

```
client/          # Vite React frontend
server/          # Express API + Drizzle schema
scripts/         # Database seed script
docs/            # Architecture documentation
```
