import { Module } from '@nestjs/common';
import { FriendService } from './friend.service';
import { FriendController } from './friend.controller';
import { EconomyModule } from '../economy/economy.module';
import { MailboxModule } from '../mailbox/mailbox.module';
import { FarmModule } from '../farm/farm.module';

@Module({
  imports: [EconomyModule, MailboxModule, FarmModule],
  controllers: [FriendController],
  providers: [FriendService],
  exports: [FriendService],
})
export class FriendModule {}
