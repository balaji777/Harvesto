import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { FarmModule } from './farm/farm.module';
import { InventoryModule } from './inventory/inventory.module';
import { EconomyModule } from './economy/economy.module';
import { CatalogModule } from './catalog/catalog.module';
import { AnimalModule } from './animal/animal.module';
import { BuildingModule } from './building/building.module';
import { OrderModule } from './order/order.module';
import { MailboxModule } from './mailbox/mailbox.module';
import { ProgressionModule } from './progression/progression.module';
import { DailyModule } from './daily/daily.module';
import { FriendModule } from './friend/friend.module';
import { FishingModule } from './fishing/fishing.module';
import { CosmeticModule } from './cosmetic/cosmetic.module';
import { DecorationModule } from './decoration/decoration.module';
import { NeighborhoodModule } from './neighborhood/neighborhood.module';
import { ChatModule } from './chat/chat.module';
import { DerbyModule } from './derby/derby.module';
import { AntiCheatModule } from './anticheat/anticheat.module';
import { RoadsideShopModule } from './roadside-shop/roadside-shop.module';
import { TownModule } from './town/town.module';
import { EventModule } from './events/event.module';
import { IapModule } from './iap/iap.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    FarmModule,
    InventoryModule,
    EconomyModule,
    CatalogModule,
    AnimalModule,
    BuildingModule,
    OrderModule,
    MailboxModule,
    ProgressionModule,
    DailyModule,
    FriendModule,
    FishingModule,
    CosmeticModule,
    DecorationModule,
    NeighborhoodModule,
    ChatModule,
    DerbyModule,
    AntiCheatModule,
    RoadsideShopModule,
    TownModule,
    EventModule,
    IapModule,
    PushModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
