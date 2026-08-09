import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { NeighborhoodService } from './neighborhood.service';
import { CreateNeighborhoodDto } from './dto/create-neighborhood.dto';
import { JoinNeighborhoodDto } from './dto/join-neighborhood.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('neighborhoods')
@UseGuards(JwtAuthGuard)
export class NeighborhoodController {
  constructor(private readonly neighborhoodService: NeighborhoodService) {}

  @Get()
  async listAll() {
    return this.neighborhoodService.listAll();
  }

  @Get('mine')
  async getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.neighborhoodService.getMine(user.userId);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNeighborhoodDto) {
    return this.neighborhoodService.create(user.userId, dto.name);
  }

  @Post('join')
  async join(@CurrentUser() user: AuthenticatedUser, @Body() dto: JoinNeighborhoodDto) {
    await this.neighborhoodService.join(user.userId, dto.neighborhoodId);
    return { success: true };
  }

  @Post('leave')
  async leave(@CurrentUser() user: AuthenticatedUser) {
    await this.neighborhoodService.leave(user.userId);
    return { success: true };
  }
}
