import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AuthProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { FarmService } from '../farm/farm.service';
import { GAME_CONFIG } from '../common/constants/game-config';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly farmService: FarmService,
  ) {}

  async loginAsGuest(deviceId: string) {
    let user = await this.prisma.user.findUnique({
      where: { authProvider_providerId: { authProvider: AuthProvider.GUEST, providerId: deviceId } },
    });

    if (!user) {
      user = await this.provisionNewUser({
        authProvider: AuthProvider.GUEST,
        providerId: deviceId,
        username: `Farmer${Math.floor(Math.random() * 1_000_000)}`,
      });
    } else {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    }

    return { user, tokens: await this.issueTokenPair(user.id) };
  }

  async register(email: string, password: string, username: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.provisionNewUser({
      authProvider: AuthProvider.EMAIL,
      email,
      passwordHash,
      username,
    });

    return { user, tokens: await this.issueTokenPair(user.id) };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { user, tokens: await this.issueTokenPair(user.id) };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwt.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (await this.redis.isRefreshTokenBlocklisted(payload.jti)) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Rotate: the presented token is single-use.
    await this.blocklistToken(payload.jti);
    return this.issueTokenPair(payload.sub);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwt.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      await this.blocklistToken(payload.jti);
    } catch {
      // Already invalid/expired — logout is idempotent from the caller's perspective.
    }
  }

  private async blocklistToken(jti: string) {
    const ttlSeconds = this.parseExpiryToSeconds(this.config.get<string>('JWT_REFRESH_EXPIRES_IN')!);
    await this.redis.blocklistRefreshToken(jti, ttlSeconds);
  }

  private async provisionNewUser(input: {
    authProvider: AuthProvider;
    providerId?: string;
    email?: string;
    passwordHash?: string;
    username: string;
  }) {
    const user = await this.prisma.user.create({
      data: {
        authProvider: input.authProvider,
        providerId: input.providerId,
        email: input.email,
        passwordHash: input.passwordHash,
        username: input.username,
        profile: {
          create: {
            coins: GAME_CONFIG.STARTING_COINS,
            diamonds: GAME_CONFIG.STARTING_DIAMONDS,
          },
        },
      },
    });

    await this.farmService.createFarmForUser(user.id);
    return user;
  }

  private async issueTokenPair(userId: string): Promise<TokenPair> {
    const accessToken = this.jwt.sign(
      { sub: userId, type: 'access' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    const refreshToken = this.jwt.sign(
      { sub: userId, jti: randomUUID(), type: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    return { accessToken, refreshToken };
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiry);
    if (!match) return 60 * 60 * 24 * 30; // fallback: 30 days
    const value = Number(match[1]);
    const unit = match[2];
    const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit]!;
    return value * multiplier;
  }
}
