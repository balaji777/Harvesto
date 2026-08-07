import { Module } from '@nestjs/common';
import { PlayerStatsService } from './player-stats.service';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';
import { MailboxModule } from '../mailbox/mailbox.module';

@Module({
  imports: [MailboxModule],
  controllers: [AchievementController],
  providers: [PlayerStatsService, AchievementService],
  exports: [PlayerStatsService, AchievementService],
})
export class ProgressionModule {}
