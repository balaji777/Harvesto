import { IsEnum, IsString } from 'class-validator';
import { PushPlatform } from '@prisma/client';

export class RegisterTokenDto {
  @IsString()
  token!: string;

  @IsEnum(PushPlatform)
  platform!: PushPlatform;
}
