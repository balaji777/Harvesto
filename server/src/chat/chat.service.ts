import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ChatMessageView {
  id: string;
  userId: string;
  username: string;
  message: string;
  createdAt: Date;
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async saveMessage(neighborhoodId: string, userId: string, message: string) {
    return this.prisma.chatMessage.create({ data: { neighborhoodId, userId, message } });
  }

  async getRecentMessages(neighborhoodId: string, limit = 50): Promise<ChatMessageView[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { neighborhoodId },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages
      .reverse()
      .map((m) => ({ id: m.id, userId: m.userId, username: m.user.username, message: m.message, createdAt: m.createdAt }));
  }
}
