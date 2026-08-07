import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  public readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.get<string>('REDIS_URL')!);
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }

  /** Revokes a refresh token's jti until its natural expiry. */
  async blocklistRefreshToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`refresh:blocklist:${jti}`, '1', 'EX', ttlSeconds);
  }

  async isRefreshTokenBlocklisted(jti: string): Promise<boolean> {
    const result = await this.client.get(`refresh:blocklist:${jti}`);
    return result !== null;
  }
}
