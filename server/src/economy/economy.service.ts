import { BadRequestException, Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { levelForXp, xpToReachLevel } from '../common/constants/game-config';
import { AntiCheatService } from '../anticheat/anticheat.service';

@Injectable()
export class EconomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antiCheatService: AntiCheatService,
  ) {}

  async getWallet(userId: string) {
    const profile = await this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
    return {
      level: profile.level,
      xp: profile.xp,
      xpToNextLevel: this.xpRemainingToNextLevel(profile.level, profile.xp),
      coins: profile.coins,
      diamonds: profile.diamonds,
    };
  }

  /** Adjusts coin balance and records the ledger entry atomically. Throws if it would go negative. */
  async addCoins(userId: string, delta: number, reason: string): Promise<void> {
    await this.adjustCurrency(userId, Currency.COINS, delta, reason);
  }

  async addDiamonds(userId: string, delta: number, reason: string): Promise<void> {
    await this.adjustCurrency(userId, Currency.DIAMONDS, delta, reason);
  }

  /** Adds XP and recomputes level. Returns the new level and whether a level-up occurred. */
  async addXp(userId: string, xpDelta: number): Promise<{ level: number; leveledUp: boolean }> {
    if (xpDelta < 0) throw new BadRequestException('xpDelta must be non-negative');

    const profile = await this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
    const newXp = profile.xp + xpDelta;
    const newLevel = levelForXp(newXp);

    await this.prisma.playerProfile.update({
      where: { userId },
      data: { xp: newXp, level: newLevel },
    });

    return { level: newLevel, leveledUp: newLevel > profile.level };
  }

  private async adjustCurrency(userId: string, currency: Currency, delta: number, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const profile = await tx.playerProfile.findUniqueOrThrow({ where: { userId } });
      const field = currency === Currency.COINS ? 'coins' : 'diamonds';
      const newBalance = profile[field] + delta;

      if (newBalance < 0) {
        throw new BadRequestException(`Insufficient ${field}`);
      }

      await tx.playerProfile.update({ where: { userId }, data: { [field]: newBalance } });
      await tx.transaction.create({ data: { userId, currency, delta, reason } });
    });

    await this.antiCheatService.checkCurrencyGain(userId, currency, delta);
  }

  private xpRemainingToNextLevel(level: number, xp: number): number {
    return Math.max(0, xpToReachLevel(level + 1) - xp);
  }

  /**
   * Economy tuning pass (GAME_DESIGN.md §12 Phase 3) — sink/source totals
   * per currency+reason off the append-only Transaction ledger. Pass a
   * userId for one player's breakdown, omit it for a global aggregate.
   * This is the tooling the design doc calls for; real balance changes
   * still need real player telemetry to act on, which a dev sandbox
   * doesn't have — see server/README.md for the current manual read.
   */
  async getSinkSourceReport(userId?: string) {
    const rows = await this.prisma.transaction.groupBy({
      by: ['currency', 'reason'],
      where: userId ? { userId } : undefined,
      _sum: { delta: true },
      _count: { _all: true },
    });

    return rows
      .map((r) => ({
        currency: r.currency,
        reason: r.reason,
        netDelta: r._sum.delta ?? 0,
        transactionCount: r._count._all,
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency) || b.netDelta - a.netDelta);
  }
}
