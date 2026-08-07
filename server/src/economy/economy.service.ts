import { BadRequestException, Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { levelForXp, xpToReachLevel } from '../common/constants/game-config';

@Injectable()
export class EconomyService {
  constructor(private readonly prisma: PrismaService) {}

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
  }

  private xpRemainingToNextLevel(level: number, xp: number): number {
    return Math.max(0, xpToReachLevel(level + 1) - xp);
  }
}
