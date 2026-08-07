import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { SellDto } from './dto/sell.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getInventory(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getInventory(user.userId);
  }

  @Post('sell')
  async sell(@CurrentUser() user: AuthenticatedUser, @Body() dto: SellDto) {
    return this.inventoryService.sell(user.userId, dto.itemTypeId, dto.quantity);
  }
}
