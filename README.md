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

## Production build

```bash
npm run build
DATABASE_URL=your_production_url npm run start
```

Express serves the built client from `client/dist` when `NODE_ENV=production`.

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
