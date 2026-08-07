import { IsString } from 'class-validator';

export class BuyAnimalDto {
  @IsString()
  animalTypeId!: string;

  @IsString()
  buildingId!: string;
}
