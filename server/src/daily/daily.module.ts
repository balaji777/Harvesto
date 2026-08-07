import { Module } from '@nestjs/common';
import { DailyLoginService } from './daily-login.service';
import { DailyMissionService } from './daily-mission.service';
import { DailyController } from './daily.controller';
import { MailboxModule } from '../mailbox/mailbox.module';
import { ProgressionModule } from '../progression/progression.module';

@Module({
  imports: [MailboxModule, ProgressionModule],
  controllers: [DailyController],
  providers: [DailyLoginService, DailyMissionService],
  exports: [DailyLoginService, DailyMissionService],
})
export class DailyModule {}
