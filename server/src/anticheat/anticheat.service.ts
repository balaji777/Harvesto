import { Injectable, Logger } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { GAME_CONFIG } from '../common/constants/game-config';

/**
 * Non-blocking anomaly detection (GAME_DESIGN.md §10.4) — flags implausible
 * currency gains for manual/automated review. Never rejects the transaction
 * itself; feeds the existing users.bannedAt pipeline instead.
 */
@Injectable()
export class AntiCheatService {
  private readonly logger = new Logger(AntiCheatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Called by EconomyService after every currency-increasing transaction commits. */
  async checkCurrencyGain(userId: string, currency: Currency, delta: number): Promise<void> {
    if (delta <= 0) return;

    const singleCap =
      currency === Currency.COINS ? GAME_CONFIG.ANTICHEAT_MAX_SINGLE_COIN_GAIN : GAME_CONFIG.ANTICHEAT_MAX_SINGLE_DIAMOND_GAIN;
    if (delta > singleCap) {
      await this.flag(userId, 'single_gain_exceeds_cap', `${currency} +${delta} in one transaction (cap ${singleCap})`);
      return;
    }

    if (currency !== Currency.COINS) return;

    // Rolling burst window via Redis — first increment in the window sets
    // the TTL so the counter self-clears without a cron job.
    const key = `anticheat:coinburst:${userId}`;
    const total = await this.redis.client.incrby(key, delta);
    if (total === delta) {
      await this.redis.client.expire(key, GAME_CONFIG.ANTICHEAT_BURST_WINDOW_SECONDS);
    }
    if (total > GAME_CONFIG.ANTICHEAT_BURST_COIN_THRESHOLD) {
      await this.flag(userId, 'coin_burst', `+${total} coins within ${GAME_CONFIG.ANTICHEAT_BURST_WINDOW_SECONDS}s`);
    }
  }

  async listMyFlags(userId: string) {
    return this.prisma.playerFlag.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  private async flag(userId: string, reason: string, detail: string): Promise<void> {
    this.logger.warn(`Flagging ${userId}: ${reason} — ${detail}`);
    await this.prisma.playerFlag.create({ data: { userId, reason, detail } });
  }
}
