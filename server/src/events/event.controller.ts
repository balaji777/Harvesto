import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { EventService } from './event.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get('active')
  async active() {
    return this.eventService.getActive();
  }

  @Get('mine')
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return this.eventService.getMyProgress(user.userId);
  }

  @Post('claim')
  async claim(@CurrentUser() user: AuthenticatedUser) {
    return this.eventService.claimNextTier(user.userId);
  }
}
