# Ingestion Testing

This guide walks through simulating future scraper services against the Hoop Central ingestion API — using HTTP only, never writing directly to Postgres from the test script.

For the API contract, see [INGESTION_API.md](./INGESTION_API.md). For identity rules, see [INGESTION.md](./INGESTION.md).

## Prerequisites

- Postgres running with `DATABASE_URL` configured in `.env`
- Dependencies installed (`npm install`)

## 1. Prepare the database

```bash
npm run db:migrate
npm run db:seed
```

This loads seed players (LeBron, Curry, etc.), leagues, and teams.

## 2. Start the local server

In one terminal:

```bash
npm run dev
```

The API runs at `http://localhost:3001` by default.

If `INGEST_API_KEY` is set in `.env`, export it for test requests or add it to `.env` and the test script will send `x-ingest-api-key` automatically.

## 3. Run test ingestion

In a second terminal:

```bash
npm run ingest:test-data
```

### What the script does

- Sends **39 payloads** (31 unique + 8 intentional duplicates) via `POST /api/ingest/player-season`
- Uses **fetch only** — no database imports in the test script
- Covers **NBA**, **WNBA**, **G League**, and **NCAA**
- Exercises:
  - **Existing seed players** (`source: "seed"`, e.g. LeBron `2544`)
  - **Multi-season players** (same `source` + `externalId`, different season labels)
  - **Duplicate payloads** (same request sent twice in one run)
  - **Cross-source names** (e.g. "Jordan Cross" in NBA and NCAA — creates separate players until fuzzy matching exists)

### Expected first-run summary

On the **first** run after seed, expect roughly:

| Metric | Expected |
|--------|----------|
| Successful writes | 39 |
| Failed writes | 0 |
| Created players | Most new test players (~20+) |
| Reused players | Seed overlaps + duplicates in-run |
| Created leagues | G League / NCAA if not seeded |
| Created teams | G League / NCAA test teams |
| Created stats rows | Most unique season rows |

Exact counts depend on seed state.

## 4. Verify idempotency

Run the test script **again**:

```bash
npm run ingest:test-data
```

On the **second** run, expect:

- `created players: 0` (all identities already exist)
- `reused players: 39`
- `created stats rows: 0` (stats upsert, not duplicate)
- `created stints: 0`

Then verify the database:

```bash
npm run ingest:verify
```

### Success criteria for `ingest:verify`

```
Duplicate identities:     0
Duplicate stats rows:     0
Duplicate stints:         0

PASS — no duplicate rows detected.
```

## 5. Confirm profiles still work

Open the app at `http://localhost:5173` (Vite dev server):

1. Search for **LeBron James** — profile loads
2. Season history shows ingested / seed seasons
3. Team and league links still work

Or hit the API directly:

```bash
curl http://localhost:3001/api/players/1
```

## Full local flow (copy/paste)

```bash
# Terminal 1
npm run db:migrate
npm run db:seed
npm run dev

# Terminal 2
npm run ingest:test-data
npm run ingest:test-data
npm run ingest:verify
```

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3001` | API port |
| `INGEST_API_URL` | `http://localhost:{PORT}` | Override ingest target URL |
| `INGEST_API_KEY` | — | If set, sent as `x-ingest-api-key` |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot reach .../api/health` | Start `npm run dev` first |
| `401 Unauthorized` | Set `INGEST_API_KEY` in `.env` or pass matching header |
| `DATABASE_URL is not set` | Copy `.env.example` to `.env` and start Postgres |
| Duplicates after verify | Re-run migrate + seed on a clean DB, then test again |

## What success looks like

- Both test runs complete with **0 failed writes**
- Second run creates **no new players or stats rows**
- `ingest:verify` reports **PASS**
- Existing seed player profiles still load in the UI
- `npm run build` passes
