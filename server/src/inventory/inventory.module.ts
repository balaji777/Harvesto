import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { EconomyModule } from '../economy/economy.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [EconomyModule, CatalogModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
