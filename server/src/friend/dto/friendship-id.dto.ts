import { IsString } from 'class-validator';

export class FriendshipIdDto {
  @IsString()
  friendshipId!: string;
}
