import { isPreviousUtcDay, isSameUtcDay, utcMidnight } from './date-utils';

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
});
