import { Module } from '@nestjs/common';
import { CosmeticService } from './cosmetic.service';
import { CosmeticController } from './cosmetic.controller';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [EconomyModule],
  controllers: [CosmeticController],
  providers: [CosmeticService],
  exports: [CosmeticService],
})
export class CosmeticModule {}
