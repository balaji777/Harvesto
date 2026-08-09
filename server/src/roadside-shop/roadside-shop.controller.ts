import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RoadsideShopService } from './roadside-shop.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { BuyListingDto } from './dto/buy-listing.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('roadside-shop')
@UseGuards(JwtAuthGuard)
export class RoadsideShopController {
  constructor(private readonly roadsideShopService: RoadsideShopService) {}

  @Get('mine')
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return this.roadsideShopService.listMine(user.userId);
  }

  @Get(':userId')
  async browse(@Param('userId') userId: string) {
    return this.roadsideShopService.browse(userId);
  }

  @Post('listings')
  async createListing(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateListingDto) {
    return this.roadsideShopService.createListing(user.userId, dto.itemTypeId, dto.quantity, dto.priceCoins);
  }

  @Delete('listings/:id')
  async cancelListing(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.roadsideShopService.cancelListing(user.userId, id);
    return { ok: true };
  }

  @Post('buy')
  async buy(@CurrentUser() user: AuthenticatedUser, @Body() dto: BuyListingDto) {
    return this.roadsideShopService.buy(user.userId, dto.listingId, dto.quantity);
  }
}
