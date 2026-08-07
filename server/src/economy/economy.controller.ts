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
}
