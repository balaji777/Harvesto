import { isPreviousUtcDay, isSameUtcDay, isoWeekKey, utcMidnight } from './date-utils';

describe('date-utils', () => {
  it('utcMidnight truncates time-of-day', () => {
    const d = new Date('2026-03-05T23:59:59.999Z');
    expect(utcMidnight(d).toISOString()).toBe('2026-03-05T00:00:00.000Z');
  });

  it('isSameUtcDay is true for two timestamps on the same UTC day', () => {
    expect(isSameUtcDay(new Date('2026-03-05T00:00:01Z'), new Date('2026-03-05T23:00:00Z'))).toBe(true);
  });

  it('isSameUtcDay is false across a UTC day boundary', () => {
    expect(isSameUtcDay(new Date('2026-03-05T23:59:59Z'), new Date('2026-03-06T00:00:00Z'))).toBe(false);
  });

  it('isPreviousUtcDay is true when earlier is exactly one UTC day before later', () => {
    expect(isPreviousUtcDay(new Date('2026-03-05T08:00:00Z'), new Date('2026-03-06T02:00:00Z'))).toBe(true);
  });

  it('isPreviousUtcDay is false for a two-day gap', () => {
    expect(isPreviousUtcDay(new Date('2026-03-04T08:00:00Z'), new Date('2026-03-06T02:00:00Z'))).toBe(false);
  });

  it('isPreviousUtcDay is false for the same day', () => {
    expect(isPreviousUtcDay(new Date('2026-03-05T08:00:00Z'), new Date('2026-03-05T20:00:00Z'))).toBe(false);
  });

  // 2024-01-01 is a Monday, so it anchors ISO week 2024-W01 exactly —
  // a well-known reference point for sanity-checking the algorithm.
  it('isoWeekKey: 2024-01-01 (a Monday) is week 2024-W01', () => {
    expect(isoWeekKey(new Date('2024-01-01T00:00:00Z'))).toBe('2024-W01');
  });

  it('isoWeekKey: the following Sunday is still 2024-W01', () => {
    expect(isoWeekKey(new Date('2024-01-07T23:00:00Z'))).toBe('2024-W01');
  });

  it('isoWeekKey: the next Monday rolls over to 2024-W02', () => {
    expect(isoWeekKey(new Date('2024-01-08T00:00:00Z'))).toBe('2024-W02');
  });

  it('isoWeekKey: a late-December week can belong to next year (Thursday falls in January)', () => {
    // 2025-12-29 is a Monday whose Thursday (2026-01-01) falls in the new year.
    expect(isoWeekKey(new Date('2025-12-29T00:00:00Z'))).toBe('2026-W01');
  });
});
