import { levelForXp, xpToReachLevel } from './game-config';

describe('leveling curve', () => {
  it('level 1 requires 0 xp', () => {
    expect(xpToReachLevel(1)).toBe(0);
  });

  it('xp requirement strictly increases with level', () => {
    for (let level = 1; level < 30; level++) {
      expect(xpToReachLevel(level + 1)).toBeGreaterThan(xpToReachLevel(level));
    }
  });

  it('levelForXp is the inverse of xpToReachLevel at each threshold', () => {
    for (let level = 1; level < 30; level++) {
      const threshold = xpToReachLevel(level);
      expect(levelForXp(threshold)).toBeGreaterThanOrEqual(level);
    }
  });

  it('one xp below a threshold does not grant the level', () => {
    for (let level = 2; level < 30; level++) {
      const threshold = xpToReachLevel(level);
      if (threshold === 0) continue;
      expect(levelForXp(threshold - 1)).toBeLessThan(level);
    }
  });

  it('0 xp is level 1', () => {
    expect(levelForXp(0)).toBe(1);
  });
});
