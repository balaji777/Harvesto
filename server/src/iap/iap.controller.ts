import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IapService } from './iap.service';
import { SubmitReceiptDto } from './dto/submit-receipt.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('iap')
@UseGuards(JwtAuthGuard)
export class IapController {
  constructor(private readonly iapService: IapService) {}

  @Get('products')
  async products() {
    return this.iapService.listProducts();
  }

  @Post('receipts')
  async submitReceipt(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitReceiptDto) {
    return this.iapService.submitReceipt(user.userId, dto.store, dto.productId, dto.receiptToken);
  }
}
