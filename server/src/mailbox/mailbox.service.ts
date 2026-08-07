import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';

export interface MailReward {
  coins?: number;
  diamonds?: number;
  xp?: number;
}

@Injectable()
export class MailboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
  ) {}

  /** Called internally by AchievementService/DailyLoginService/DailyMissionService — not player-invoked directly. */
  async grant(userId: string, message: string, reward: MailReward): Promise<void> {
    await this.prisma.mailItem.create({
      data: {
        userId,
        message,
        rewardCoins: reward.coins ?? 0,
        rewardDiamonds: reward.diamonds ?? 0,
        rewardXp: reward.xp ?? 0,
      },
    });
  }

  async listMine(userId: string) {
    return this.prisma.mailItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async claim(userId: string, mailItemId: string) {
    const mail = await this.prisma.mailItem.findUnique({ where: { id: mailItemId } });
    if (!mail || mail.userId !== userId) throw new NotFoundException('Mail item not found');
    if (mail.claimedAt) throw new BadRequestException('Already claimed');

    await this.applyReward(userId, mail.rewardCoins, mail.rewardDiamonds, mail.rewardXp);
    await this.prisma.mailItem.update({ where: { id: mailItemId }, data: { claimedAt: new Date() } });

    return { rewardCoins: mail.rewardCoins, rewardDiamonds: mail.rewardDiamonds, rewardXp: mail.rewardXp };
  }

  async claimAll(userId: string) {
    const unclaimed = await this.prisma.mailItem.findMany({ where: { userId, claimedAt: null } });

    let totalCoins = 0;
    let totalDiamonds = 0;
    let totalXp = 0;
    for (const mail of unclaimed) {
      await this.applyReward(userId, mail.rewardCoins, mail.rewardDiamonds, mail.rewardXp);
      totalCoins += mail.rewardCoins;
      totalDiamonds += mail.rewardDiamonds;
      totalXp += mail.rewardXp;
    }

    if (unclaimed.length > 0) {
      await this.prisma.mailItem.updateMany({
        where: { id: { in: unclaimed.map((m) => m.id) } },
        data: { claimedAt: new Date() },
      });
    }

    return { claimedCount: unclaimed.length, totalCoins, totalDiamonds, totalXp };
  }

  private async applyReward(userId: string, coins: number, diamonds: number, xp: number): Promise<void> {
    if (coins > 0) await this.economyService.addCoins(userId, coins, 'mail_reward');
    if (diamonds > 0) await this.economyService.addDiamonds(userId, diamonds, 'mail_reward');
    if (xp > 0) await this.economyService.addXp(userId, xp);
  }
}
