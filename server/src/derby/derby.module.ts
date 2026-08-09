import { Module } from '@nestjs/common';
import { DerbyService } from './derby.service';
import { DerbyController } from './derby.controller';

@Module({
  controllers: [DerbyController],
  providers: [DerbyService],
  exports: [DerbyService],
})
export class DerbyModule {}
