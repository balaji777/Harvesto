import { IsString } from 'class-validator';

export class ClearTileDto {
  @IsString()
  tileId!: string;
}
