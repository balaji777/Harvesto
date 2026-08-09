import { Module } from '@nestjs/common';
import { PlayerStatsService } from './player-stats.service';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';
import { MailboxModule } from '../mailbox/mailbox.module';
import { DerbyModule } from '../derby/derby.module';

@Module({
  imports: [MailboxModule, DerbyModule],
  controllers: [AchievementController],
  providers: [PlayerStatsService, AchievementService],
  exports: [PlayerStatsService, AchievementService],
})
export class ProgressionModule {}
