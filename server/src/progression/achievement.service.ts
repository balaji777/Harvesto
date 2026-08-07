import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailboxService } from '../mailbox/mailbox.service';

@Injectable()
export class AchievementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailboxService: MailboxService,
  ) {}

  async listDefinitions() {
    return this.prisma.achievementDefinition.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
  }

  async listMine(userId: string) {
    return this.prisma.playerAchievement.findMany({
      where: { userId },
      include: { achievementDefinition: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  /**
   * Called by PlayerStatsService right after a stat increments. Unlocks any
   * not-yet-unlocked achievement for that statKey whose target is now met,
   * and mails the reward — see MailboxService.
   */
  async checkAndUnlock(userId: string, statKey: string, currentValue: number): Promise<void> {
    const candidates = await this.prisma.achievementDefinition.findMany({
      where: { statKey, targetValue: { lte: currentValue } },
    });
    if (candidates.length === 0) return;

    const alreadyUnlocked = await this.prisma.playerAchievement.findMany({
      where: { userId, achievementDefinitionId: { in: candidates.map((c) => c.id) } },
      select: { achievementDefinitionId: true },
    });
    const unlockedIds = new Set(alreadyUnlocked.map((a) => a.achievementDefinitionId));

    for (const achievement of candidates) {
      if (unlockedIds.has(achievement.id)) continue;

      await this.prisma.playerAchievement.create({
        data: { userId, achievementDefinitionId: achievement.id },
      });
      await this.mailboxService.grant(userId, `Achievement unlocked: ${achievement.name}`, {
        coins: achievement.rewardCoins,
        diamonds: achievement.rewardDiamonds,
        xp: achievement.rewardXp,
      });
    }
  }
}
