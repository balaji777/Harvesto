import { BadRequestException, Injectable } from '@nestjs/common';
import { StoragePool } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { InventoryService } from '../inventory/inventory.service';
import { PlayerStatsService } from '../progression/player-stats.service';
import { GAME_CONFIG } from '../common/constants/game-config';

@Injectable()
export class FishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
    private readonly inventoryService: InventoryService,
    private readonly playerStatsService: PlayerStatsService,
  ) {}

  async listFishTypes() {
    return this.prisma.fishType.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async getStatus(userId: string) {
    const profile = await this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
    return {
      castReadyAt: profile.fishingCastReadyAt,
      isCasting: profile.fishingCastReadyAt !== null,
      isReady: profile.fishingCastReadyAt !== null && profile.fishingCastReadyAt <= new Date(),
    };
  }

  async cast(userId: string) {
    const profile = await this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
    if (profile.fishingCastReadyAt !== null) {
      throw new BadRequestException('You already have a line in the water');
    }

    const castReadyAt = new Date(Date.now() + GAME_CONFIG.FISHING_CAST_TIME_SECONDS * 1000);
    await this.prisma.playerProfile.update({ where: { userId }, data: { fishingCastReadyAt: castReadyAt } });
    return { castReadyAt };
  }

  async collect(userId: string) {
    const profile = await this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
    if (!profile.fishingCastReadyAt) throw new BadRequestException("You haven't cast a line yet");
    if (profile.fishingCastReadyAt > new Date()) throw new BadRequestException('Nothing biting yet');

    const pool = await this.prisma.fishType.findMany({ where: { unlockLevel: { lte: profile.level } } });
    const caught = weightedRandomPick(pool);

    // Barn-full check happens inside addToInventory; if it throws, the cast
    // stays ready so the player can retry once there's room.
    await this.inventoryService.addToInventory(userId, caught.id, 1, StoragePool.BARN);
    const { level, leveledUp } = await this.economyService.addXp(userId, caught.xpOnCatch);
    await this.prisma.playerProfile.update({ where: { userId }, data: { fishingCastReadyAt: null } });
    await this.playerStatsService.recordEvent(userId, 'fishCaught');

    return { caughtFishTypeId: caught.id, caughtFishName: caught.name, xpGained: caught.xpOnCatch, level, leveledUp };
  }
}

function weightedRandomPick<T extends { rarityWeight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.rarityWeight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= item.rarityWeight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}
