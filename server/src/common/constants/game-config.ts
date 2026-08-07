// Central tuning knobs for Phase 1 + Phase 2. Kept out of scattered magic
// numbers so balance passes (see GAME_DESIGN.md §13) touch one file.

export const GAME_CONFIG = {
  STARTING_COINS: 500,
  STARTING_DIAMONDS: 20,
  STARTING_GRID_WIDTH: 16,
  STARTING_GRID_HEIGHT: 16,
  // Center 8x8 of the 16x16 grid starts FARMABLE; the rest is LOCKED
  // and cleared via the (later) tools/expansion system.
  STARTING_FARMABLE_RADIUS: 4,
  SILO_CAPACITY: 50,
  BARN_CAPACITY: 50,
  // Truck orders: how many stay active at once, and how long each lasts
  // before it's replaced on next fetch — see OrderService.
  TRUCK_ORDER_SLOT_COUNT: 3,
  TRUCK_ORDER_EXPIRY_MINUTES: 30,
} as const;

/**
 * Cumulative XP required to *reach* a given level.
 * Front-loaded curve: fast early levels, flattening tail — see GAME_DESIGN.md §6.8.
 * xpToReach(n) = round(50 * n^1.5)
 */
export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(50 * Math.pow(level - 1, 1.5));
}

/** Highest level whose cumulative XP threshold is <= totalXp. */
export function levelForXp(totalXp: number): number {
  let level = 1;
  // Phase 1 content is curated through level 15 (GAME_DESIGN.md §6.8);
  // the curve itself is unbounded, so cap the search, not the formula.
  while (xpToReachLevel(level + 1) <= totalXp && level < 1000) {
    level++;
  }
  return level;
}
