import { Module } from '@nestjs/common';
import { RoadsideShopService } from './roadside-shop.service';
import { RoadsideShopController } from './roadside-shop.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { EconomyModule } from '../economy/economy.module';
import { CatalogModule } from '../catalog/catalog.module';
import { MailboxModule } from '../mailbox/mailbox.module';

@Module({
  imports: [InventoryModule, EconomyModule, CatalogModule, MailboxModule],
  controllers: [RoadsideShopController],
  providers: [RoadsideShopService],
})
export class RoadsideShopModule {}
