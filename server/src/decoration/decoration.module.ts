import { Module } from '@nestjs/common';
import { DecorationService } from './decoration.service';
import { DecorationController } from './decoration.controller';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [EconomyModule],
  controllers: [DecorationController],
  providers: [DecorationService],
  exports: [DecorationService],
})
export class DecorationModule {}
