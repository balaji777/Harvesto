import { IsString } from 'class-validator';

export class RequestFriendDto {
  @IsString()
  targetUserId!: string;
}
