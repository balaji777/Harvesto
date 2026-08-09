import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FriendInteractionType, FriendshipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { MailboxService } from '../mailbox/mailbox.service';
import { FarmService } from '../farm/farm.service';
import { GAME_CONFIG } from '../common/constants/game-config';
import { utcMidnight } from '../common/utils/date-utils';

@Injectable()
export class FriendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
    private readonly mailboxService: MailboxService,
    private readonly farmService: FarmService,
  ) {}

  async sendRequest(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new BadRequestException("You can't friend yourself");

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('User not found');

    const existing = await this.findRelationship(userId, targetUserId);
    if (existing) {
      throw new BadRequestException(
        existing.status === FriendshipStatus.ACCEPTED ? 'Already friends' : 'A friend request is already pending',
      );
    }

    return this.prisma.friendship.create({ data: { requesterId: userId, addresseeId: targetUserId } });
  }

  async accept(userId: string, friendshipId: string) {
    await this.getPendingIncoming(userId, friendshipId);
    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED, respondedAt: new Date() },
    });
  }

  async decline(userId: string, friendshipId: string): Promise<void> {
    await this.getPendingIncoming(userId, friendshipId);
    await this.prisma.friendship.delete({ where: { id: friendshipId } });
  }

  async remove(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
      throw new NotFoundException('Friendship not found');
    }
    await this.prisma.friendship.delete({ where: { id: friendshipId } });
  }

  async listFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { status: FriendshipStatus.ACCEPTED, OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { select: { id: true, username: true, profile: { select: { level: true } } } },
        addressee: { select: { id: true, username: true, profile: { select: { level: true } } } },
      },
    });

    return friendships.map((friendship) => {
      const friend = friendship.requesterId === userId ? friendship.addressee : friendship.requester;
      return {
        friendshipId: friendship.id,
        userId: friend.id,
        username: friend.username,
        level: friend.profile?.level ?? 1,
      };
    });
  }

  async listIncomingRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      include: { requester: { select: { id: true, username: true } } },
    });
  }

  async viewFriendFarm(userId: string, friendId: string) {
    await this.assertFriends(userId, friendId);
    return this.farmService.getFarmState(friendId);
  }

  /** Rewards the *helper*, not the friend — purely goodwill, doesn't touch the friend's farm/resources. */
  async help(userId: string, friendId: string) {
    await this.assertFriends(userId, friendId);
    await this.recordInteractionOnce(userId, friendId, FriendInteractionType.HELP, 'You already helped this friend today');

    await this.economyService.addCoins(userId, GAME_CONFIG.FRIEND_HELP_REWARD_COINS, 'friend_help');
    const { level, leveledUp } = await this.economyService.addXp(userId, GAME_CONFIG.FRIEND_HELP_REWARD_XP);
    return { rewardCoins: GAME_CONFIG.FRIEND_HELP_REWARD_COINS, rewardXp: GAME_CONFIG.FRIEND_HELP_REWARD_XP, level, leveledUp };
  }

  /** Mails the *friend* a small reward. Free to send, rate-limited to once per friend per UTC day. */
  async gift(userId: string, friendId: string) {
    await this.assertFriends(userId, friendId);
    await this.recordInteractionOnce(userId, friendId, FriendInteractionType.GIFT, 'You already sent this friend a gift today');

    const sender = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.mailboxService.grant(friendId, `Gift from ${sender.username}`, {
      coins: GAME_CONFIG.FRIEND_GIFT_REWARD_COINS,
      xp: GAME_CONFIG.FRIEND_GIFT_REWARD_XP,
    });
    return { sentTo: friendId };
  }

  private async assertFriends(userId: string, friendId: string): Promise<void> {
    const relationship = await this.findRelationship(userId, friendId);
    if (!relationship || relationship.status !== FriendshipStatus.ACCEPTED) {
      throw new ForbiddenException('You are not friends with this player');
    }
  }

  private async findRelationship(userId: string, otherUserId: string) {
    return this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: userId },
        ],
      },
    });
  }

  private async getPendingIncoming(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.addresseeId !== userId) throw new NotFoundException('Friend request not found');
    if (friendship.status !== FriendshipStatus.PENDING) throw new BadRequestException('Request already handled');
    return friendship;
  }

  private async recordInteractionOnce(
    actorId: string,
    targetId: string,
    type: FriendInteractionType,
    conflictMessage: string,
  ): Promise<void> {
    const day = utcMidnight(new Date());
    try {
      await this.prisma.friendInteraction.create({ data: { actorId, targetId, type, day } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException(conflictMessage);
      }
      throw err;
    }
  }
}
