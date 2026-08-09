import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FriendService } from './friend.service';
import { RequestFriendDto } from './dto/request-friend.dto';
import { FriendshipIdDto } from './dto/friendship-id.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get()
  async listFriends(@CurrentUser() user: AuthenticatedUser) {
    return this.friendService.listFriends(user.userId);
  }

  @Get('requests')
  async listRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.friendService.listIncomingRequests(user.userId);
  }

  @Post('request')
  async request(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestFriendDto) {
    return this.friendService.sendRequest(user.userId, dto.targetUserId);
  }

  @Post('accept')
  async accept(@CurrentUser() user: AuthenticatedUser, @Body() dto: FriendshipIdDto) {
    return this.friendService.accept(user.userId, dto.friendshipId);
  }

  @Post('decline')
  async decline(@CurrentUser() user: AuthenticatedUser, @Body() dto: FriendshipIdDto) {
    await this.friendService.decline(user.userId, dto.friendshipId);
    return { success: true };
  }

  @Post('remove')
  async remove(@CurrentUser() user: AuthenticatedUser, @Body() dto: FriendshipIdDto) {
    await this.friendService.remove(user.userId, dto.friendshipId);
    return { success: true };
  }

  @Get(':friendId/farm')
  async viewFarm(@CurrentUser() user: AuthenticatedUser, @Param('friendId') friendId: string) {
    return this.friendService.viewFriendFarm(user.userId, friendId);
  }

  @Post(':friendId/help')
  async help(@CurrentUser() user: AuthenticatedUser, @Param('friendId') friendId: string) {
    return this.friendService.help(user.userId, friendId);
  }

  @Post(':friendId/gift')
  async gift(@CurrentUser() user: AuthenticatedUser, @Param('friendId') friendId: string) {
    return this.friendService.gift(user.userId, friendId);
  }
}
