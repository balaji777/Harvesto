# Harvesto Server (Phase 1 + Phase 2)

NestJS + Prisma/PostgreSQL + Redis backend. Phase 1 covers guest/email auth,
the farm grid, crop planting/harvesting with server-authoritative timers,
silo storage, and the coin/XP economy. Phase 2 adds the production economy
(animals, buildings/recipes, barn storage, truck orders) and the engagement
loop (achievements, daily login streak, daily missions, mailbox). See
[GAME_DESIGN.md](../GAME_DESIGN.md) for the full design.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ and Redis (or a Redis-compatible service like Memurai on Windows) — locally installed or via `docker compose -f ../docker-compose.yml up -d`

## Setup

```bash
cp .env.example .env        # adjust secrets/connection strings if you like
npm install
npm run prisma:migrate      # creates the schema, prompts for a migration name the first time
npm run prisma:seed         # loads crop/animal/building/recipe/achievement/mission reference data
npm run start:dev
```

The API listens on `http://localhost:3000/api`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm test` | Unit tests (no DB required — see `src/**/*.spec.ts`) |
| `npm run test:e2e` | End-to-end tests against a live Postgres/Redis |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:seed` | Re-seed reference data (idempotent upsert) |

## Endpoints

All routes are prefixed with `/api`. Routes marked 🔒 require `Authorization: Bearer <accessToken>`.

### Auth & economy (Phase 1)

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/guest` | Login/create a guest account from a device id |
| POST | `/auth/register` | Create an email/password account |
| POST | `/auth/login` | Email/password login |
| POST | `/auth/refresh` | Rotate a refresh token for a new pair |
| POST | `/auth/logout` | Revoke a refresh token |
| GET | `/auth/me` 🔒 | Current profile summary |
| GET | `/economy/wallet` 🔒 | Coins, diamonds, level, xp |

### Farm (Phase 1)

| Method | Path | Purpose |
|---|---|---|
| GET | `/farm` 🔒 | Full farm grid + planted crops |
| GET | `/farm/crop-types` 🔒 | Static crop catalog |
| POST | `/farm/plant` 🔒 | Plant a seed on a tile (`x`, `y`, `cropTypeId`) |
| POST | `/farm/harvest` 🔒 | Harvest a ready crop (`tileId`) |

### Inventory (Phase 1, extended in Phase 2)

| Method | Path | Purpose |
|---|---|---|
| GET | `/inventory` 🔒 | `{ silo: {...}, barn: {...} }` — capacity + contents of each pool |
| POST | `/inventory/sell` 🔒 | Sell goods from whichever pool they live in (`itemTypeId`, `quantity`) |

### Animals (Phase 2)

| Method | Path | Purpose |
|---|---|---|
| GET | `/animals/types` 🔒 | Static animal catalog |
| GET | `/animals` 🔒 | Your owned animals + their state |
| POST | `/animals/buy` 🔒 | Buy an animal into an owned pen (`animalTypeId`, `buildingId`) |
| POST | `/animals/feed` 🔒 | Feed an idle animal, starting production (`animalId`) |
| POST | `/animals/collect` 🔒 | Collect a ready product into the Barn (`animalId`) |

### Buildings & recipes (Phase 2)

| Method | Path | Purpose |
|---|---|---|
| GET | `/buildings/types` 🔒 | Static building catalog (pens + factories) |
| GET | `/buildings/recipes?buildingTypeId=` 🔒 | Recipes, optionally filtered to one factory type |
| GET | `/buildings` 🔒 | Your owned buildings + their animals/queue |
| POST | `/buildings/buy` 🔒 | Buy a building — one of each type per player (`buildingTypeId`) |
| POST | `/buildings/craft` 🔒 | Start a recipe in an owned factory (`buildingId`, `recipeId`) |
| POST | `/buildings/collect` 🔒 | Collect a finished craft into the Barn (`queueEntryId`) |

### Truck orders (Phase 2)

| Method | Path | Purpose |
|---|---|---|
| GET | `/orders/truck` 🔒 | Active orders, auto-topped-up to 3 on each fetch |
| POST | `/orders/truck/fulfill` 🔒 | Deliver an order's required items for its coin/xp reward (`orderId`) |

### Achievements, daily login/missions, mailbox (Phase 2)

| Method | Path | Purpose |
|---|---|---|
| GET | `/achievements` 🔒 | Static achievement catalog (category/tier/target) |
| GET | `/achievements/mine` 🔒 | Achievements you've unlocked |
| GET | `/daily/login-bonus` 🔒 | Current streak + whether today's bonus is claimable |
| POST | `/daily/login-bonus/claim` 🔒 | Claim today's login bonus (mailed, escalating over a 7-day cycle) |
| GET | `/daily/missions` 🔒 | Today's 3 missions (auto-assigned on first fetch each UTC day), with live progress |
| POST | `/daily/missions/claim` 🔒 | Claim a completed mission's reward (`assignmentId`) |
| GET | `/mailbox` 🔒 | Recent mail (claimed + unclaimed) |
| POST | `/mailbox/claim` 🔒 | Claim one mail item's reward (`mailItemId`) |
| POST | `/mailbox/claim-all` 🔒 | Claim every unclaimed mail item at once |

## Design notes

- **Server-authoritative timers everywhere**: crop `readyAt`, animal `productReadyAt`, and recipe `readyAt` are all computed server-side and re-checked on every action — the client predicts, the server decides (GAME_DESIGN.md §9.2/§9.4).
- **All `DateTime` columns are `@db.Timestamptz(3)`.** They started as plain `timestamp` (no timezone) in the Phase 1 schema; live testing surfaced that raw SQL (e.g. an admin `now() - interval '1 minute'` in a non-UTC psql session) silently produced the *wrong* timestamp against a naive column, since Postgres casts a `timestamptz` into a naive column using the session's local time, not UTC. The app itself was never affected (Node/Prisma are internally UTC-consistent), but it's a real footgun for any future raw-SQL tooling — fixed by making every timestamp column explicitly timezone-aware. The `harvesto` database's default session timezone is also set to UTC for the same reason.
- **Currency changes are transactional**: every coin/diamond delta goes through `EconomyService`, which writes the balance and an append-only `Transaction` row inside one Prisma transaction — this is the ledger the future economy-tuning pass reads from (§8).
- **`ItemCatalogService`** is the single place that resolves an `itemTypeId` (crop, animal product, or factory good) to its name/price/storage-pool (crops → Silo, everything else → Barn). `InventoryService`, `AnimalService`, `BuildingService`, and `OrderService` all go through it rather than each hardcoding lookups.
- **`InventoryService.removeManyFromInventory`** validates and deducts several items atomically (all-or-nothing) — shared by animal feeding, recipe crafting, and order fulfillment.
- **Buildings have no grid placement yet** — unlike crops, a `Building` is just "one of each `BuildingType` per player," not a placed object on a tile. Placement is a reasonable next slice once the client has building UI.
- **Truck orders are generated on demand**, not by a scheduled job — `GET /orders/truck` tops up to `GAME_CONFIG.TRUCK_ORDER_SLOT_COUNT` (3) if any have expired/been fulfilled, rather than a cron sweeping expired orders.
- **Refresh tokens are stateless JWTs with a Redis revocation list**, not DB-persisted sessions — rotation blocklists the old `jti` until its natural expiry.
- Google/Apple sign-in are still stubbed out (guest + email only) — see `AuthProvider` enum in `prisma/schema.prisma` for where they plug in.
- **`PlayerStatsService.recordEvent`** is the single hook every gameplay action (`FarmService.harvest`, `AnimalService.collect`, `BuildingService.collect`, `OrderService.fulfill`) calls into — it increments a lifetime counter *and* triggers `AchievementService.checkAndUnlock`, so achievements never need their own scattered call sites.
- **Daily missions compute progress lazily**, not via their own increment hooks: each `DailyMissionAssignment` snapshots the relevant `PlayerStats` value at assignment time, and progress is just `(current stat value) - (snapshot)`. This reuses the achievement stat-tracking infrastructure entirely — see `src/daily/daily-mission.service.ts`.
- **Achievement, daily-login, and daily-mission rewards are all delivered via the mailbox**, not applied instantly — consistent with how these unlock as a side effect of another action (e.g. your 10th harvest) rather than a direct player-initiated purchase.
- **`utcMidnight`/`isSameUtcDay`/`isPreviousUtcDay`** (`src/common/utils/date-utils.ts`) are the shared UTC-calendar-day helpers behind both the login streak and daily mission reset — pulled out and unit-tested on their own after the timestamptz timezone incident above made "is this actually today" worth getting right in one place.

## Not yet implemented (remaining Phase 2 scope)

The expansion/tools system for unlocking farm tiles, IAP receipt validation, and push notifications are still open — see GAME_DESIGN.md's Phase 2 description. IAP and push notifications specifically need real Google Play/Apple/Firebase credentials to build and test against, which wasn't available in this environment.
