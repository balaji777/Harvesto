import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DailyLoginService } from './daily-login.service';
import { DailyMissionService } from './daily-mission.service';
import { ClaimMissionDto } from './dto/claim-mission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('daily')
@UseGuards(JwtAuthGuard)
export class DailyController {
  constructor(
    private readonly dailyLoginService: DailyLoginService,
    private readonly dailyMissionService: DailyMissionService,
  ) {}

  @Get('login-bonus')
  async getLoginBonusStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.dailyLoginService.getStatus(user.userId);
  }

  @Post('login-bonus/claim')
  async claimLoginBonus(@CurrentUser() user: AuthenticatedUser) {
    return this.dailyLoginService.claim(user.userId);
  }

  @Get('missions')
  async getMissions(@CurrentUser() user: AuthenticatedUser) {
    return this.dailyMissionService.getTodayMissions(user.userId);
  }

  @Post('missions/claim')
  async claimMission(@CurrentUser() user: AuthenticatedUser, @Body() dto: ClaimMissionDto) {
    return this.dailyMissionService.claim(user.userId, dto.assignmentId);
  }
}
