import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FarmService } from './farm.service';
import { PlantDto } from './dto/plant.dto';
import { HarvestDto } from './dto/harvest.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('farm')
@UseGuards(JwtAuthGuard)
export class FarmController {
  constructor(private readonly farmService: FarmService) {}

  @Get()
  async getFarm(@CurrentUser() user: AuthenticatedUser) {
    return this.farmService.getFarmState(user.userId);
  }

  @Get('crop-types')
  async getCropTypes() {
    return this.farmService.listCropTypes();
  }

  @Post('plant')
  async plant(@CurrentUser() user: AuthenticatedUser, @Body() dto: PlantDto) {
    return this.farmService.plant(user.userId, dto.x, dto.y, dto.cropTypeId);
  }

  @Post('harvest')
  async harvest(@CurrentUser() user: AuthenticatedUser, @Body() dto: HarvestDto) {
    return this.farmService.harvest(user.userId, dto.tileId);
  }
}
