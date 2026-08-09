import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DecorationService } from './decoration.service';
import { BuyDecorationDto } from './dto/buy-decoration.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('decorations')
@UseGuards(JwtAuthGuard)
export class DecorationController {
  constructor(private readonly decorationService: DecorationService) {}

  @Get('types')
  async getTypes() {
    return this.decorationService.listTypes();
  }

  @Get('mine')
  async getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.decorationService.listMine(user.userId);
  }

  @Post('buy')
  async buy(@CurrentUser() user: AuthenticatedUser, @Body() dto: BuyDecorationDto) {
    return this.decorationService.buy(user.userId, dto.decorationTypeId, dto.quantity);
  }

  @Get('farm-value')
  async getFarmValue(@CurrentUser() user: AuthenticatedUser) {
    return this.decorationService.getFarmValue(user.userId);
  }
}
