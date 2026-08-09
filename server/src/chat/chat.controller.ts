import { BadRequestException, Controller, Get, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('neighborhoods/mine/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  /** History-on-load for the client; live messages arrive over ChatGateway. */
  @Get()
  async getHistory(@CurrentUser() user: AuthenticatedUser) {
    const membership = await this.prisma.neighborhoodMember.findUnique({ where: { userId: user.userId } });
    if (!membership) throw new BadRequestException("You're not in a neighborhood");
    return this.chatService.getRecentMessages(membership.neighborhoodId);
  }
}
