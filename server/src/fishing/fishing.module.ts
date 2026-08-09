import { Module } from '@nestjs/common';
import { FishingService } from './fishing.service';
import { FishingController } from './fishing.controller';
import { EconomyModule } from '../economy/economy.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProgressionModule } from '../progression/progression.module';

@Module({
  imports: [EconomyModule, InventoryModule, ProgressionModule],
  controllers: [FishingController],
  providers: [FishingService],
  exports: [FishingService],
})
export class FishingModule {}
