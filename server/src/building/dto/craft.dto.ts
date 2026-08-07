import { IsString } from 'class-validator';

export class CraftDto {
  @IsString()
  buildingId!: string;

  @IsString()
  recipeId!: string;
}
