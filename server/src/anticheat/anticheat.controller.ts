import { Controller, Get, UseGuards } from '@nestjs/common';
import { AntiCheatService } from './anticheat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('anticheat')
@UseGuards(JwtAuthGuard)
export class AntiCheatController {
  constructor(private readonly antiCheatService: AntiCheatService) {}

  // Self-serve only — no admin role/console exists yet (see server/README.md).
  @Get('flags')
  async myFlags(@CurrentUser() user: AuthenticatedUser) {
    return this.antiCheatService.listMyFlags(user.userId);
  }
}
