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

/** ISO-8601 week key like "2026-W32" — the bucket DerbyService's Redis leaderboard resets on. */
export function isoWeekKey(date: Date): string {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7; // Monday=0 .. Sunday=6
  target.setUTCDate(target.getUTCDate() - dayNumber + 3); // move to this ISO week's Thursday

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNumber + 3);

  const weekNumber = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}
