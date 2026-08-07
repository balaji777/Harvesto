import { Controller, Get, UseGuards } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Get()
  async getDefinitions() {
    return this.achievementService.listDefinitions();
  }

  @Get('mine')
  async getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.achievementService.listMine(user.userId);
  }
}
