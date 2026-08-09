import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TownService } from './town.service';
import { TownShopDto } from './dto/town-shop.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('town')
@UseGuards(JwtAuthGuard)
export class TownController {
  constructor(private readonly townService: TownService) {}

  @Get('shop-types')
  async shopTypes() {
    return this.townService.listShopTypes();
  }

  @Get('mine')
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return this.townService.listMine(user.userId);
  }

  @Post('staff')
  async startStaffing(@CurrentUser() user: AuthenticatedUser, @Body() dto: TownShopDto) {
    return this.townService.startStaffing(user.userId, dto.townShopTypeId);
  }

  @Post('collect-staff')
  async collectStaffing(@CurrentUser() user: AuthenticatedUser, @Body() dto: TownShopDto) {
    return this.townService.collectStaffing(user.userId, dto.townShopTypeId);
  }
}
