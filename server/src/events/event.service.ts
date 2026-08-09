import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';

/**
 * Seasonal events (GAME_DESIGN.md §6.13) — server-config-driven, time-boxed.
 * Currency accrues off the same PlayerStatsService.recordEvent choke point
 * Derby's addScore uses, so no per-feature hook is needed to earn it.
 */
@Injectable()
export class EventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
  ) {}

  async getActive() {
    const now = new Date();
    return this.prisma.seasonalEvent.findFirst({
      where: { startAt: { lte: now }, endAt: { gte: now } },
      include: { rewardTiers: { orderBy: { tierIndex: 'asc' } } },
      orderBy: { startAt: 'desc' },
    });
  }

  /** Called by PlayerStatsService.recordEvent — a no-op if no event is currently running. */
  async addEventCurrency(userId: string, delta: number): Promise<void> {
    const active = await this.getActive();
    if (!active) return;

    await this.prisma.eventProgress.upsert({
      where: { userId_eventId: { userId, eventId: active.id } },
      update: { currencyEarned: { increment: delta } },
      create: { userId, eventId: active.id, currencyEarned: delta },
    });
  }

  async getMyProgress(userId: string) {
    const active = await this.getActive();
    if (!active) return null;

    const progress = await this.prisma.eventProgress.upsert({
      where: { userId_eventId: { userId, eventId: active.id } },
      update: {},
      create: { userId, eventId: active.id },
    });

    return {
      event: active,
      currencyEarned: progress.currencyEarned,
      claimedTierIndex: progress.claimedTierIndex,
      nextClaimableTier:
        active.rewardTiers.find(
          (t) => t.tierIndex === progress.claimedTierIndex + 1 && progress.currencyEarned >= t.thresholdCurrency,
        ) ?? null,
    };
  }

  /** Claims tiers sequentially — claimedTierIndex + 1 must be reachable with currencyEarned. */
  async claimNextTier(userId: string) {
    const active = await this.getActive();
    if (!active) throw new NotFoundException('No event is currently running');

    const progress = await this.prisma.eventProgress.findUnique({
      where: { userId_eventId: { userId, eventId: active.id } },
    });
    if (!progress) throw new NotFoundException('No progress in the current event yet');

    const nextTier = active.rewardTiers.find((t) => t.tierIndex === progress.claimedTierIndex + 1);
    if (!nextTier) throw new BadRequestException('No more reward tiers to claim');
    if (progress.currencyEarned < nextTier.thresholdCurrency) {
      throw new BadRequestException(`Need ${nextTier.thresholdCurrency} ${active.currencyName} to claim this tier`);
    }

    if (nextTier.rewardCoins > 0) await this.economyService.addCoins(userId, nextTier.rewardCoins, 'event_reward');
    if (nextTier.rewardDiamonds > 0) await this.economyService.addDiamonds(userId, nextTier.rewardDiamonds, 'event_reward');
    if (nextTier.rewardXp > 0) await this.economyService.addXp(userId, nextTier.rewardXp);

    await this.prisma.eventProgress.update({
      where: { userId_eventId: { userId, eventId: active.id } },
      data: { claimedTierIndex: nextTier.tierIndex },
    });

    return { tierIndex: nextTier.tierIndex, rewardCoins: nextTier.rewardCoins, rewardDiamonds: nextTier.rewardDiamonds, rewardXp: nextTier.rewardXp };
  }
}
