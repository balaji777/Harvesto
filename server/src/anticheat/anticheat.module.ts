import { Module } from '@nestjs/common';
import { AntiCheatService } from './anticheat.service';
import { AntiCheatController } from './anticheat.controller';

@Module({
  controllers: [AntiCheatController],
  providers: [AntiCheatService],
  exports: [AntiCheatService],
})
export class AntiCheatModule {}
