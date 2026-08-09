# Harvesto Server (Phase 1 + Phase 2 + Phase 3 core + Phase 4 slice)

NestJS + Prisma/PostgreSQL + Redis backend. Phase 1 covers guest/email auth,
the farm grid, crop planting/harvesting with server-authoritative timers,
silo storage, and the coin/XP economy. Phase 2 adds the production economy
(animals, buildings/recipes, barn storage, truck orders) and the engagement
loop (achievements, daily login streak, daily missions, mailbox). Phase 3
(partial) adds friends, farm visits, help/gifting, and boat orders. Phase 4
(partial) adds the fishing lake, train orders, character customization, and
decorations/farm-value. See [GAME_DESIGN.md](../GAME_DESIGN.md) for the full
design.

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
| GET | `/orders/boat` 🔒 | Active boat order (bigger, rarer, better-paying — unlocked at level 5); empty until then |
| POST | `/orders/boat/fulfill` 🔒 | Deliver a boat order's required items (`orderId`) |
| GET | `/orders/train` 🔒 | Active train order (biggest/rarest/best-paying — unlocked at level 10); empty until then |
| POST | `/orders/train/fulfill` 🔒 | Deliver a train order's required items (`orderId`) |

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

### Friends (Phase 3)

| Method | Path | Purpose |
|---|---|---|
| GET | `/friends` 🔒 | Your accepted friends (username, level) |
| GET | `/friends/requests` 🔒 | Incoming pending friend requests |
| POST | `/friends/request` 🔒 | Send a friend request (`targetUserId`) |
| POST | `/friends/accept` 🔒 | Accept an incoming request (`friendshipId`) |
| POST | `/friends/decline` 🔒 | Decline an incoming request (`friendshipId`) |
| POST | `/friends/remove` 🔒 | Unfriend (`friendshipId`) |
| GET | `/friends/:friendId/farm` 🔒 | View a friend's farm read-only (403 if you're not friends) |
| POST | `/friends/:friendId/help` 🔒 | Help a friend — rewards *you*, once per friend per UTC day, touches nothing of theirs |
| POST | `/friends/:friendId/gift` 🔒 | Send a friend a small mailed gift, free to send, once per friend per UTC day |

### Fishing (Phase 4)

| Method | Path | Purpose |
|---|---|---|
| GET | `/fishing/types` 🔒 | Static fish catalog (unlock level, sell price, catch rarity weight) |
| GET | `/fishing/status` 🔒 | Whether you have a line in the water and whether it's ready |
| POST | `/fishing/cast` 🔒 | Cast a line — fails if you already have one out |
| POST | `/fishing/collect` 🔒 | Collect the catch once ready: a weighted-random fish from your unlocked pool, into the Barn |

### Character customization (Phase 4)

| Method | Path | Purpose |
|---|---|---|
| GET | `/cosmetics/types` 🔒 | Static cosmetic catalog (5 categories: skin tone, hair, outfit, hat, accessory) |
| GET | `/cosmetics/mine` 🔒 | `{ owned, equipped }` — what you've unlocked and what's currently worn per category |
| POST | `/cosmetics/buy` 🔒 | Unlock a cosmetic (`cosmeticTypeId`) — some are free starters (cost 0) |
| POST | `/cosmetics/equip` 🔒 | Wear an owned cosmetic — replaces whatever else is equipped in its category |

### Decorations (Phase 4)

| Method | Path | Purpose |
|---|---|---|
| GET | `/decorations/types` 🔒 | Static decoration catalog (cost, unlock level, farm-value bonus) |
| GET | `/decorations/mine` 🔒 | Owned decorations + quantities |
| POST | `/decorations/buy` 🔒 | Buy N of a decoration — stacks onto existing quantity (`decorationTypeId`, `quantity`) |
| GET | `/decorations/farm-value` 🔒 | Sum of `quantity × farmValueBonus` across everything you own — the cosmetic flex stat |

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
- **`utcMidnight`/`isSameUtcDay`/`isPreviousUtcDay`** (`src/common/utils/date-utils.ts`) are the shared UTC-calendar-day helpers behind the login streak, daily mission reset, and now Friend Help/Gift rate-limiting.
- **`Friendship` is one row per pair**, direction (`requesterId`/`addresseeId`) only matters for who can accept/decline it. `FriendService` always checks both directions when looking up an existing relationship so a pair can never end up with two rows or a duplicate pending request.
- **Help/Gift rate-limiting reuses the unique-constraint-then-catch pattern**: `FriendInteraction` has a `@@unique([actorId, targetId, type, day])`, and the service just tries the insert and catches Prisma's `P2002` — no separate existence check/race window.
- **Boat and train orders share `OrderService`/`fulfill` entirely with truck orders** — only generation is parameterized differently (`ORDER_CONFIG` per `OrderSource`: item counts, quantity ranges, reward multiplier, xp-per-unit, and a diamond bonus truck orders don't have; each also carries its own `unlockLevel`). `GET /orders/boat` and `/orders/train` return an empty array below their level gate rather than erroring, so the client doesn't need special-case handling for "not unlocked yet." **Train orders are single-player** — the design doc's cooperative multi-neighbor contribution needs Neighborhoods, which don't exist yet.
- **Discovering another player's id isn't built** — `POST /friends/request` takes a raw `targetUserId`, consistent with how every other Phase 2 endpoint takes ids directly. A real client needs some way to surface an id to request (a shareable "friend code," username search, or a neighborhood member list from Phase 3's still-open Neighborhoods scope) — not built yet.
- **Fishing's cast state lives directly on `PlayerProfile`** (`fishingCastReadyAt`), not its own table — there's only ever one line in the water per player, so it's the same pattern as the login streak rather than a per-item state machine like `Animal`.
- **`FishingService.collect` picks a fish via weighted random** (`FishType.rarityWeight`, cumulative-sum-then-roll) from whatever's unlocked at the player's level — verified live across 5 catches landing correctly in the Barn and correctly triggering the `fishing_bronze` achievement (`fishCaught >= 5`) via the same `PlayerStatsService.recordEvent` hook every other stat-tracked action uses.
- **"Owning" a cosmetic and "wearing" it are two separate facts**: `PlayerCosmetic` (unlocked/purchased) and `PlayerEquippedCosmetic` (one row per `CosmeticCategory`, unique per player) are different tables. Equipping just upserts the category's row — no need to un-equip the previous item first, verified live equipping two categories (Hat, Outfit) independently without either clobbering the other.
- **Decorations are a pure flex stat, not gameplay-relevant** — `DecorationService.getFarmValue` just sums `quantity × farmValueBonus`; nothing else in the game reads it (yet — a future "visitor appeal" mechanic per GAME_DESIGN.md §6.14 could).

## Not yet implemented (remaining Phase 2/3/4 scope)

**Phase 2:** the expansion/tools system for unlocking farm tiles, IAP receipt validation, and push notifications. IAP and push notifications specifically need real Google Play/Apple/Firebase credentials to build and test against, which wasn't available in this environment.

**Phase 3:** Roadside Shop + Newspaper/classifieds, Neighborhoods + chat (the design doc calls for WebSockets here — nothing beyond REST exists yet), seasonal event framework, and an analytics-driven economy tuning pass using the `Transaction` ledger.

**Phase 4:** Town system, Derby league (blocked on Neighborhoods + a real Redis for leaderboards — Redis isn't even running in this dev environment, only Postgres is), ongoing seasonal content cadence, A/B testing framework, expanded anti-cheat/anomaly detection. Decorations have no grid placement yet — same simplification Buildings made in Phase 2 (an owned count, not a placed object).
