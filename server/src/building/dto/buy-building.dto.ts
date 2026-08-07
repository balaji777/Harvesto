import { IsString } from 'class-validator';

export class BuyBuildingDto {
  @IsString()
  buildingTypeId!: string;
}
