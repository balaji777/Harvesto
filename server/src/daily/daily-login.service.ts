import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailboxService } from '../mailbox/mailbox.service';
import { isPreviousUtcDay, isSameUtcDay } from '../common/utils/date-utils';

// 7-day escalating cycle, then repeats. Day 7 includes a small diamond bonus.
const LOGIN_REWARDS: { coins: number; diamonds: number; xp: number }[] = [
  { coins: 10, diamonds: 0, xp: 5 },
  { coins: 15, diamonds: 0, xp: 5 },
  { coins: 20, diamonds: 0, xp: 8 },
  { coins: 25, diamonds: 0, xp: 8 },
  { coins: 30, diamonds: 0, xp: 10 },
  { coins: 40, diamonds: 0, xp: 12 },
  { coins: 60, diamonds: 5, xp: 15 },
];

@Injectable()
export class DailyLoginService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailboxService: MailboxService,
  ) {}

  async getStatus(userId: string) {
    const profile = await this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
    const now = new Date();
    const canClaimToday = !profile.lastLoginRewardAt || !isSameUtcDay(profile.lastLoginRewardAt, now);
    return { streak: profile.loginStreak, canClaimToday };
  }

  async claim(userId: string) {
    const profile = await this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
    const now = new Date();

    if (profile.lastLoginRewardAt && isSameUtcDay(profile.lastLoginRewardAt, now)) {
      throw new BadRequestException('Already claimed today');
    }

    const continuingStreak = profile.lastLoginRewardAt && isPreviousUtcDay(profile.lastLoginRewardAt, now);
    const newStreak = continuingStreak ? profile.loginStreak + 1 : 1;
    const cycleDay = ((newStreak - 1) % LOGIN_REWARDS.length) + 1;
    const reward = LOGIN_REWARDS[cycleDay - 1];

    await this.prisma.playerProfile.update({
      where: { userId },
      data: { loginStreak: newStreak, lastLoginRewardAt: now },
    });
    await this.mailboxService.grant(userId, `Day ${cycleDay} login bonus (streak: ${newStreak})`, reward);

    return { streak: newStreak, cycleDay, reward };
  }
}
