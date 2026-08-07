import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { BuildingService } from './building.service';
import { BuyBuildingDto } from './dto/buy-building.dto';
import { CraftDto } from './dto/craft.dto';
import { CollectQueueEntryDto } from './dto/collect-queue-entry.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('buildings')
@UseGuards(JwtAuthGuard)
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Get('types')
  async getBuildingTypes() {
    return this.buildingService.listBuildingTypes();
  }

  @Get('recipes')
  async getRecipes(@Query('buildingTypeId') buildingTypeId?: string) {
    return this.buildingService.listRecipes(buildingTypeId);
  }

  @Get()
  async getMyBuildings(@CurrentUser() user: AuthenticatedUser) {
    return this.buildingService.listMyBuildings(user.userId);
  }

  @Post('buy')
  async buy(@CurrentUser() user: AuthenticatedUser, @Body() dto: BuyBuildingDto) {
    return this.buildingService.buy(user.userId, dto.buildingTypeId);
  }

  @Post('craft')
  async craft(@CurrentUser() user: AuthenticatedUser, @Body() dto: CraftDto) {
    return this.buildingService.craft(user.userId, dto.buildingId, dto.recipeId);
  }

  @Post('collect')
  async collect(@CurrentUser() user: AuthenticatedUser, @Body() dto: CollectQueueEntryDto) {
    return this.buildingService.collect(user.userId, dto.queueEntryId);
  }
}
