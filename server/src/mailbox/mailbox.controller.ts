import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MailboxService } from './mailbox.service';
import { ClaimMailDto } from './dto/claim-mail.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('mailbox')
@UseGuards(JwtAuthGuard)
export class MailboxController {
  constructor(private readonly mailboxService: MailboxService) {}

  @Get()
  async getMail(@CurrentUser() user: AuthenticatedUser) {
    return this.mailboxService.listMine(user.userId);
  }

  @Post('claim')
  async claim(@CurrentUser() user: AuthenticatedUser, @Body() dto: ClaimMailDto) {
    return this.mailboxService.claim(user.userId, dto.mailItemId);
  }

  @Post('claim-all')
  async claimAll(@CurrentUser() user: AuthenticatedUser) {
    return this.mailboxService.claimAll(user.userId);
  }
}
