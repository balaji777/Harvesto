import { Module } from '@nestjs/common';
import { BuildingService } from './building.service';
import { BuildingController } from './building.controller';
import { EconomyModule } from '../economy/economy.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ProgressionModule } from '../progression/progression.module';
import { TownModule } from '../town/town.module';

@Module({
  imports: [EconomyModule, InventoryModule, CatalogModule, ProgressionModule, TownModule],
  controllers: [BuildingController],
  providers: [BuildingService],
  exports: [BuildingService],
})
export class BuildingModule {}
