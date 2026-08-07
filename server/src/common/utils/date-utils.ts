/** Truncates to UTC midnight — the "day bucket" used for daily missions/login streaks. */
export function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return utcMidnight(a).getTime() === utcMidnight(b).getTime();
}

/** True if `earlier` is the UTC calendar day immediately before `later`. */
export function isPreviousUtcDay(earlier: Date, later: Date): boolean {
  const nextDay = new Date(utcMidnight(earlier).getTime() + 24 * 60 * 60 * 1000);
  return nextDay.getTime() === utcMidnight(later).getTime();
}
