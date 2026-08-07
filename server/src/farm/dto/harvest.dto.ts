import { IsString } from 'class-validator';

export class HarvestDto {
  @IsString()
  tileId!: string;
}
