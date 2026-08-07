import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GuestLoginDto } from './dto/guest-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('guest')
  @HttpCode(HttpStatus.OK)
  async guest(@Body() dto: GuestLoginDto) {
    const { user, tokens } = await this.authService.loginAsGuest(dto.deviceId);
    return { userId: user.id, username: user.username, ...tokens };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const { user, tokens } = await this.authService.register(dto.email, dto.password, dto.username);
    return { userId: user.id, username: user.username, ...tokens };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const { user, tokens } = await this.authService.login(dto.email, dto.password);
    return { userId: user.id, username: user.username, ...tokens };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.playerProfile.findUniqueOrThrow({ where: { userId: user.userId } });
    const account = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    return {
      userId: account.id,
      username: account.username,
      email: account.email,
      level: profile.level,
      xp: profile.xp,
      coins: profile.coins,
      diamonds: profile.diamonds,
      farmName: profile.farmName,
    };
  }
}
