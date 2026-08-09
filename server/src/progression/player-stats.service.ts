import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AchievementService } from './achievement.service';
import { DerbyService } from '../derby/derby.service';

export const STAT_KEYS = ['cropsHarvested', 'animalsCollected', 'goodsCrafted', 'ordersFulfilled', 'fishCaught'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

/**
 * Lifetime per-player counters. Every gameplay action that should count
 * toward an achievement or daily mission goes through recordEvent — see
 * FarmService.harvest, AnimalService.collect, BuildingService.collect,
 * OrderService.fulfill.
 */
@Injectable()
export class PlayerStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementService: AchievementService,
    private readonly derbyService: DerbyService,
  ) {}

  async getStats(userId: string) {
    return this.prisma.playerStats.upsert({ where: { userId }, update: {}, create: { userId } });
  }

  async recordEvent(userId: string, statKey: StatKey, delta = 1): Promise<void> {
    const stats = await this.prisma.playerStats.upsert({
      where: { userId },
      update: { [statKey]: { increment: delta } },
      create: { userId, [statKey]: delta },
    });

    await this.achievementService.checkAndUnlock(userId, statKey, stats[statKey]);
    // Same event feeds the Derby leaderboard — no-op if the player isn't in a neighborhood.
    await this.derbyService.addScore(userId, delta);
  }
}
