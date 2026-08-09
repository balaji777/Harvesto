import { Controller, Get, UseGuards } from '@nestjs/common';
import { EconomyService } from './economy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('economy')
@UseGuards(JwtAuthGuard)
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  @Get('wallet')
  async getWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.economyService.getWallet(user.userId);
  }

  @Get('analytics/me')
  async myAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.economyService.getSinkSourceReport(user.userId);
  }

  // No admin-role gate exists yet (see server/README.md) — fine at dev scale.
  @Get('analytics/global')
  async globalAnalytics() {
    return this.economyService.getSinkSourceReport();
  }
}
