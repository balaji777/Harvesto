import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
    return this.orderService.getActiveTruckOrders(user.userId);
  }

  @Post('truck/fulfill')
  async fulfill(@CurrentUser() user: AuthenticatedUser, @Body() dto: FulfillOrderDto) {
    return this.orderService.fulfill(user.userId, dto.orderId);
  }
}
