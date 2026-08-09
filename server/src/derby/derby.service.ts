import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { isoWeekKey } from '../common/utils/date-utils';

export interface DerbyLeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

export interface DerbyLeaderboard {
  weekKey: string;
  entries: DerbyLeaderboardEntry[];
}

/**
 * Weekly competitive leaderboard scoped to a neighborhood, backed by a Redis
 * sorted set — the piece GAME_DESIGN.md §12 Phase 4 flagged as blocked on
 * "a working Redis". No automated weekly payout job yet (see server/README.md);
 * this is the live leaderboard only.
 */
@Injectable()
export class DerbyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Called by PlayerStatsService.recordEvent — a no-op if the player isn't in a neighborhood. */
  async addScore(userId: string, points: number): Promise<void> {
    const membership = await this.prisma.neighborhoodMember.findUnique({ where: { userId } });
    if (!membership) return;

    await this.redis.client.zincrby(this.leaderboardKey(membership.neighborhoodId), points, userId);
  }

  async getLeaderboard(userId: string): Promise<DerbyLeaderboard | null> {
    const membership = await this.prisma.neighborhoodMember.findUnique({ where: { userId } });
    if (!membership) return null;

    const weekKey = isoWeekKey(new Date());
    const raw = await this.redis.client.zrevrange(this.leaderboardKey(membership.neighborhoodId), 0, 29, 'WITHSCORES');

    const memberIds: string[] = [];
    const scoreByUserId = new Map<string, number>();
    for (let i = 0; i < raw.length; i += 2) {
      memberIds.push(raw[i]);
      scoreByUserId.set(raw[i], Number(raw[i + 1]));
    }

    const users = await this.prisma.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, username: true } });
    const usernameById = new Map(users.map((u) => [u.id, u.username]));

    const entries: DerbyLeaderboardEntry[] = memberIds.map((id, index) => ({
      userId: id,
      username: usernameById.get(id) ?? 'Unknown',
      score: scoreByUserId.get(id) ?? 0,
      rank: index + 1,
    }));

    return { weekKey, entries };
  }

  private leaderboardKey(neighborhoodId: string): string {
    return `derby:${neighborhoodId}:${isoWeekKey(new Date())}`;
  }
}
