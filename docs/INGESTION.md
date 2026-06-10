# Player Ingestion

This document describes how future league scrapers should write data into Hoop Central without creating duplicate players.

## Core rule

**Scrapers must not insert directly into `players` without checking `player_identities` first.**

Each external record (NBA.com player ID, NCAA roster ID, etc.) should be resolved to a canonical `players.id` through the identity layer before stats, stints, or roster data are written.

## Identity model

The `player_identities` table links one canonical player to external IDs from a data source:

| Column | Purpose |
|--------|---------|
| `player_id` | Canonical Hoop Central player |
| `source` | Data source name (e.g. `nba_api`, `ncaa`, `manual`) |
| `external_id` | ID in that source's system |
| `created_at` / `updated_at` | Audit timestamps |

**Unique constraint:** `(source, external_id)` — the same external record always maps to one identity row.

**Index:** `player_id` — fast lookup of all identities for a player.

Example: Zion Williamson might have:

- `source = nba_api`, `external_id = 1629627` → `players.id = 42`
- `source = ncaa`, `external_id = zion-williamson-duke-2019` → `players.id = 42`

Both identities point to the same canonical player. His NBA and NCAA seasons appear on one profile.

## Matching order (future)

When a scraper encounters a player record, resolve the canonical player in this order:

1. **Exact identity match** — look up `(source, external_id)` in `player_identities`. If found, use that `player_id`.
2. **Cross-source identity match** — if the scraper knows an alternate source ID already linked to this player, follow that identity (future cross-reference table or alias map).
3. **Fuzzy match** — match by normalized name + date of birth + league history overlap (not implemented yet).
4. **Create new player** — only when no match is found. Create the `players` row, then create the `player_identities` row in the same transaction.

## Server helper

Use `findOrCreatePlayerByIdentity()` from `server/src/services/player-identity.service.ts`:

```typescript
const { player, identity, created } = await findOrCreatePlayerByIdentity({
  source: "nba_api",
  externalId: "1629627",
  displayName: "Zion Williamson",
  birthDate: "2000-07-06",
});
```

This helper currently implements step 1 and step 4 only (exact match or create). Fuzzy matching will be added later.

## What scrapers should write

After resolving `player_id`:

- **Season stats** → `player_season_stats` (upsert by player + team + season + league)
- **Career stints** → `player_stints`
- **Current team** → update `players.current_team_id` when appropriate
- **New external ID** → insert into `player_identities` if a new source ID is discovered for an existing player

Scrapers should **not**:

- Insert into `players` without an identity check
- Assume one player per league — the same person spans leagues
- Rely on display name alone for deduplication

## Dev testing

In non-production environments, `POST /api/dev/identity-test` exercises `findOrCreatePlayerByIdentity`:

```json
{
  "source": "test_source",
  "externalId": "test-zion-001",
  "displayName": "Zion Williamson",
  "birthDate": "2000-07-06"
}
```

Calling the same `source` + `externalId` twice returns the existing player with `created: false`.

This endpoint is disabled in production.

## Seed data

Existing seed players receive a `manual` identity with `external_id` set to the player's slug. Re-running seed or `npm run db:ensure-identities` will not create duplicates thanks to the `(source, external_id)` unique constraint.
