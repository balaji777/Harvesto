import { BadRequestException, Controller, Get, UseGuards } from '@nestjs/common';
import { DerbyService } from './derby.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('derby')
@UseGuards(JwtAuthGuard)
export class DerbyController {
  constructor(private readonly derbyService: DerbyService) {}

  @Get('leaderboard')
  async getLeaderboard(@CurrentUser() user: AuthenticatedUser) {
    const leaderboard = await this.derbyService.getLeaderboard(user.userId);
    if (!leaderboard) throw new BadRequestException("You're not in a neighborhood");
    return leaderboard;
  }
}
