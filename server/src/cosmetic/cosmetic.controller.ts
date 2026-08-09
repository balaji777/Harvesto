import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CosmeticService } from './cosmetic.service';
import { CosmeticIdDto } from './dto/cosmetic-id.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('cosmetics')
@UseGuards(JwtAuthGuard)
export class CosmeticController {
  constructor(private readonly cosmeticService: CosmeticService) {}

  @Get('types')
  async getTypes() {
    return this.cosmeticService.listTypes();
  }

  @Get('mine')
  async getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.cosmeticService.listMine(user.userId);
  }

  @Post('buy')
  async buy(@CurrentUser() user: AuthenticatedUser, @Body() dto: CosmeticIdDto) {
    return this.cosmeticService.buy(user.userId, dto.cosmeticTypeId);
  }

  @Post('equip')
  async equip(@CurrentUser() user: AuthenticatedUser, @Body() dto: CosmeticIdDto) {
    return this.cosmeticService.equip(user.userId, dto.cosmeticTypeId);
  }
}
