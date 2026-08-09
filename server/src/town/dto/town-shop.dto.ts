import { IsString } from 'class-validator';

export class TownShopDto {
  @IsString()
  townShopTypeId!: string;
}
