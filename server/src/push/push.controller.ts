import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { PushService } from './push.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { TestSendDto } from './dto/test-send.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('register')
  async register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterTokenDto) {
    return this.pushService.registerToken(user.userId, dto.token, dto.platform);
  }

  @Delete('register')
  async unregister(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterTokenDto) {
    await this.pushService.unregisterToken(user.userId, dto.token);
    return { ok: true };
  }

  // Sandbox-only: proves the token-storage/fan-out path works without real FCM creds.
  @Post('test-send')
  async testSend(@CurrentUser() user: AuthenticatedUser, @Body() dto: TestSendDto) {
    return this.pushService.send(user.userId, dto.title, dto.body);
  }
}
