import { IsString } from 'class-validator';

export class ClaimMailDto {
  @IsString()
  mailItemId!: string;
}
