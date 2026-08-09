import { Injectable, Logger } from '@nestjs/common';
import { PushPlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Push (GAME_DESIGN.md §6.17) — sandbox-mode scaffolding. No FCM_SERVER_KEY
 * in this environment, so send() logs what *would* be dispatched instead of
 * calling Firebase — see server/README.md for what flips this to real
 * delivery. Token registration/storage is real and production-ready as-is.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerToken(userId: string, token: string, platform: PushPlatform) {
    return this.prisma.pushToken.upsert({
      where: { userId_token: { userId, token } },
      update: { platform },
      create: { userId, token, platform },
    });
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
  }

  async send(userId: string, title: string, body: string): Promise<{ wouldNotify: number }> {
    const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
    this.logger.log(`[sandbox push] -> ${tokens.length} device(s) of ${userId}: "${title}" — ${body}`);
    return { wouldNotify: tokens.length };
  }
}
