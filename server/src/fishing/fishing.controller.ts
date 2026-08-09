import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FishingService } from './fishing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('fishing')
@UseGuards(JwtAuthGuard)
export class FishingController {
  constructor(private readonly fishingService: FishingService) {}

  @Get('types')
  async getFishTypes() {
    return this.fishingService.listFishTypes();
  }

  @Get('status')
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.fishingService.getStatus(user.userId);
  }

  @Post('cast')
  async cast(@CurrentUser() user: AuthenticatedUser) {
    return this.fishingService.cast(user.userId);
  }

  @Post('collect')
  async collect(@CurrentUser() user: AuthenticatedUser) {
    return this.fishingService.collect(user.userId);
  }
}
