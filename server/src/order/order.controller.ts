import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OrderSource } from '@prisma/client';
import { OrderService } from './order.service';
import { FulfillOrderDto } from './dto/fulfill-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('truck')
  async getTruckOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.orderService.getActiveOrders(user.userId, OrderSource.TRUCK);
  }

  @Post('truck/fulfill')
  async fulfillTruck(@CurrentUser() user: AuthenticatedUser, @Body() dto: FulfillOrderDto) {
    return this.orderService.fulfill(user.userId, dto.orderId);
  }

  @Get('boat')
  async getBoatOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.orderService.getActiveOrders(user.userId, OrderSource.BOAT);
  }

  @Post('boat/fulfill')
  async fulfillBoat(@CurrentUser() user: AuthenticatedUser, @Body() dto: FulfillOrderDto) {
    return this.orderService.fulfill(user.userId, dto.orderId);
  }

  @Get('train')
  async getTrainOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.orderService.getActiveOrders(user.userId, OrderSource.TRAIN);
  }

  @Post('train/fulfill')
  async fulfillTrain(@CurrentUser() user: AuthenticatedUser, @Body() dto: FulfillOrderDto) {
    return this.orderService.fulfill(user.userId, dto.orderId);
  }
}
