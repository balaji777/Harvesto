import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AnimalService } from './animal.service';
import { BuyAnimalDto } from './dto/buy-animal.dto';
import { AnimalIdDto } from './dto/animal-id.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('animals')
@UseGuards(JwtAuthGuard)
export class AnimalController {
  constructor(private readonly animalService: AnimalService) {}

  @Get('types')
  async getAnimalTypes() {
    return this.animalService.listAnimalTypes();
  }

  @Get()
  async getMyAnimals(@CurrentUser() user: AuthenticatedUser) {
    return this.animalService.listMyAnimals(user.userId);
  }

  @Post('buy')
  async buy(@CurrentUser() user: AuthenticatedUser, @Body() dto: BuyAnimalDto) {
    return this.animalService.buy(user.userId, dto.animalTypeId, dto.buildingId);
  }

  @Post('feed')
  async feed(@CurrentUser() user: AuthenticatedUser, @Body() dto: AnimalIdDto) {
    return this.animalService.feed(user.userId, dto.animalId);
  }

  @Post('collect')
  async collect(@CurrentUser() user: AuthenticatedUser, @Body() dto: AnimalIdDto) {
    return this.animalService.collect(user.userId, dto.animalId);
  }
}
